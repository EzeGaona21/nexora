-- Demo: un comercio que crece. Más ventas a lo largo de los 6 meses
-- y sin la caída simulada de los últimos días.
do $mig$
declare
  d text := pg_get_functiondef('public.seed_demo_data(uuid,integer)'::regprocedure);
begin
  d := replace(d, '26 * v_wf * (1 + 0.18 * v_progress)', '18 * v_wf * (1 + 1.6 * v_progress)');
  d := replace(d, 'case when v_d >= p_days - 6 then 0.74 else 1 end', '1');
  if position('18 * v_wf * (1 + 1.6 * v_progress)' in d) = 0 then
    raise exception 'seed_demo_data no tiene la forma esperada';
  end if;
  execute d;
end
$mig$;

select private.refresh_demo_orgs();
