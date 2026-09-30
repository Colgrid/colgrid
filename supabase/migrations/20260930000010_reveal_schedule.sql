-- Colgrid: ping the website every 5 minutes so reveal emails go out on time.
-- Supabase only (needs the pg_cron and pg_net extensions); not part of the local test run.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('colgrid-reveal-email') where exists (select 1 from cron.job where jobname = 'colgrid-reveal-email');
select cron.schedule(
  'colgrid-reveal-email',
  '*/5 * * * *',
  $$select net.http_post(
      url := 'https://getcolgrid.com/api/cron/reveal',
      headers := jsonb_build_object('Content-Type', 'application/json',
                                    'Authorization', 'Bearer ' || (select value from private.app_secret where name = 'cron')),
      body := '{}'::jsonb,
      timeout_milliseconds := 20000
    )$$
);
