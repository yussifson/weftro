-- Migration: Add Master Automation Trigger for Custom Orbit Models
-- Run this in the Supabase SQL Editor

-- 1. Create a generic function to call the automation-engine Edge Function
CREATE OR REPLACE FUNCTION public.invoke_automation_engine()
RETURNS TRIGGER AS $$
DECLARE
    endpoint TEXT := current_setting('custom.supabase_url', true) || '/functions/v1/automation-engine';
    secret_key TEXT := current_setting('custom.supabase_service_role_key', true);
    payload JSONB;
    request_body TEXT;
    table_name_alias TEXT;
BEGIN
    IF endpoint IS NULL OR secret_key IS NULL THEN
        RETURN NEW;
    END IF;

    -- For industry_records, we use the record_type as the logical table name for automations (e.g. 'custom_leads')
    IF TG_TABLE_NAME = 'industry_records' THEN
        table_name_alias := NEW.record_type;
    ELSE
        table_name_alias := TG_TABLE_NAME;
    END IF;

    -- Construct the payload
    payload := jsonb_build_object(
        'type', TG_OP,
        'table', table_name_alias,
        'record', row_to_json(NEW),
        'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
    );

    request_body := payload::text;

    -- Invoke Edge Function asynchronously
    PERFORM net.http_post(
        url := endpoint,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret_key),
        body := request_body
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach trigger to industry_records (Custom Orbit Models)
DROP TRIGGER IF EXISTS master_automation_trigger ON public.industry_records;
CREATE TRIGGER master_automation_trigger
AFTER INSERT OR UPDATE ON public.industry_records
FOR EACH ROW EXECUTE FUNCTION public.invoke_automation_engine();

-- 3. We can optionally attach it to core tables if requested:
DROP TRIGGER IF EXISTS core_leads_automation_trigger ON public.leads;
-- Example: CREATE TRIGGER core_leads_automation_trigger AFTER INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.invoke_automation_engine();
