-- ════════════════════════════════════════════════════════════════
-- NEXORA · 0002 · Row Level Security
-- Regla general: leer = ser miembro del comercio; escribir = rol
-- admin o employee; acciones sensibles = admin. El rol 'demo' es de
-- solo lectura. Ventas, ítems y movimientos NO tienen políticas de
-- escritura: solo se modifican con las funciones de 0003.
-- ════════════════════════════════════════════════════════════════

grant usage on schema private to authenticated;

create or replace function private.is_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.can_write(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid())
      and m.role in ('admin', 'employee')
  );
$$;

create or replace function private.is_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid()) and m.role = 'admin'
  );
$$;

create or replace function private.shares_org(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.org_id = mine.org_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user
  );
$$;

revoke all on function private.is_member(uuid) from public;
revoke all on function private.can_write(uuid) from public;
revoke all on function private.is_admin(uuid) from public;
revoke all on function private.shares_org(uuid) from public;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.can_write(uuid) to authenticated;
grant execute on function private.is_admin(uuid) to authenticated;
grant execute on function private.shares_org(uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.expenses enable row level security;

-- El rol anónimo no accede a ninguna tabla de negocio.
revoke all on all tables in schema public from anon;

-- ── organizations ────────────────────────────────────────────────
create policy org_select on public.organizations
  for select to authenticated using (private.is_member(id));
create policy org_update on public.organizations
  for update to authenticated
  using (private.is_admin(id)) with check (private.is_admin(id));
-- Columnas que un admin puede tocar a mano: solo el nombre y el rubro.
revoke update on public.organizations from authenticated;
grant update (name, business_type) on public.organizations to authenticated;
revoke insert, delete on public.organizations from authenticated;

-- ── profiles ─────────────────────────────────────────────────────
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_org(id));
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke insert, delete on public.profiles from authenticated;

-- ── memberships ──────────────────────────────────────────────────
create policy memberships_select on public.memberships
  for select to authenticated using (private.is_member(org_id));
create policy memberships_admin_insert on public.memberships
  for insert to authenticated
  with check (private.is_admin(org_id) and role <> 'demo');
create policy memberships_admin_update on public.memberships
  for update to authenticated
  using (private.is_admin(org_id) and user_id <> (select auth.uid()))
  with check (private.is_admin(org_id) and role <> 'demo');
create policy memberships_admin_delete on public.memberships
  for delete to authenticated
  using (private.is_admin(org_id) and user_id <> (select auth.uid()));

-- ── categories / suppliers ───────────────────────────────────────
create policy categories_select on public.categories
  for select to authenticated using (private.is_member(org_id));
create policy categories_insert on public.categories
  for insert to authenticated with check (private.can_write(org_id));
create policy categories_update on public.categories
  for update to authenticated
  using (private.can_write(org_id)) with check (private.can_write(org_id));
create policy categories_delete on public.categories
  for delete to authenticated using (private.is_admin(org_id));

create policy suppliers_select on public.suppliers
  for select to authenticated using (private.is_member(org_id));
create policy suppliers_insert on public.suppliers
  for insert to authenticated with check (private.can_write(org_id));
create policy suppliers_update on public.suppliers
  for update to authenticated
  using (private.can_write(org_id)) with check (private.can_write(org_id));
create policy suppliers_delete on public.suppliers
  for delete to authenticated using (private.is_admin(org_id));

-- ── products ─────────────────────────────────────────────────────
create policy products_select on public.products
  for select to authenticated using (private.is_member(org_id));
create policy products_insert on public.products
  for insert to authenticated with check (private.can_write(org_id));
create policy products_update on public.products
  for update to authenticated
  using (private.can_write(org_id)) with check (private.can_write(org_id));
-- Sin borrado físico: los productos se archivan (is_active = false)
-- para conservar el historial de ventas.
revoke delete on public.products from authenticated;

-- ── sales / sale_items / stock_movements: solo lectura directa ───
create policy sales_select on public.sales
  for select to authenticated using (private.is_member(org_id));
create policy sale_items_select on public.sale_items
  for select to authenticated using (private.is_member(org_id));
create policy stock_movements_select on public.stock_movements
  for select to authenticated using (private.is_member(org_id));
revoke insert, update, delete on public.sales from authenticated;
revoke insert, update, delete on public.sale_items from authenticated;
revoke insert, update, delete on public.stock_movements from authenticated;

-- ── expenses ─────────────────────────────────────────────────────
create policy expenses_select on public.expenses
  for select to authenticated using (private.is_member(org_id));
create policy expenses_insert on public.expenses
  for insert to authenticated
  with check (private.can_write(org_id) and created_by = (select auth.uid()));
create policy expenses_update on public.expenses
  for update to authenticated
  using (private.is_admin(org_id)) with check (private.is_admin(org_id));
create policy expenses_delete on public.expenses
  for delete to authenticated using (private.is_admin(org_id));
