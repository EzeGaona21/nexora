-- ════════════════════════════════════════════════════════════════
-- NEXORA · 0001 · Esquema base multi-tenant
-- Cada fila de negocio lleva org_id. Las claves foráneas compuestas
-- (org_id, x_id) impiden referenciar datos de otro comercio incluso
-- si alguien conoce un UUID ajeno.
-- ════════════════════════════════════════════════════════════════

create schema if not exists private;

create type public.member_role as enum ('admin', 'employee', 'demo');
create type public.plan_tier as enum ('free', 'pro', 'business');
create type public.sale_status as enum ('completed', 'cancelled');
create type public.payment_method as enum
  ('efectivo', 'debito', 'credito', 'transferencia', 'mercado_pago', 'otro');
create type public.stock_movement_kind as enum
  ('initial', 'sale', 'sale_cancel', 'adjustment');

-- ── Comercios ────────────────────────────────────────────────────
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  business_type text not null default 'comercio',
  plan public.plan_tier not null default 'free',
  is_demo boolean not null default false,
  sale_counter bigint not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table public.memberships (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'employee',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

-- ── Catálogo ─────────────────────────────────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (org_id, name),
  unique (org_id, id)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (org_id, name),
  unique (org_id, id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  sku text not null check (char_length(sku) between 1 and 40),
  barcode text check (barcode is null or char_length(barcode) <= 40),
  category_id uuid,
  supplier_id uuid,
  cost_price numeric(14, 2) not null default 0 check (cost_price >= 0),
  sale_price numeric(14, 2) not null default 0 check (sale_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  min_stock integer not null default 0 check (min_stock >= 0),
  is_low_stock boolean generated always as (stock <= min_stock) stored,
  image_url text check (image_url is null or image_url ~* '^https://'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, sku),
  unique (org_id, id),
  foreign key (org_id, category_id) references public.categories (org_id, id)
    on delete set null (category_id),
  foreign key (org_id, supplier_id) references public.suppliers (org_id, id)
    on delete set null (supplier_id)
);
create index products_org_active_idx on public.products (org_id, is_active, name);
create index products_org_low_idx on public.products (org_id) where is_low_stock and is_active;

-- ── Ventas ───────────────────────────────────────────────────────
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  number bigint not null,
  status public.sale_status not null default 'completed',
  subtotal numeric(14, 2) not null default 0 check (subtotal >= 0),
  discount numeric(14, 2) not null default 0 check (discount >= 0),
  total numeric(14, 2) not null default 0 check (total >= 0),
  cost_total numeric(14, 2) not null default 0 check (cost_total >= 0),
  units integer not null default 0 check (units >= 0),
  payment_method public.payment_method not null,
  customer_name text check (customer_name is null or char_length(customer_name) <= 80),
  idempotency_key uuid,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete set null,
  unique (org_id, number),
  unique (org_id, id),
  -- Un mismo envío del formulario (misma clave) nunca genera dos ventas.
  unique (org_id, idempotency_key),
  check (discount <= subtotal)
);
create index sales_org_created_idx on public.sales (org_id, created_at desc);
create index sales_org_status_created_idx on public.sales (org_id, status, created_at desc);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  sale_id uuid not null,
  product_id uuid not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  unit_cost numeric(14, 2) not null check (unit_cost >= 0),
  line_total numeric(14, 2) not null check (line_total >= 0),
  unique (sale_id, product_id),
  foreign key (org_id, sale_id) references public.sales (org_id, id) on delete cascade,
  foreign key (org_id, product_id) references public.products (org_id, id)
);
create index sale_items_org_product_idx on public.sale_items (org_id, product_id);

-- ── Movimientos de stock (libro mayor) ───────────────────────────
-- products.stock es siempre la suma de estos movimientos.
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  product_id uuid not null,
  kind public.stock_movement_kind not null,
  quantity integer not null check (quantity <> 0),
  sale_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (org_id, product_id) references public.products (org_id, id) on delete cascade,
  foreign key (org_id, sale_id) references public.sales (org_id, id) on delete cascade
);
create index stock_movements_org_product_idx
  on public.stock_movements (org_id, product_id, created_at desc);
-- Garantía a nivel base: una venta descuenta (y devuelve) stock de un
-- producto UNA sola vez, aunque el evento se procese dos veces.
create unique index stock_movements_once_per_event
  on public.stock_movements (sale_id, product_id, kind)
  where sale_id is not null;

-- ── Gastos ───────────────────────────────────────────────────────
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  category text not null check (char_length(category) between 1 and 60),
  description text not null check (char_length(description) between 1 and 200),
  amount numeric(14, 2) not null check (amount > 0),
  expense_date date not null,
  payment_method public.payment_method not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index expenses_org_date_idx on public.expenses (org_id, expense_date desc);

-- ── Triggers ─────────────────────────────────────────────────────
create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger products_touch_updated_at
  before update on public.products
  for each row execute function private.touch_updated_at();

-- Perfil automático al registrarse.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Todo cambio manual de stock queda registrado. Las funciones de venta
-- activan 'nexora.stock_managed' porque escriben sus propios movimientos.
create or replace function private.log_stock_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('nexora.stock_managed', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.stock > 0 then
      insert into public.stock_movements (org_id, product_id, kind, quantity, created_by)
      values (new.org_id, new.id, 'initial', new.stock, (select auth.uid()));
    end if;
  elsif new.stock <> old.stock then
    insert into public.stock_movements (org_id, product_id, kind, quantity, created_by)
    values (new.org_id, new.id, 'adjustment', new.stock - old.stock, (select auth.uid()));
  end if;
  return new;
end $$;

create trigger products_log_stock
  after insert or update of stock on public.products
  for each row execute function private.log_stock_change();
