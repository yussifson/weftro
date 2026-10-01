-- Migration: Add Login Alert Notification Trigger for CliPad

CREATE OR REPLACE FUNCTION clipad_notify_login()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if last_sign_in_at was updated
    IF NEW.last_sign_in_at IS NOT NULL AND (OLD.last_sign_in_at IS NULL OR NEW.last_sign_in_at != OLD.last_sign_in_at) THEN
        INSERT INTO clipad_notifications (user_id, title, message, type, link)
        VALUES (
            NEW.id,
            'New Login Detected',
            'Your account was just logged into. If this wasn''t you, please secure your account immediately.',
            'login_alert',
            '/clipad/settings'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS clipad_login_alert_trigger ON auth.users;
CREATE TRIGGER clipad_login_alert_trigger
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION clipad_notify_login();
