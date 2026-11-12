-- ════════════════════════════════════════════════════════════════
-- NEXORA · 0005 · NEXORA AI, equipo y consultas analíticas por período
-- ════════════════════════════════════════════════════════════════

-- ── NEXORA AI: conversaciones ────────────────────────────────────
-- Cada conversación es privada de quien la creó, dentro de su comercio.
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id)
);
create index ai_conversations_owner_idx
  on public.ai_conversations (org_id, user_id, updated_at desc);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  conversation_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 20000),
  created_at timestamptz not null default now(),
  foreign key (org_id, conversation_id)
    references public.ai_conversations (org_id, id) on delete cascade
);
create index ai_messages_conversation_idx
  on public.ai_messages (conversation_id, created_at);

-- Consumo de consultas de IA por comercio y período (mes; día en la demo).
create table public.ai_usage (
  org_id uuid not null references public.organizations (id) on delete cascade,
  period date not null,
  used integer not null default 0 check (used >= 0),
  primary key (org_id, period)
);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage enable row level security;

create policy ai_conversations_select on public.ai_conversations
  for select to authenticated
  using (user_id = (select auth.uid()) and private.is_member(org_id));
create policy ai_conversations_insert on public.ai_conversations
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_write(org_id));
create policy ai_conversations_update on public.ai_conversations
  for update to authenticated
  using (user_id = (select auth.uid()) and private.can_write(org_id))
  with check (user_id = (select auth.uid()) and private.can_write(org_id));
create policy ai_conversations_delete on public.ai_conversations
  for delete to authenticated
  using (user_id = (select auth.uid()) and private.can_write(org_id));

create policy ai_messages_select on public.ai_messages
  for select to authenticated
  using (exists (
    select 1 from public.ai_conversations c
     where c.id = conversation_id and c.user_id = (select auth.uid())
       and private.is_member(c.org_id)));
create policy ai_messages_insert on public.ai_messages
  for insert to authenticated
  with check (exists (
    select 1 from public.ai_conversations c
     where c.id = conversation_id and c.org_id = ai_messages.org_id
       and c.user_id = (select auth.uid()) and private.can_write(c.org_id)));
revoke update, delete on public.ai_messages from authenticated;

create policy ai_usage_select on public.ai_usage
  for select to authenticated using (private.is_member(org_id));
revoke insert, update, delete on public.ai_usage from authenticated;

-- Límite de consultas de IA según el plan. Mantener alineado con src/lib/plans.ts.
create or replace function private.ai_limit(p_plan public.plan_tier, p_is_demo boolean)
returns integer language sql immutable set search_path = '' as $$
  select case
    when p_is_demo then 60            -- por día, compartido entre visitantes
    when p_plan = 'business' then 2000
    when p_plan = 'pro' then 300
    else 20                           -- plan Inicial: consultas de prueba por mes
  end;
$$;

-- Reserva una consulta de IA de forma atómica. Devuelve cuántas quedan,
-- o -1 si el cupo del período está agotado (y no consume nada).
create or replace function public.ai_consume(p_org uuid)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_org record;
  v_today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_period date;
  v_limit integer;
  v_used integer;
begin
  if not private.is_member(p_org) then
    raise exception 'Sin acceso al comercio' using errcode = '42501';
  end if;
  select plan, is_demo into v_org from public.organizations where id = p_org;
  v_period := case when v_org.is_demo then v_today else date_trunc('month', v_today)::date end;
  v_limit := private.ai_limit(v_org.plan, v_org.is_demo);

  insert into public.ai_usage (org_id, period, used) values (p_org, v_period, 0)
  on conflict (org_id, period) do nothing;

  update public.ai_usage
     set used = used + 1
   where org_id = p_org and period = v_period and used < v_limit
  returning used into v_used;

  if not found then
    return -1;
  end if;
  return v_limit - v_used;
end $$;

create or replace function public.ai_quota(p_org uuid)
returns table (used integer, quota integer, per_day boolean)
language sql stable security definer set search_path = '' as $$
  select coalesce((
           select u.used from public.ai_usage u
            where u.org_id = o.id
              and u.period = case
                when o.is_demo then (now() at time zone 'America/Argentina/Buenos_Aires')::date
                else date_trunc('month', (now() at time zone 'America/Argentina/Buenos_Aires'))::date
              end), 0),
         private.ai_limit(o.plan, o.is_demo),
         o.is_demo
    from public.organizations o
   where o.id = p_org and private.is_member(o.id);
