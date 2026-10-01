-- Create a pg_cron job to ping the automation-worker edge function every minute
-- This ensures that delayed tasks (and failed retries) in the automation_queue are processed.

-- Enable pg_cron if not already enabled (Requires superuser, usually enabled in Supabase by default)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the cron job to run every minute
-- Note: Replace 'your-project-ref' dynamically or ensure the function uses a robust trigger.
-- In Supabase, the easiest way to hit an edge function via cron is using the pg_net extension.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process_automation_queue') THEN
    PERFORM cron.schedule(
      'process_automation_queue',
      '* * * * *',
      $cron$
      SELECT net.http_post(
          url => 'https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/automation-worker',
          headers => '{"Content-Type": "application/json"}'::jsonb,
          body => '{}'::jsonb
      );
      $cron$
    );
  END IF;
END $$;
