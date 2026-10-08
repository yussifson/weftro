// src/lib/clipadOrganizationalAnalyticsService.js
import { supabase } from '@/api/supabaseClient';
import { resolveIntelligenceContext, filterAuthorizedMemories, filterAuthorizedMoments } from './clipadIntelligenceGovernanceService';
import { isV3FeatureEnabled, V3_FLAGS } from './clipadV3Flags';

/**
 * Derives aggregate metrics and organizational health scores for a given time window.
 * All metrics are strictly derived from governance-authorized data.
 */
export async function getOrganizationalMetrics(user, timeRangeDays = 30) {
  if (!isV3FeatureEnabled(V3_FLAGS.ORGANIZATIONAL_ANALYTICS_ENABLED, user)) {
    throw new Error('Organizational Analytics is disabled.');
  }

  const govCtx = await resolveIntelligenceContext(user);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timeRangeDays);
  const cutoffIso = cutoffDate.toISOString();

  // Fetch raw records in time window
  const [memoriesRes, momentsRes, actionsRes] = await Promise.all([
    supabase
      .from('clipad_v3_organizational_memory')
      .select('id, tier, space_id, created_at, owner_id')
      .eq('company_id', user.company_id)
      .gte('created_at', cutoffIso),
      
    supabase
      .from('clipad_v3_smart_moments')
      .select('id, visibility, team_space_id, moment_type, status, created_at, owner_id')
      .eq('company_id', user.company_id)
      .gte('created_at', cutoffIso),

    // Phase 9 leverages existing tasks/actions if available; here we mock structure via moments
    // We treat 'ACTION' moments as organizational actions.
    Promise.resolve({ data: [] }) // Stand-in for explicit action table if it exists
  ]);

  // Apply Phase 8 Governance! 
  // We NEVER aggregate metrics on unauthorized data.
  const authorizedMemories = filterAuthorizedMemories(memoriesRes.data || [], govCtx);
  const authorizedMoments = filterAuthorizedMoments(momentsRes.data || [], govCtx);

  // Calculate Base Metrics
  const metrics = {
    activity: {
      newMemories: authorizedMemories.length,
      smartMoments: authorizedMoments.length,
      decisions: authorizedMoments.filter(m => m.moment_type === 'DECISION').length,
      actionsDetected: authorizedMoments.filter(m => m.moment_type === 'ACTION').length,
      blockers: authorizedMoments.filter(m => m.moment_type === 'BLOCKER' || m.moment_type === 'RISK').length,
    },
    collaboration: {
      activeSpaces: new Set(authorizedMemories.map(m => m.space_id).filter(Boolean)).size,
    }
  };

  // Calculate Health Scores based on authorized evidence
  let executionHealth = 100;
  const executionReasons = [];
  
  if (metrics.activity.actionsDetected > 0) {
    const unresolvedActions = authorizedMoments.filter(m => m.moment_type === 'ACTION' && m.status !== 'resolved').length;
    if (unresolvedActions > 0) {
      executionHealth -= (unresolvedActions * 5);
      executionReasons.push(\`\${unresolvedActions} unresolved actions\`);
    }
  }

  if (metrics.activity.blockers > 0) {
    executionHealth -= (metrics.activity.blockers * 10);
    executionReasons.push(\`\${metrics.activity.blockers} active blockers\`);
  }

  if (executionReasons.length === 0 && metrics.activity.actionsDetected === 0 && metrics.activity.blockers === 0) {
    executionHealth = null; // Insufficient data
  }

  return {
    timeRangeDays,
    metrics,
    health: {
      execution: {
        score: executionHealth !== null ? Math.max(0, executionHealth) : 'Insufficient data',
        reasons: executionHealth !== null ? executionReasons : ['Not enough execution data in this time window.']
      }
    }
  };
}
