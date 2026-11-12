-- ════════════════════════════════════════════════════════════════
-- NEXORA · 0006 · Endurecimiento de seguridad
-- Cierra caminos que la app no usa pero que un usuario autenticado
-- podría intentar llamando directamente a la API de datos.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Privilegios que nadie necesita ────────────────────────────
-- TRUNCATE ignora RLS; REFERENCES y TRIGGER no se usan desde la app.
revoke truncate, references, trigger on all tables in schema public from authenticated, anon;
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
-- Las tablas que se creen más adelante nacen cerradas para anónimos.
alter default privileges in schema public revoke all on tables from anon;

-- Funciones internas: solo las cuatro que usan las políticas quedan ejecutables.
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.can_write(uuid) to authenticated;
grant execute on function private.is_admin(uuid) to authenticated;
grant execute on function private.shares_org(uuid) to authenticated;

-- ── 2. Membresías: sin altas directas ────────────────────────────
-- Antes un administrador podía insertar cualquier user_id en su comercio,
-- saltándose el cupo del plan y sumando gente sin su consentimiento.
-- Las altas pasan solo por create_organization() y accept_invitations().
drop policy if exists memberships_admin_insert on public.memberships;
revoke insert on public.memberships from authenticated;
-- Lo único editable de una membresía es el rol.
revoke update on public.memberships from authenticated;
grant update (role) on public.memberships to authenticated;

-- ── 3. Columnas editables, una por una ───────────────────────────
-- Nadie puede mover una fila a otro comercio ni reescribir fechas o autores.
revoke update on public.products from authenticated;
grant update (name, sku, barcode, category_id, supplier_id, cost_price, sale_price,
              stock, min_stock, image_url, is_active) on public.products to authenticated;

revoke update on public.expenses from authenticated;
grant update (category, description, amount, expense_date, payment_method)
  on public.expenses to authenticated;

revoke update on public.categories from authenticated;
grant update (name) on public.categories to authenticated;
revoke update on public.suppliers from authenticated;
grant update (name) on public.suppliers to authenticated;

revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

revoke update on public.ai_conversations from authenticated;
grant update (title, updated_at) on public.ai_conversations to authenticated;

-- ── 4. Cuenta de demostración ────────────────────────────────────
-- Es una cuenta compartida: cualquier visitante recibe su sesión. Sin estas
-- barreras, un visitante podría cambiarle la clave (y romper la demo para
-- todos), renombrarla o crear comercios con ella.
create or replace function private.is_demo_user(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships where user_id = p_user and role = 'demo');
$$;
revoke execute on function private.is_demo_user(uuid) from public, anon;
grant execute on function private.is_demo_user(uuid) to authenticated;

create or replace function private.protect_demo_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if private.is_demo_user(old.id) and (
       new.encrypted_password is distinct from old.encrypted_password
    or new.email is distinct from old.email
    or new.phone is distinct from old.phone
    or new.raw_user_meta_data is distinct from old.raw_user_meta_data
    or coalesce(new.email_change, '') <> coalesce(old.email_change, '')
    or coalesce(new.phone_change, '') <> coalesce(old.phone_change, '')
  ) then
    raise exception 'La cuenta de demostración no se puede modificar';
  end if;
  return new;
end $$;

drop trigger if exists protect_demo_user on auth.users;
create trigger protect_demo_user
  before update on auth.users
  for each row execute function private.protect_demo_user();

-- El perfil visible de la demo tampoco se puede editar.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and not private.is_demo_user((select auth.uid())))
  with check (id = (select auth.uid()));

-- La cuenta de demo no puede crear comercios.
create or replace function public.create_organization(p_name text, p_business_type text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_org uuid;
begin
  if v_user is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;
  if private.is_demo_user(v_user) then
    raise exception 'La cuenta de demostración no puede crear comercios' using errcode = '42501';
  end if;
  if (select count(*) from public.memberships where user_id = v_user and role = 'admin') >= 3 then
    raise exception 'Alcanzaste el máximo de comercios por cuenta';
  end if;

  insert into public.organizations (name, business_type, created_by)
  values (trim(p_name), coalesce(nullif(trim(p_business_type), ''), 'comercio'), v_user)
  returning id into v_org;

  insert into public.memberships (org_id, user_id, role) values (v_org, v_user, 'admin');
  return v_org;
end $$;
revoke all on function public.create_organization(text, text) from public, anon;
grant execute on function public.create_organization(text, text) to authenticated;

-- ── 5. Baja completa de un comercio ──────────────────────────────
-- Al borrar un comercio, las ventas deben irse antes que los productos
-- (los ítems de venta referencian productos). Sin esto, un comercio con
-- ventas no se podía eliminar y sus datos quedaban para siempre.
create or replace function private.purge_org_sales()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.sales where org_id = old.id;
  return old;
end $$;

drop trigger if exists organizations_purge_sales on public.organizations;
create trigger organizations_purge_sales
  before delete on public.organizations
  for each row execute function private.purge_org_sales();
revoke execute on function private.purge_org_sales() from public, anon, authenticated;
