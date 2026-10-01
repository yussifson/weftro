-- Migration: Sync admin pricing tag assignment to company_subscriptions
-- This trigger fires whenever a company's pricing_tag_id is updated by admin.
-- It maps the tag name (Pro Tier / Enterprise Tier / etc.) to plan_id in company_subscriptions.

CREATE OR REPLACE FUNCTION sync_pricing_tag_to_subscription()
RETURNS TRIGGER AS $$
DECLARE
    tag_name TEXT;
    resolved_plan TEXT;
BEGIN
    -- If pricing_tag_id was cleared (set to NULL), downgrade to free
    IF NEW.pricing_tag_id IS NULL THEN
        resolved_plan := 'free';
    ELSE
        SELECT LOWER(name) INTO tag_name
        FROM clipad_pricing_tags
        WHERE id = NEW.pricing_tag_id;

        -- Map tag names to canonical plan IDs
        IF tag_name ILIKE '%enterprise%' THEN
            resolved_plan := 'enterprise';
        ELSIF tag_name ILIKE '%pro%' THEN
            resolved_plan := 'pro';
        ELSE
            resolved_plan := 'free';
        END IF;
    END IF;

    -- Upsert into company_subscriptions so billing page reads the correct plan
    INSERT INTO company_subscriptions (company_id, plan_id, status, updated_at)
    VALUES (NEW.id, resolved_plan, 'active', now())
    ON CONFLICT (company_id)
    DO UPDATE SET
        plan_id    = EXCLUDED.plan_id,
        status     = 'active',
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS clipad_sync_pricing_tag_trigger ON companies;
CREATE TRIGGER clipad_sync_pricing_tag_trigger
    AFTER UPDATE OF pricing_tag_id ON companies
    FOR EACH ROW
    EXECUTE FUNCTION sync_pricing_tag_to_subscription();
