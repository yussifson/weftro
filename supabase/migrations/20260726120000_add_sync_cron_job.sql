-- ============================================================
-- pg_cron + pg_net Integration Sync Scheduler
-- Run this in Supabase Dashboard → SQL Editor
-- 
-- PREREQUISITES (enable in Database → Extensions):
--   1. pg_cron
--   2. pg_net
-- ============================================================

-- Remove any existing job with this name first (safe to re-run)
select cron.unschedule('scheduled-sync-cron') 
where exists (
  select 1 from cron.job where jobname = 'scheduled-sync-cron'
);

-- Schedule: call the Edge Function every 15 minutes
-- The Edge Function checks each integration's sync_frequency and sync_cursor
-- and only fires syncs that are actually due or have a pending cursor to resume.
select cron.schedule(
  'scheduled-sync-cron',
  '*/15 * * * *',
  format(
    $$
    select net.http_post(
      url        := %L || '/functions/v1/scheduled-sync-cron',
      headers    := '{"Content-Type":"application/json","Authorization":"Bearer %s"}'::jsonb,
      body       := '{}'::jsonb,
      timeout_milliseconds := 55000
    )
    $$,
    current_setting('app.supabase_url', true),
    current_setting('app.service_role_key', true)
  )
);

-- ============================================================
-- IMPORTANT: Set app settings so the URL/key are accessible
-- Run these too (replace with your actual values):
-- ============================================================
-- alter database postgres set app.supabase_url = 'https://YOUR_PROJECT.supabase.co';
-- alter database postgres set app.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
-- ============================================================
-- After running, verify with:
-- select * from cron.job where jobname = 'scheduled-sync-cron';
