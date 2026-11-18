-- La demo se regenera sola cada hora para que "hoy" siempre tenga ventas.
create extension if not exists pg_cron;

create or replace function private.refresh_demo_orgs()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  for v_org in select id from public.organizations where is_demo loop
    perform public.seed_demo_data(v_org, 180);
  end loop;
end $$;

revoke all on function private.refresh_demo_orgs() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'refresh-demo';
select cron.schedule('refresh-demo', '5 * * * *', $$select private.refresh_demo_orgs()$$);