$$;

-- ── Equipo: invitaciones ─────────────────────────────────────────
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) between 5 and 254),
  role public.member_role not null default 'employee' check (role in ('admin', 'employee')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);
create index invitations_email_idx on public.invitations (email);

alter table public.invitations enable row level security;
create policy invitations_select on public.invitations
  for select to authenticated using (private.is_admin(org_id));
create policy invitations_delete on public.invitations
  for delete to authenticated using (private.is_admin(org_id));
-- Las altas pasan por invite_member(), que valida el cupo del plan.
revoke insert, update on public.invitations from authenticated;

-- Usuarios permitidos por plan. Mantener alineado con src/lib/plans.ts.
create or replace function private.user_limit(p_plan public.plan_tier)
returns integer language sql immutable set search_path = '' as $$
  select case p_plan when 'business' then 10 when 'pro' then 3 else 1 end;
$$;

create or replace function public.invite_member(p_org uuid, p_email text, p_role text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_email));
  v_plan public.plan_tier;
  v_seats integer;
  v_id uuid;
begin
  if not private.is_admin(p_org) then
    raise exception 'Solo un administrador puede invitar personas' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'employee') then
    raise exception 'Rol inválido';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'El email no es válido';
  end if;

  -- Serializa las invitaciones del comercio para que el cupo sea exacto.
  select plan into v_plan from public.organizations where id = p_org for update;

  if exists (
    select 1 from public.memberships m join auth.users u on u.id = m.user_id
     where m.org_id = p_org and lower(u.email) = v_email
  ) then
    raise exception 'Esa persona ya forma parte del equipo';
  end if;
  if exists (select 1 from public.invitations where org_id = p_org and email = v_email) then
    raise exception 'Ya hay una invitación pendiente para ese email';
  end if;

  v_seats := (select count(*) from public.memberships where org_id = p_org)
           + (select count(*) from public.invitations where org_id = p_org);
  if v_seats >= private.user_limit(v_plan) then
    raise exception 'Tu plan permite hasta % usuarios. Pasá a un plan mayor para sumar más.',
      private.user_limit(v_plan);
  end if;

  insert into public.invitations (org_id, email, role, invited_by)
  values (p_org, v_email, p_role::public.member_role, (select auth.uid()))
  returning id into v_id;
  return v_id;
end $$;

-- Convierte en membresías las invitaciones pendientes del usuario actual.
-- Exige email confirmado: nadie se suma a un comercio con un email ajeno.
create or replace function public.accept_invitations()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_email text;
  v_count integer := 0;
  v_inv record;
begin
  if v_user is null then
    return 0;
  end if;
  select lower(email) into v_email
    from auth.users where id = v_user and email_confirmed_at is not null;
  if v_email is null then
    return 0;
  end if;

  for v_inv in
    select id, org_id, role from public.invitations where email = v_email order by created_at
  loop
    insert into public.memberships (org_id, user_id, role)
    values (v_inv.org_id, v_user, v_inv.role)
    on conflict (org_id, user_id) do nothing;
    delete from public.invitations where id = v_inv.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- Integrantes del comercio con su email (auth.users no es accesible por RLS).
