/**
 * industryVisibility.js
 *
 * This module provides helpers for fetching visible industries and plans.
 * It defers to the platform_config table for rollout state and the
 * subscription_plans table for plan visibility.
 *
 * The bad commits from PR #71 and #72 expected this file to exist but
 * never created it properly, causing only 4 fallback industries to show.
 * This implementation replaces that approach cleanly using platform_config.
 */

import { supabase } from '@/api/supabaseClient';
import { INDUSTRIES } from '@/config/industries';

// All selectable top-level industry keys (no sub-types like highschool/university)
export const ALL_INDUSTRY_KEYS = [
  'law', 'school', 'hospital', 'hotel', 'logistics',
  'insurance', 'religion', 'hr', 'retail', 'real_estate',
  'pharmacy', 'optavel',
];

/**
 * getVisibleIndustries
 *
 * Returns an object of { key: industryConfig } for all industries
 * that are enabled in platform_config (or all if fetch fails).
 *
 * @param {boolean} isSuperAdmin - super admins always see all
 * @param {string} userId - not used, kept for API compat
 * @returns {object} e.g. { law: { name: 'Law Firm', icon: '⚖️' }, ... }
 */
export async function getVisibleIndustries(isSuperAdmin = false, userId = null) {
  // Super admins always see everything
  if (isSuperAdmin) {
    return buildIndustryMap(ALL_INDUSTRY_KEYS);
  }

  try {
    const { data, error } = await supabase
      .from('platform_config')
      .select('value')
      .eq('key', 'industry_rollout')
      .single();

    if (!error && data?.value) {
      const rollout = data.value;
      // Only include keys that are enabled (true) or not mentioned (default on)
      let enabledKeys = ALL_INDUSTRY_KEYS.filter(k => rollout[k] !== false);
      return buildIndustryMap(enabledKeys);
    }
  } catch (err) {
    console.warn('[getVisibleIndustries] Could not fetch rollout config, showing all:', err);
  }

  // Fallback: show all industries
  return buildIndustryMap(ALL_INDUSTRY_KEYS);
}

/**
 * getVisiblePlans
 *
 * Returns subscription plans filtered for the given market tier.
 * Hides the test plan for regular users; shows it for super admins.
 *
 * @param {string} tier - market tier string
 * @param {string} userId - not used, kept for API compat
 * @param {boolean} isSuperAdmin - if true, includes test plan
 */
export async function getVisiblePlans(tier, userId = null, isSuperAdmin = false) {
  try {
    let query = supabase
      .from('subscription_plans')
      .select('*')
      .eq('market_tier', tier)
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    const activePlans = data || [];
    const hasFree = activePlans.some(p => p.price_monthly === 0);
    if (!hasFree && tier !== 'law') {
      activePlans.unshift({
        id: 'free',
        name: 'Free',
        price_monthly: 0,
        limits: { users: 1, ai_credits_monthly: 100 }
      });
    }

    return activePlans.filter(p => {
      // Hide test plan from regular users
      if (!isSuperAdmin) {
        const name = String(p.name || '').trim().toLowerCase();
        if (name === 'test plan' || p.paystack_plan_code === 'PLN_3o7pbbfvw6qf9dz') {
          return false;
        }
      }
      return true;
    });
  } catch (err) {
    console.error('[getVisiblePlans] Failed:', err);
    return [];
  }
}

// Helper: build { key: { name, icon } } from array of keys
function buildIndustryMap(keys) {
  const result = {};
  for (const key of keys) {
    if (INDUSTRIES[key]) {
      result[key] = INDUSTRIES[key];
    }
  }
  return result;
}
