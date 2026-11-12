-- ════════════════════════════════════════════════════════════════
-- NEXORA · 0004 · Datos de demostración
-- Genera ~6 meses de operación de un almacén ficticio. No usa
-- random(): cada valor sale de un hash md5 de (fecha, venta, ítem),
-- así que los datos quedan guardados y son idénticos en cada recarga.
-- Solo puede ejecutarla el rol de servicio (scripts/seed-demo.mjs).
-- ════════════════════════════════════════════════════════════════

create or replace function private.h(p_key text, p_mod integer)
returns integer language sql immutable set search_path = '' as $$
  select (('x' || substr(md5(p_key), 1, 7))::bit(28)::integer % p_mod);
$$;

create or replace function public.seed_demo_data(p_org uuid, p_days integer default 180)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz := now();
  v_today date := (v_now at time zone 'America/Argentina/Buenos_Aires')::date;
  v_start date := v_today - (p_days - 1);
  v_day date;
  v_d integer;
  v_n integer;
  v_s integer;
  v_k integer;
  v_i integer;
  v_r integer;
  v_qty integer;
  v_total_w integer;
  v_progress numeric;
  v_wf numeric;
  v_ts timestamptz;
  v_sale uuid;
  v_number bigint := 0;
  v_subtotal numeric(14, 2);
  v_cost numeric(14, 2);
  v_units integer;
  v_discount numeric(14, 2);
  v_pay public.payment_method;
  v_p record;
  v_picked uuid[];
  v_key text;
  v_m integer;
  v_month date;
  v_e record;
  v_amount numeric(14, 2);
  v_date date;