create or replace function public.team_members(p_org uuid)
returns table (user_id uuid, full_name text, email text, role public.member_role, joined_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.user_id, p.full_name, u.email::text, m.role, m.created_at
    from public.memberships m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
   where m.org_id = p_org and private.is_member(p_org)
   order by m.created_at;
$$;

-- Nunca dejar un comercio sin administrador.
create or replace function private.keep_one_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'admin'
     and (tg_op = 'DELETE' or new.role <> 'admin')
     and exists (select 1 from public.organizations where id = old.org_id)
     and not exists (
       select 1 from public.memberships
        where org_id = old.org_id and role = 'admin' and user_id <> old.user_id)
  then
    raise exception 'El comercio debe conservar al menos un administrador';
  end if;
  return coalesce(new, old);
end $$;

create trigger memberships_keep_one_admin
  before update or delete on public.memberships
  for each row execute function private.keep_one_admin();

-- ── Consultas analíticas por período (SECURITY INVOKER: aplican RLS) ──
create or replace function public.sales_by_payment(p_org uuid, p_from date, p_to date)
returns table (payment_method text, revenue numeric, sales_count integer)
language sql stable security invoker set search_path = '' as $$
  select s.payment_method::text, sum(s.total), count(*)::integer
    from public.sales s
   where s.org_id = p_org and s.status = 'completed'
     and s.created_at >= (p_from::timestamp at time zone 'America/Argentina/Buenos_Aires')
     and s.created_at < ((p_to + 1)::timestamp at time zone 'America/Argentina/Buenos_Aires')
   group by 1
   order by 2 desc;
$$;

create or replace function public.sales_by_hour(p_org uuid, p_from date, p_to date)
returns table (hour integer, revenue numeric, sales_count integer)
language sql stable security invoker set search_path = '' as $$
  select extract(hour from s.created_at at time zone 'America/Argentina/Buenos_Aires')::integer,
         sum(s.total), count(*)::integer
    from public.sales s
   where s.org_id = p_org and s.status = 'completed'
     and s.created_at >= (p_from::timestamp at time zone 'America/Argentina/Buenos_Aires')
     and s.created_at < ((p_to + 1)::timestamp at time zone 'America/Argentina/Buenos_Aires')
   group by 1
   order by 1;
$$;

-- Rendimiento por producto en un período arbitrario (incluye archivados
-- que hayan tenido ventas, para que los totales cierren con sales_daily
-- antes de descuentos).
create or replace function public.product_performance(p_org uuid, p_from date, p_to date)
returns table (
  id uuid, name text, sku text, category text,
  units integer, revenue numeric, profit numeric,
  stock integer, min_stock integer, cost_price numeric, sale_price numeric, is_active boolean
)
language sql stable security invoker set search_path = '' as $$
  with w as (
    select si.product_id,
           sum(si.quantity)::integer as units,
           sum(si.line_total) as revenue,
           sum(si.line_total - si.quantity * si.unit_cost) as profit
      from public.sale_items si
      join public.sales s on s.id = si.sale_id
     where si.org_id = p_org and s.status = 'completed'
       and s.created_at >= (p_from::timestamp at time zone 'America/Argentina/Buenos_Aires')
       and s.created_at < ((p_to + 1)::timestamp at time zone 'America/Argentina/Buenos_Aires')
     group by si.product_id
  )
  select p.id, p.name, p.sku, c.name,
         coalesce(w.units, 0), coalesce(w.revenue, 0), coalesce(w.profit, 0),
         p.stock, p.min_stock, p.cost_price, p.sale_price, p.is_active
    from public.products p
    left join public.categories c on c.id = p.category_id
    left join w on w.product_id = p.id
   where p.org_id = p_org and (p.is_active or w.product_id is not null)
   order by coalesce(w.revenue, 0) desc, p.name;
$$;

-- ── Permisos de ejecución ────────────────────────────────────────
revoke all on function public.ai_consume(uuid) from public, anon;
revoke all on function public.ai_quota(uuid) from public, anon;
revoke all on function public.invite_member(uuid, text, text) from public, anon;
revoke all on function public.accept_invitations() from public, anon;
revoke all on function public.team_members(uuid) from public, anon;
revoke all on function public.sales_by_payment(uuid, date, date) from public, anon;
revoke all on function public.sales_by_hour(uuid, date, date) from public, anon;
revoke all on function public.product_performance(uuid, date, date) from public, anon;

grant execute on function public.ai_consume(uuid) to authenticated;
grant execute on function public.ai_quota(uuid) to authenticated;
grant execute on function public.invite_member(uuid, text, text) to authenticated;
grant execute on function public.accept_invitations() to authenticated;
grant execute on function public.team_members(uuid) to authenticated;
grant execute on function public.sales_by_payment(uuid, date, date) to authenticated;
grant execute on function public.sales_by_hour(uuid, date, date) to authenticated;
grant execute on function public.product_performance(uuid, date, date) to authenticated;

revoke all on all tables in schema public from anon;
