// src/lib/clipadPricing.js

export const PLAN_LIMITS = {
  free: {
    maxParticipants: 10,
    maxVideoRecordingsPerMonth: 10,
    maxStorageGB: 5,
    maxTeamSpaces: 5,
    maxAsyncVideoDurationSeconds: 15 * 60, // 15 minutes limit on free
    hasAdvancedAI: false,
    hasAdvancedAnalytics: false,
    hasSmartFollowUps: false,
    hasCustomIntegrations: false,
    hasSLA: false,
    hasBrandedRooms: false,
    hasComplianceRecording: false,
    hasVideoDownload: true,
  },
  pro: {
    maxParticipants: 25,
    maxVideoRecordingsPerMonth: Infinity,
    maxStorageGB: 100,
    maxTeamSpaces: Infinity,
    maxAsyncVideoDurationSeconds: 60 * 60, // 1 hour
    hasAdvancedAI: true,
    aiTokens: 50000,
    hasAdvancedAnalytics: true,
    hasSmartFollowUps: true,
    hasCustomIntegrations: false,
    hasSLA: false,
    hasBrandedRooms: true,
    hasComplianceRecording: false,
    hasVideoDownload: true,
  },
  enterprise: {
    maxParticipants: 100,
    maxVideoRecordingsPerMonth: Infinity,
    maxStorageGB: 1000,
    maxTeamSpaces: Infinity,
    maxAsyncVideoDurationSeconds: Infinity,
    hasAdvancedAI: true,
    aiTokens: 200000,
    hasAdvancedAnalytics: true,
    hasEnterpriseAnalytics: true,
    hasSmartFollowUps: true,
    hasCustomIntegrations: true,
    hasSLA: true,
    hasBrandedRooms: true,
    hasComplianceRecording: true,
    hasVideoDownload: true,
  },
  custom: {
    maxParticipants: Infinity,
    maxVideoRecordingsPerMonth: Infinity,
    maxStorageGB: Infinity,
    maxTeamSpaces: Infinity,
    maxAsyncVideoDurationSeconds: Infinity,
    hasAdvancedAI: true,
    aiTokens: Infinity,
    hasAdvancedAnalytics: true,
    hasEnterpriseAnalytics: true,
    hasSmartFollowUps: true,
    hasCustomIntegrations: true,
    hasSLA: true,
    hasBrandedRooms: true,
    hasComplianceRecording: true,
    hasVideoDownload: true,
  }
};

/**
 * Returns the current plan for a user.
 * Evaluates super admin role, explicit clipad_plan, and subscription_plan.
 */
export function getUserPlan(user) {
  if (!user) return 'free';
  if (typeof user === 'string') return user;

  // Super admins automatically get full Enterprise access
  const role = user?.role || user?.user_metadata?.role;
  if (['super_admin', 'admin'].includes(role)) return 'enterprise';

  // Check clipad_plan if set to custom, enterprise, or pro
  const clipadPlan = (user?.clipad_plan || '').toLowerCase().trim();
  if (clipadPlan === 'custom') return 'custom';
  if (clipadPlan === 'enterprise' || clipadPlan === 'pro') return clipadPlan;

  // Evaluate company subscription_plan
  const planStr = (user?.subscription_plan || user?.subscription_tier || '').toLowerCase().trim();
  if (planStr.includes('custom')) return 'custom';
  if (planStr.includes('enterprise')) return 'enterprise';
  if (planStr.includes('pro') || planStr.includes('professional') || planStr.includes('firm_plus') || planStr.includes('starter')) return 'pro';

  return 'free';
}

/**
 * Async function: fetches the real plan for a company from the DB.
 * Checks companies table subscription_plan & pricing_tag, then company_subscriptions.
 * Returns 'free' | 'pro' | 'enterprise' | 'custom'
 */
export async function getCompanyPlan(supabase, companyId) {
  if (!companyId) return 'free';
  try {
    const { data: companyData } = await supabase
      .from('companies')
      .select('subscription_plan, pricing_tag_id, clipad_pricing_tags(name)')
      .eq('id', companyId)
      .maybeSingle();

    if (companyData) {
      const planStr = (companyData.subscription_plan || '').toLowerCase().trim();
      const tagName = (companyData.clipad_pricing_tags?.name || '').toLowerCase().trim();

      if (planStr.includes('custom') || tagName.includes('custom')) return 'custom';
      if (planStr.includes('enterprise') || tagName.includes('enterprise')) return 'enterprise';
      if (planStr.includes('pro') || planStr.includes('professional') || planStr.includes('firm_plus') || planStr.includes('starter') || tagName.includes('pro')) return 'pro';
    }

    const { data: subData } = await supabase
      .from('company_subscriptions')
      .select('plan_id, status')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .maybeSingle();

    if (subData?.plan_id) {
      const subPlan = subData.plan_id.toLowerCase();
      if (subPlan.includes('custom')) return 'custom';
      if (subPlan.includes('enterprise')) return 'enterprise';
      if (subPlan.includes('pro') || subPlan.includes('professional') || subPlan.includes('firm_plus') || subPlan.includes('starter')) return 'pro';
    }

    return 'free';
  } catch {
    return 'free';
  }
}

export function getPlanLimits(user) {
  const plan = getUserPlan(user);
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export function hasFeature(user, featureKey) {
  const limits = getPlanLimits(user);
  return limits[featureKey] === true;
}

export function getLimit(user, limitKey) {
  const limits = getPlanLimits(user);
  return limits[limitKey];
}
