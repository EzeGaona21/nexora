-- ════════════════════════════════════════════════════════════════
-- NEXORA · 0003 · Operaciones atómicas y consultas analíticas
-- ════════════════════════════════════════════════════════════════

-- ── Alta de comercio (onboarding) ────────────────────────────────
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
  if (select count(*) from public.memberships where user_id = v_user and role = 'admin') >= 3 then
    raise exception 'Alcanzaste el máximo de comercios por cuenta';
  end if;

  insert into public.organizations (name, business_type, created_by)
  values (trim(p_name), coalesce(nullif(trim(p_business_type), ''), 'comercio'), v_user)
  returning id into v_org;

  insert into public.memberships (org_id, user_id, role) values (v_org, v_user, 'admin');
  return v_org;
end $$;

-- ── Registrar venta ──────────────────────────────────────────────
-- Todo ocurre en una transacción: valida permisos, bloquea los
-- productos (FOR UPDATE, en orden estable para evitar deadlocks),
-- verifica stock, toma precio y costo DESDE LA BASE (nunca del
-- cliente), descuenta stock y escribe el movimiento.
-- p_idempotency_key: reenviar la misma clave devuelve la venta
-- original en lugar de crear otra.
create or replace function public.create_sale(
  p_org uuid,
  p_items jsonb,
  p_discount numeric,
  p_payment_method text,
  p_customer_name text,
  p_idempotency_key uuid
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_sale uuid;
  v_number bigint;
  v_item record;
  v_product record;
  v_subtotal numeric(14, 2) := 0;
  v_cost numeric(14, 2) := 0;
  v_units integer := 0;
  v_discount numeric(14, 2) := round(coalesce(p_discount, 0), 2);
begin
  if v_user is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;
  if not private.can_write(p_org) then
    raise exception 'No tenés permisos para registrar ventas en este comercio'
      using errcode = '42501';
  end if;
  if p_idempotency_key is null then
    raise exception 'Falta la clave de idempotencia';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos';
  end if;
  if jsonb_array_length(p_items) > 200 then
    raise exception 'La venta supera el máximo de 200 líneas';
  end if;
  if v_discount < 0 then
    raise exception 'El descuento no puede ser negativo';
  end if;

  -- Serializa las ventas del comercio: dos envíos simultáneos esperan acá.
  perform 1 from public.organizations where id = p_org for update;

  -- Con el comercio bloqueado, la verificación de idempotencia es exacta.
  select id into v_sale
    from public.sales
   where org_id = p_org and idempotency_key = p_idempotency_key;
  if found then
    return v_sale;
  end if;

  -- Reserva el número de comprobante.
  update public.organizations
     set sale_counter = sale_counter + 1
   where id = p_org
  returning sale_counter into v_number;

  perform set_config('nexora.stock_managed', 'on', true);

  insert into public.sales
    (org_id, number, payment_method, customer_name, idempotency_key, created_by)
  values
    (p_org, v_number, p_payment_method::public.payment_method,
     nullif(trim(coalesce(p_customer_name, '')), ''), p_idempotency_key, v_user)
  returning id into v_sale;

  for v_item in
    select (e ->> 'product_id')::uuid as product_id,
           sum((e ->> 'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_items) as e
     group by 1
     order by 1
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Cantidad inválida';
    end if;

    select id, name, sale_price, cost_price, stock
      into v_product
      from public.products
     where id = v_item.product_id and org_id = p_org and is_active
       for update;
    if not found then
      raise exception 'Uno de los productos ya no está disponible';
    end if;
    if v_product.stock < v_item.quantity then
      raise exception 'Stock insuficiente para "%": quedan % unidades',
        v_product.name, v_product.stock;
    end if;

    update public.products
       set stock = stock - v_item.quantity
     where id = v_product.id;

    insert into public.sale_items
      (org_id, sale_id, product_id, product_name, quantity, unit_price, unit_cost, line_total)
    values
      (p_org, v_sale, v_product.id, v_product.name, v_item.quantity,
       v_product.sale_price, v_product.cost_price,
       v_product.sale_price * v_item.quantity);

    insert into public.stock_movements (org_id, product_id, kind, quantity, sale_id, created_by)
    values (p_org, v_product.id, 'sale', -v_item.quantity, v_sale, v_user);

    v_subtotal := v_subtotal + v_product.sale_price * v_item.quantity;
    v_cost := v_cost + v_product.cost_price * v_item.quantity;
    v_units := v_units + v_item.quantity;
  end loop;

  if v_discount > v_subtotal then
    raise exception 'El descuento no puede superar el subtotal';
  end if;

  update public.sales
     set subtotal = v_subtotal,
         discount = v_discount,
         total = v_subtotal - v_discount,
         cost_total = v_cost,
         units = v_units
   where id = v_sale;

  return v_sale;
end $$;

-- ── Cancelar venta ───────────────────────────────────────────────
-- Bloquea la venta; si ya estaba cancelada falla sin tocar stock.
-- El índice único de stock_movements es la segunda barrera.
create or replace function public.cancel_sale(p_sale uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_sale record;
  v_item record;
begin
  if v_user is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  select id, org_id, status into v_sale
    from public.sales where id = p_sale for update;
  if not found or not private.is_member(v_sale.org_id) then
    raise exception 'Venta inexistente';
  end if;
  if not private.is_admin(v_sale.org_id) then
    raise exception 'Solo un administrador puede cancelar ventas' using errcode = '42501';
  end if;
  if v_sale.status = 'cancelled' then
    raise exception 'La venta ya estaba cancelada';
  end if;

  perform set_config('nexora.stock_managed', 'on', true);

  for v_item in
    select product_id, quantity from public.sale_items
     where sale_id = p_sale order by product_id
  loop
    update public.products set stock = stock + v_item.quantity where id = v_item.product_id;
    insert into public.stock_movements (org_id, product_id, kind, quantity, sale_id, created_by)
    values (v_sale.org_id, v_item.product_id, 'sale_cancel', v_item.quantity, p_sale, v_user);
  end loop;

  update public.sales
     set status = 'cancelled', cancelled_at = now(), cancelled_by = v_user
   where id = p_sale;
end $$;

-- ── Consultas analíticas (SECURITY INVOKER: aplican RLS) ─────────
-- Ventas por día, en hora de Argentina, con días sin ventas en cero.
create or replace function public.sales_daily(p_org uuid, p_from date, p_to date)
returns table (day date, revenue numeric, cost numeric, sales_count integer, units integer)
language sql stable security invoker set search_path = '' as $$
  with days as (
    select generate_series(p_from::timestamp, p_to::timestamp, interval '1 day')::date as d
  ),
  agg as (
    select (s.created_at at time zone 'America/Argentina/Buenos_Aires')::date as d,
           sum(s.total) as revenue,
           sum(s.cost_total) as cost,
           count(*)::integer as sales_count,
           sum(s.units)::integer as units
      from public.sales s
     where s.org_id = p_org
       and s.status = 'completed'
       and s.created_at >= (p_from::timestamp at time zone 'America/Argentina/Buenos_Aires')
       and s.created_at < ((p_to + 1)::timestamp at time zone 'America/Argentina/Buenos_Aires')
     group by 1
  )
  select days.d, coalesce(agg.revenue, 0), coalesce(agg.cost, 0),
         coalesce(agg.sales_count, 0), coalesce(agg.units, 0)
    from days left join agg on agg.d = days.d
   order by days.d;
$$;

-- Rendimiento por producto activo: ventana actual vs. ventana anterior.
create or replace function public.inventory_insights(p_org uuid, p_days integer default 30)
returns table (
  id uuid, name text, sku text, category text,
  stock integer, min_stock integer, cost_price numeric, sale_price numeric,
  units_window integer, units_prev_window integer,
  revenue_window numeric, profit_window numeric,
  last_sale_at timestamptz, created_at timestamptz
)
language sql stable security invoker set search_path = '' as $$
  with w as (
    select si.product_id,
           coalesce(sum(si.quantity) filter (
             where s.created_at >= now() - make_interval(days => p_days)), 0)::integer as units_w,
           coalesce(sum(si.quantity) filter (
             where s.created_at < now() - make_interval(days => p_days)
               and s.created_at >= now() - make_interval(days => 2 * p_days)), 0)::integer as units_p,
           coalesce(sum(si.line_total) filter (
             where s.created_at >= now() - make_interval(days => p_days)), 0) as revenue_w,
           coalesce(sum(si.line_total - si.quantity * si.unit_cost) filter (
             where s.created_at >= now() - make_interval(days => p_days)), 0) as profit_w,
           max(s.created_at) as last_sale
      from public.sale_items si
      join public.sales s on s.id = si.sale_id
     where si.org_id = p_org and s.status = 'completed'
     group by si.product_id
  )
  select p.id, p.name, p.sku, c.name,
         p.stock, p.min_stock, p.cost_price, p.sale_price,
         coalesce(w.units_w, 0), coalesce(w.units_p, 0),
         coalesce(w.revenue_w, 0), coalesce(w.profit_w, 0),
         w.last_sale, p.created_at
    from public.products p
    left join public.categories c on c.id = p.category_id
    left join w on w.product_id = p.id
   where p.org_id = p_org and p.is_active
   order by coalesce(w.revenue_w, 0) desc, p.name;
$$;

create or replace function public.expenses_summary(p_org uuid, p_from date, p_to date)
returns table (category text, total numeric, items integer)
language sql stable security invoker set search_path = '' as $$
  select e.category, sum(e.amount), count(*)::integer
    from public.expenses e
   where e.org_id = p_org and e.expense_date between p_from and p_to
   group by e.category
   order by sum(e.amount) desc;
$$;

-- ── Permisos de ejecución ────────────────────────────────────────
revoke all on function public.create_organization(text, text) from public, anon;
revoke all on function public.create_sale(uuid, jsonb, numeric, text, text, uuid) from public, anon;
revoke all on function public.cancel_sale(uuid) from public, anon;
revoke all on function public.sales_daily(uuid, date, date) from public, anon;
revoke all on function public.inventory_insights(uuid, integer) from public, anon;
revoke all on function public.expenses_summary(uuid, date, date) from public, anon;

grant execute on function public.create_organization(text, text) to authenticated;
grant execute on function public.create_sale(uuid, jsonb, numeric, text, text, uuid) to authenticated;
grant execute on function public.cancel_sale(uuid) to authenticated;
grant execute on function public.sales_daily(uuid, date, date) to authenticated;
grant execute on function public.inventory_insights(uuid, integer) to authenticated;
grant execute on function public.expenses_summary(uuid, date, date) to authenticated;
