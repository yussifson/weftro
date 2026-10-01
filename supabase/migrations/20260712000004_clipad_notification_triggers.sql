-- Migration: Add Notification Triggers for CliPad

-- 1. Notify Meeting Host when AI Processing Completes
CREATE OR REPLACE FUNCTION clipad_notify_ai_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ai_status = 'completed' AND OLD.ai_status != 'completed' THEN
        INSERT INTO clipad_notifications (user_id, title, message, type, link)
        VALUES (
            NEW.host_id,
            'AI Summary Ready',
            'The transcript and AI summary for your meeting is now ready.',
            'ai_summary',
            '/clipad/meetings/' || NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clipad_ai_completion_trigger ON clipad_meeting_records;
CREATE TRIGGER clipad_ai_completion_trigger
    AFTER UPDATE ON clipad_meeting_records
    FOR EACH ROW
    EXECUTE FUNCTION clipad_notify_ai_completion();


-- 2. Notify when added to a Team Space
CREATE OR REPLACE FUNCTION clipad_notify_space_member()
RETURNS TRIGGER AS $$
DECLARE
    space_name TEXT;
BEGIN
    SELECT name INTO space_name FROM clipad_team_spaces WHERE id = NEW.space_id;
    
    INSERT INTO clipad_notifications (user_id, title, message, type, link)
    VALUES (
        NEW.user_id,
        'Added to Team Space',
        'You have been added to the team space: ' || space_name,
        'space_invite',
        '/clipad/spaces/' || NEW.space_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clipad_space_member_trigger ON clipad_space_members;
CREATE TRIGGER clipad_space_member_trigger
    AFTER INSERT ON clipad_space_members
    FOR EACH ROW
    EXECUTE FUNCTION clipad_notify_space_member();


-- 3. Notify Meeting Owner when a Comment is added
CREATE OR REPLACE FUNCTION clipad_notify_meeting_comment()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
    meeting_title TEXT;
BEGIN
    SELECT host_id, title INTO owner_id, meeting_title FROM clipad_meeting_records WHERE id = NEW.meeting_id;
    
    -- Don't notify if the commenter is the host
    IF owner_id != NEW.user_id THEN
        INSERT INTO clipad_notifications (user_id, title, message, type, link)
        VALUES (
            owner_id,
            'New Comment on Meeting',
            'Someone commented on your meeting: ' || meeting_title,
            'comment',
            '/clipad/meetings/' || NEW.meeting_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clipad_meeting_comment_trigger ON clipad_meeting_comments;
CREATE TRIGGER clipad_meeting_comment_trigger
    AFTER INSERT ON clipad_meeting_comments
    FOR EACH ROW
    EXECUTE FUNCTION clipad_notify_meeting_comment();
