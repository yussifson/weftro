// src/lib/clipadAutomationService.js
import { supabase } from '@/api/supabaseClient';
import { isV3FeatureEnabled, V3_FLAGS } from './clipadV3Flags';

/**
 * Phase 9 Automation Engine.
 * Highly constrained to prevent destructive actions.
 */
export async function evaluateEvent(eventPayload, user) {
  if (!isV3FeatureEnabled(V3_FLAGS.AUTOMATION_V3_ENABLED, user)) {
    return;
  }

  // 1. Fetch active rules for the company that match this event type
  const { data: rules } = await supabase
    .from('clipad_v3_automation_rules')
    .select('*')
    .eq('company_id', user.company_id)
    .eq('is_active', true)
    .eq('trigger_event', eventPayload.type);

  if (!rules || rules.length === 0) return;

  // 2. Evaluate and Execute (Conservative, non-destructive)
  for (const rule of rules) {
    try {
      // Check condition (mock simple JSON condition logic)
      let conditionMet = true;
      if (rule.conditions?.requires_status) {
        if (eventPayload.data?.status !== rule.conditions.requires_status) {
          conditionMet = false;
        }
      }

      if (conditionMet) {
        await executeControlledAction(rule, eventPayload, user);
      }
    } catch (err) {
      console.error(\`Automation Rule \${rule.id} failed:\`, err);
    }
  }
}

async function executeControlledAction(rule, eventPayload, user) {
  // Phase 9 Security: Automation cannot bypass permissions or do destructive tasks.
  const allowedActions = ['create_recommendation', 'notify_manager'];
  
  if (!allowedActions.includes(rule.action_type)) {
    throw new Error(\`Unauthorized automation action type: \${rule.action_type}\`);
  }

  if (rule.action_type === 'create_recommendation') {
    // Inserts a recommendation into the insights table
    await supabase.from('clipad_v3_organizational_insights').insert([{
      company_id: user.company_id,
      insight_type: 'RECOMMENDATION',
      title: rule.action_payload.title || 'Automated Recommendation',
      summary: \`Triggered by rule: \${rule.name}\`,
      confidence: 1.0,
      evidence_count: 1,
      source_ids: eventPayload.data?.id ? [eventPayload.data.id] : []
    }]);
  } else if (rule.action_type === 'notify_manager') {
    // Write an event that the notification system can pick up
    await supabase.from('clipad_v3_events').insert([{
      company_id: user.company_id,
      user_id: user.id,
      event_type: 'automation.notification.dispatched',
      source_domain: 'automation',
      payload: { message: rule.action_payload.message, target: 'manager' }
    }]);
  }
}