begin
  if not exists (select 1 from public.organizations where id = p_org and is_demo) then
    raise exception 'La organización indicada no es de demostración';
  end if;

  perform set_config('nexora.stock_managed', 'on', true);

  delete from public.stock_movements where org_id = p_org;
  delete from public.sale_items where org_id = p_org;
  delete from public.sales where org_id = p_org;
  delete from public.expenses where org_id = p_org;
  delete from public.products where org_id = p_org;
  delete from public.suppliers where org_id = p_org;
  delete from public.categories where org_id = p_org;

  insert into public.categories (org_id, name)
  select p_org, x from unnest(array[
    'Almacén', 'Bebidas', 'Lácteos', 'Limpieza', 'Golosinas', 'Perfumería']) as x;

  insert into public.suppliers (org_id, name)
  select p_org, x from unnest(array[
    'Distribuidora Del Sur', 'Bebidas Litoral', 'Lácteos La Pampa', 'Mayorista Central']) as x;

  -- Catálogo: (sku, nombre, categoría, proveedor, costo, precio, stock mínimo,
  --            stock final, peso de venta, tendencia)
  create temp table pg_temp._demo_catalog (
    sku text, name text, category text, supplier text,
    cost numeric, price numeric, min_stock integer, final_stock integer,
    weight integer, trend text, product_id uuid
  ) on commit drop;

  insert into pg_temp._demo_catalog
    (sku, name, category, supplier, cost, price, min_stock, final_stock, weight, trend)
  values
    ('ALM-001', 'Yerba mate 1 kg',            'Almacén',    'Distribuidora Del Sur', 3900, 5400, 12, 34, 60, 'flat'),
    ('ALM-002', 'Azúcar 1 kg',                'Almacén',    'Distribuidora Del Sur', 1050, 1450, 15,  8, 48, 'flat'),
    ('ALM-003', 'Fideos secos 500 g',         'Almacén',    'Distribuidora Del Sur',  980, 1390, 20, 52, 55, 'flat'),
    ('ALM-004', 'Arroz largo fino 1 kg',      'Almacén',    'Distribuidora Del Sur', 1700, 2350, 12, 27, 40, 'flat'),
    ('ALM-005', 'Aceite de girasol 900 ml',   'Almacén',    'Mayorista Central',     2600, 3350, 10,  4, 45, 'up'),
    ('ALM-006', 'Harina 000 1 kg',            'Almacén',    'Distribuidora Del Sur',  720,  990, 15, 40, 38, 'flat'),
    ('ALM-007', 'Puré de tomate 520 g',       'Almacén',    'Mayorista Central',      810, 1150, 12, 31, 30, 'flat'),
    ('ALM-008', 'Café molido 250 g',          'Almacén',    'Mayorista Central',     4300, 5900,  6, 14, 18, 'up'),
    ('ALM-009', 'Galletitas de agua x3',      'Almacén',    'Distribuidora Del Sur', 1500, 2100, 10, 22, 35, 'flat'),
    ('ALM-010', 'Mermelada 454 g',            'Almacén',    'Mayorista Central',     2100, 2890,  6, 19, 10, 'down'),
    ('ALM-011', 'Aceitunas verdes 200 g',     'Almacén',    'Mayorista Central',     1900, 2700,  5, 26,  4, 'dead'),
    ('ALM-012', 'Atún al natural 170 g',      'Almacén',    'Mayorista Central',     2450, 2690,  8, 17, 22, 'flat'),
    ('BEB-001', 'Gaseosa cola 2,25 L',        'Bebidas',    'Bebidas Litoral',       2500, 3400, 18, 12, 70, 'flat'),
    ('BEB-002', 'Agua mineral 2 L',           'Bebidas',    'Bebidas Litoral',        900, 1400, 18, 44, 50, 'up'),
    ('BEB-003', 'Cerveza lata 473 ml',        'Bebidas',    'Bebidas Litoral',       1300, 1900, 24, 60, 65, 'up'),
    ('BEB-004', 'Vino tinto 750 ml',          'Bebidas',    'Bebidas Litoral',       3200, 4600,  8, 15, 20, 'flat'),
    ('BEB-005', 'Soda sifón 2 L',             'Bebidas',    'Bebidas Litoral',        850, 1250, 10,  0, 16, 'flat'),
    ('BEB-006', 'Energizante 473 ml',         'Bebidas',    'Bebidas Litoral',       1750, 2500,  8, 21, 14, 'up'),
    ('LAC-001', 'Leche entera 1 L',           'Lácteos',    'Lácteos La Pampa',      1250, 1590, 24, 30, 75, 'flat'),
    ('LAC-002', 'Yogur bebible 1 L',          'Lácteos',    'Lácteos La Pampa',      1900, 2550, 10,  9, 28, 'flat'),
    ('LAC-003', 'Queso cremoso x kg',         'Lácteos',    'Lácteos La Pampa',      7800, 9900,  4,  6, 24, 'flat'),
    ('LAC-004', 'Manteca 200 g',              'Lácteos',    'Lácteos La Pampa',      2300, 2590,  8, 13, 20, 'down'),
    ('LAC-005', 'Dulce de leche 400 g',       'Lácteos',    'Lácteos La Pampa',      2400, 3300,  8, 18, 26, 'flat'),
    ('LIM-001', 'Lavandina 1 L',              'Limpieza',   'Mayorista Central',      850, 1300, 10, 25, 22, 'flat'),
    ('LIM-002', 'Detergente 500 ml',          'Limpieza',   'Mayorista Central',     1300, 1890, 10, 16, 24, 'flat'),
    ('LIM-003', 'Papel higiénico x4',         'Limpieza',   'Mayorista Central',     2200, 2990, 12, 20, 36, 'flat'),
    ('LIM-004', 'Rollo de cocina x3',         'Limpieza',   'Mayorista Central',     1700, 2400,  8, 23, 18, 'flat'),
    ('LIM-005', 'Esponja multiuso',           'Limpieza',   'Mayorista Central',      450,  800, 10, 37,  9, 'down'),
    ('GOL-001', 'Alfajor triple',             'Golosinas',  'Distribuidora Del Sur',  700, 1100, 30, 64, 58, 'flat'),
    ('GOL-002', 'Chocolate 100 g',            'Golosinas',  'Distribuidora Del Sur', 2200, 3100,  8, 15, 16, 'flat'),
    ('GOL-003', 'Caramelos x 150 g',          'Golosinas',  'Distribuidora Del Sur',  900, 1400,  6, 28,  3, 'dead'),
    ('PER-001', 'Jabón de tocador x3',        'Perfumería', 'Mayorista Central',     1500, 2150,  8, 19, 14, 'flat'),
    ('PER-002', 'Shampoo 400 ml',             'Perfumería', 'Mayorista Central',     3400, 4700,  5, 11,  8, 'down'),
    ('PER-003', 'Pasta dental 90 g',          'Perfumería', 'Mayorista Central',     1700, 2450,  8,  3, 15, 'flat');

  with ins as (
    insert into public.products
      (org_id, name, sku, barcode, category_id, supplier_id, cost_price, sale_price,
       stock, min_stock, created_at)
    select p_org, c.name, c.sku,
           '779' || lpad((1000000000 + private.h(c.sku, 899999999))::text, 10, '0'),
           cat.id, sup.id, c.cost, c.price, 100000, c.min_stock,
           (v_start::timestamp at time zone 'America/Argentina/Buenos_Aires')
      from pg_temp._demo_catalog c
      join public.categories cat on cat.org_id = p_org and cat.name = c.category
      join public.suppliers sup on sup.org_id = p_org and sup.name = c.supplier
    returning id, sku
  )
  update pg_temp._demo_catalog c set product_id = ins.id from ins where ins.sku = c.sku;

  create temp table pg_temp._demo_day (
    product_id uuid, sku text, name text, cost numeric, price numeric, w integer
  ) on commit drop;

  -- ── Ventas ─────────────────────────────────────────────────────
  for v_d in 0 .. p_days - 1 loop
    v_day := v_start + v_d;
    v_progress := v_d::numeric / greatest(p_days - 1, 1);

    -- Peso efectivo de cada producto según su tendencia.
    truncate pg_temp._demo_day;
    insert into pg_temp._demo_day
    select c.product_id, c.sku, c.name, c.cost, c.price,
           case c.trend
             when 'up' then round(c.weight * (0.45 + 1.3 * v_progress))
             when 'down' then round(c.weight * (1.5 - 1.1 * v_progress))
             when 'dead' then case when v_d < p_days - 48 then c.weight else 0 end
             else c.weight
           end::integer
      from pg_temp._demo_catalog c;
    select sum(w) into v_total_w from pg_temp._demo_day;

    -- Estacionalidad semanal (0 = domingo) + crecimiento + variación diaria.
    v_wf := (array[0.55, 0.90, 0.92, 0.97, 1.00, 1.20, 1.38])[extract(dow from v_day)::integer + 1];
    v_n := round(
      26 * v_wf * (1 + 0.18 * v_progress)
         * (0.86 + private.h(v_day::text || ':n', 29) / 100.0)
         * case when v_d >= p_days - 6 then 0.74 else 1 end  -- semana floja reciente
    );

    for v_s in 1 .. v_n loop
      v_key := v_day::text || ':' || v_s;
      -- Horario comercial: 08:30 a 20:59.
      v_ts := (v_day::timestamp + make_interval(mins => 510 + private.h(v_key || ':t', 750)))
                at time zone 'America/Argentina/Buenos_Aires';
      continue when v_ts > v_now;

      v_number := v_number + 1;
      v_r := private.h(v_key || ':p', 100);
      v_pay := case
        when v_r < 38 then 'efectivo'
        when v_r < 65 then 'mercado_pago'
        when v_r < 83 then 'debito'
        when v_r < 93 then 'credito'
        else 'transferencia'
      end::public.payment_method;

      insert into public.sales (org_id, number, payment_method, created_at)
      values (p_org, v_number, v_pay, v_ts)
      returning id into v_sale;

      v_subtotal := 0; v_cost := 0; v_units := 0; v_picked := '{}';
      v_r := private.h(v_key || ':k', 10);
      v_k := case when v_r < 3 then 1 when v_r < 6 then 2 when v_r < 8 then 3
                  when v_r < 9 then 4 else 5 end;

      for v_i in 1 .. v_k loop
        v_r := private.h(v_key || ':i' || v_i, v_total_w);
        select t.product_id, t.name, t.cost, t.price into v_p
          from (select d.*, sum(d.w) over (order by d.sku) as cum from pg_temp._demo_day d) t
         where t.cum > v_r and t.w > 0
         order by t.cum
         limit 1;
        continue when v_p.product_id = any (v_picked);
        v_picked := v_picked || v_p.product_id;

        v_r := private.h(v_key || ':q' || v_i, 10);
        v_qty := case when v_r < 7 then 1 when v_r < 9 then 2 else 3 end;

        insert into public.sale_items
          (org_id, sale_id, product_id, product_name, quantity, unit_price, unit_cost, line_total)
        values
          (p_org, v_sale, v_p.product_id, v_p.name, v_qty, v_p.price, v_p.cost, v_p.price * v_qty);
        insert into public.stock_movements
          (org_id, product_id, kind, quantity, sale_id, created_at)
        values (p_org, v_p.product_id, 'sale', -v_qty, v_sale, v_ts);

        v_subtotal := v_subtotal + v_p.price * v_qty;
        v_cost := v_cost + v_p.cost * v_qty;
        v_units := v_units + v_qty;
      end loop;

      v_discount := case when private.h(v_key || ':d', 100) < 7
                         then round(v_subtotal * 0.10, 2) else 0 end;
      update public.sales
         set subtotal = v_subtotal, discount = v_discount,
             total = v_subtotal - v_discount, cost_total = v_cost, units = v_units
       where id = v_sale;
    end loop;
  end loop;

  update public.organizations set sale_counter = v_number where id = p_org;

  -- ── Stock coherente: inicial − vendido = stock final ───────────
  insert into public.stock_movements (org_id, product_id, kind, quantity, created_at)
  select p_org, c.product_id, 'initial',
         c.final_stock + coalesce((
           select -sum(m.quantity) from public.stock_movements m
            where m.product_id = c.product_id and m.kind = 'sale'), 0),
         (v_start::timestamp at time zone 'America/Argentina/Buenos_Aires')
    from pg_temp._demo_catalog c
   where c.final_stock + coalesce((
           select -sum(m.quantity) from public.stock_movements m
            where m.product_id = c.product_id and m.kind = 'sale'), 0) > 0;

  update public.products p
     set stock = c.final_stock
    from pg_temp._demo_catalog c
   where p.id = c.product_id;

  -- ── Gastos mensuales ───────────────────────────────────────────
  for v_m in reverse 5 .. 0 loop
    v_month := (date_trunc('month', v_today::timestamp) - make_interval(months => v_m))::date;
    for v_e in
      select * from (values
        ('Alquiler',      'Alquiler del local',                 1,  420000, 'transferencia'),
        ('Sueldos',       'Sueldo empleado media jornada',      2,  480000, 'transferencia'),
        ('Servicios',     'Luz',                                3,   95000, 'debito'),
        ('Servicios',     'Internet y telefonía',               3,   32000, 'debito'),
        ('Impuestos',     'Monotributo',                        4,   78000, 'debito'),
        ('Impuestos',     'Ingresos Brutos',                    9,   60000, 'transferencia'),
        ('Mantenimiento', 'Service de heladeras',              12,   45000, 'efectivo'),
        ('Marketing',     'Publicidad en redes',               15,   30000, 'credito'),
        ('Insumos',       'Bolsas, rollos de ticket y limpieza',20,  18000, 'efectivo'),
        ('Comisiones',    'Comisiones de cobro electrónico',   27,   55000, 'debito')
      ) as t(category, description, dom, base, pay)
    loop
      v_date := v_month + (v_e.dom - 1);
      continue when v_date > v_today or v_date < v_start;
      v_amount := round(
        v_e.base * (1 + 0.02 * (5 - v_m))
                 * (0.97 + private.h(v_month::text || v_e.description, 7) / 100.0)
                 -- Factura de luz atípica este mes: dispara la alerta de gasto elevado.
                 * case when v_m = 0 and v_e.description = 'Luz' then 1.75 else 1 end,
        -2);
      insert into public.expenses
        (org_id, category, description, amount, expense_date, payment_method, created_at)
      values
        (p_org, v_e.category, v_e.description, v_amount, v_date,
         v_e.pay::public.payment_method,
         (v_date::timestamp + interval '10 hours') at time zone 'America/Argentina/Buenos_Aires');
    end loop;
  end loop;
end $$;

revoke all on function public.seed_demo_data(uuid, integer) from public, anon, authenticated;
grant execute on function public.seed_demo_data(uuid, integer) to service_role;
