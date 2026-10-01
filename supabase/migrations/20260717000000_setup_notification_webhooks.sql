-- Migration: Setup Notification Webhooks and Additional Triggers

-- 1. Enable pg_net for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create the Webhook Trigger Function for Edge Functions
CREATE OR REPLACE FUNCTION clipad_notify_edge_function()
RETURNS TRIGGER AS $$
BEGIN
    -- We use pg_net to call the Edge Function.
    -- Supabase provides a convention to call edge functions if you know the project URL.
    -- However, it is much more robust to use Supabase's Database Webhooks feature natively.
    -- Since we're doing this via migration, we can construct the URL using the built-in 
    -- Supabase URL environment variables if available, or fallback to a standard configuration.
    -- To ensure this works perfectly in production without hardcoding URLs, 
    -- we can use the Supabase HTTP extension `http_post` or `net.http_post`.
    
    PERFORM net.http_post(
        url := coalesce(current_setting('app.settings.edge_function_base_url', true), 'http://host.docker.internal:54321/functions/v1') || '/clipad-notification-router',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || coalesce(current_setting('app.settings.service_role_key', true), 'anon')
        ),
        body := jsonb_build_object('record', row_to_json(NEW))
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Fail silently so we don't block the actual database insert
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the Trigger on clipad_notifications
DROP TRIGGER IF EXISTS clipad_notification_webhook_trigger ON clipad_notifications;
CREATE TRIGGER clipad_notification_webhook_trigger
    AFTER INSERT ON clipad_notifications
    FOR EACH ROW
    EXECUTE FUNCTION clipad_notify_edge_function();


-- 4. Additional Missing Triggers: Action Items
CREATE OR REPLACE FUNCTION clipad_notify_action_item()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify if assigned_to is set and it's a new assignment
    IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
        INSERT INTO clipad_notifications (user_id, title, message, type, link)
        VALUES (
            NEW.assigned_to,
            'New Action Item Assigned',
            'You have been assigned a new action item: ' || NEW.title,
            'action_item',
            '/clipad/dashboard'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clipad_action_item_trigger ON clipad_action_items;
CREATE TRIGGER clipad_action_item_trigger
    AFTER INSERT OR UPDATE ON clipad_action_items
    FOR EACH ROW
    EXECUTE FUNCTION clipad_notify_action_item();


-- 5. Additional Missing Triggers: Video Comments
CREATE OR REPLACE FUNCTION clipad_notify_video_comment()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
    v_title TEXT;
BEGIN
    SELECT creator_id, title INTO owner_id, v_title FROM clipad_videos WHERE id = NEW.video_id;
    
    -- Don't notify if the commenter is the creator
    IF owner_id != NEW.user_id THEN
        INSERT INTO clipad_notifications (user_id, title, message, type, link)
        VALUES (
            owner_id,
            'New Comment on Video',
            'Someone commented on your video: ' || COALESCE(v_title, 'Untitled Video'),
            'video_comment',
            '/clipad/watch/' || NEW.video_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clipad_video_comment_trigger ON clipad_video_comments;
CREATE TRIGGER clipad_video_comment_trigger
    AFTER INSERT ON clipad_video_comments
    FOR EACH ROW
    EXECUTE FUNCTION clipad_notify_video_comment();
