// src/lib/clipadV3Flags.js
// Clipad V3 Feature Flag Management System
// Non-destructive extension integrating with subscription tiers & environment overrides.

import { supabase } from '@/api/supabaseClient';
import { getUserPlan } from '@/lib/clipadPricing';

export const V3_FLAGS = {
  CLIPAD_V3_ENABLED: 'clipad_v3_enabled',
  ORGANIZATIONAL_MEMORY_ENABLED: 'organizational_memory_enabled',
  INTELLIGENCE_V3_ENABLED: 'intelligence_v3_enabled',
  SMART_MOMENTS_ENABLED: 'smart_moments_enabled',
  CONTEXT_SESSIONS_ENABLED: 'context_sessions_enabled',
  CAPTURE_V3_ENABLED: 'capture_v3_enabled',
  BROWSER_CAPTURE_ENABLED: 'browser_capture_enabled',
  DESKTOP_CAPTURE_ENABLED: 'desktop_capture_enabled',
  CONNECT_ENABLED: 'connect_enabled',
  API_CONNECT_ENABLED: 'api_connect_enabled',
  WEBHOOKS_ENABLED: 'webhooks_enabled',
  MCP_ENABLED: 'mcp_enabled',
  ADVANCED_SEARCH_ENABLED: 'advanced_search_enabled',
  KNOWLEDGE_GRAPH_ENABLED: 'knowledge_graph_enabled',
  ROLE_AWARE_INTELLIGENCE_ENABLED: 'role_aware_intelligence_enabled',
  ACTION_CENTER_ENABLED: 'action_center_enabled',
  AUTOMATION_V3_ENABLED: 'automation_v3_enabled',
  ORGANIZATIONAL_ANALYTICS_ENABLED: 'organizational_analytics_enabled',
  ORGANIZATIONAL_LEARNING_ENABLED: 'organizational_learning_enabled',
  DOCUMENT_CHUNKING_INGESTION_ENABLED: 'document_chunking_ingestion_enabled',
};

// Default flag states for safe V3 staged rollout
const DEFAULT_V3_FLAG_DEFAULTS = {
  [V3_FLAGS.CLIPAD_V3_ENABLED]: true,
  [V3_FLAGS.ORGANIZATIONAL_MEMORY_ENABLED]: true,
  [V3_FLAGS.INTELLIGENCE_V3_ENABLED]: true,
  [V3_FLAGS.SMART_MOMENTS_ENABLED]: true, // Active
  [V3_FLAGS.CONTEXT_SESSIONS_ENABLED]: true, // Phase 5 Completed
  [V3_FLAGS.CAPTURE_V3_ENABLED]: true,
  [V3_FLAGS.BROWSER_CAPTURE_ENABLED]: true,
  [V3_FLAGS.DESKTOP_CAPTURE_ENABLED]: false,
  [V3_FLAGS.CONNECT_ENABLED]: true,
  [V3_FLAGS.API_CONNECT_ENABLED]: true,
  [V3_FLAGS.WEBHOOKS_ENABLED]: true,
  [V3_FLAGS.MCP_ENABLED]: true, // Active
  [V3_FLAGS.ADVANCED_SEARCH_ENABLED]: true,
  [V3_FLAGS.KNOWLEDGE_GRAPH_ENABLED]: true,
  [V3_FLAGS.ROLE_AWARE_INTELLIGENCE_ENABLED]: true,
  [V3_FLAGS.ACTION_CENTER_ENABLED]: true,
  [V3_FLAGS.AUTOMATION_V3_ENABLED]: true, // Phase 9
  [V3_FLAGS.ORGANIZATIONAL_ANALYTICS_ENABLED]: true,
  [V3_FLAGS.ORGANIZATIONAL_LEARNING_ENABLED]: true,
  [V3_FLAGS.DOCUMENT_CHUNKING_INGESTION_ENABLED]: false, // Phase 4: Disabled by default for production safety
};

/**
 * Checks if a specific V3 feature flag is enabled for a given user/organization context.
 */
export function isV3FeatureEnabled(flagKey, user = null) {
  if (!flagKey) return false;

  // 1. Check environment variable override
  const envKey = `VITE_FLAG_${flagKey.toUpperCase()}`;
  if (import.meta.env && import.meta.env[envKey] !== undefined) {
    return import.meta.env[envKey] === 'true' || import.meta.env[envKey] === '1';
  }

  // 2. Super admins automatically bypass staged limits
  const role = user?.role || user?.user_metadata?.role;
  if (role === 'super_admin') {
    return true;
  }

  // 3. Fallback to default flag state
  return DEFAULT_V3_FLAG_DEFAULTS[flagKey] ?? false;
}

/**
 * Async fetcher for database-backed V3 flag overrides per company.
 */
export async function getCompanyV3Flags(companyId) {
  if (!companyId) return DEFAULT_V3_FLAG_DEFAULTS;

  try {
    const { data, error } = await supabase
      .from('clipad_v3_feature_flags')
      .select('flag_key, is_enabled')
      .eq('company_id', companyId);

    if (error || !data) return DEFAULT_V3_FLAG_DEFAULTS;

    const merged = { ...DEFAULT_V3_FLAG_DEFAULTS };
    data.forEach(row => {
      merged[row.flag_key] = row.is_enabled;
    });
    return merged;
  } catch {
    return DEFAULT_V3_FLAG_DEFAULTS;
  }
}
