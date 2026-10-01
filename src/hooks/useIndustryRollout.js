import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

// Default rollout: all known industries enabled
const DEFAULT_ROLLOUT = {
  law: true,
  school: true,
  hospital: true,
  hotel: true,
  logistics: true,
  insurance: true,
  religion: true,
  hr: true,
  retail: true,
  real_estate: true,
};

let _cache = null;
let _cacheTs = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * useIndustryRollout
 *
 * Returns the current industry rollout state from platform_config.
 * Super admins always get a full-enabled map (they see everything).
 *
 * @param {object} user - current auth user (used to detect super_admin)
 * @returns {{ enabledIndustries: object, isIndustryEnabled: function, loading: boolean, refetch: function }}
 */
export function useIndustryRollout(user) {
  const isSuperAdmin = user?.role === 'super_admin';
  const [rollout, setRollout] = useState(_cache || DEFAULT_ROLLOUT);
  const [loading, setLoading] = useState(!_cache);

  const fetchRollout = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && _cache && now - _cacheTs < CACHE_TTL_MS) {
      setRollout(_cache);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('platform_config')
        .select('value')
        .eq('key', 'industry_rollout')
        .single();

      if (!error && data?.value) {
        _cache = data.value;
        _cacheTs = now;
        setRollout(data.value);
      } else {
        // Fallback: all enabled
        setRollout(DEFAULT_ROLLOUT);
      }
    } catch (err) {
      console.warn('[useIndustryRollout] Failed to fetch rollout config, defaulting to all enabled:', err);
      setRollout(DEFAULT_ROLLOUT);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchRollout();
  }, [fetchRollout]);

  const isIndustryEnabled = useCallback(
    (industryKey) => {
      if (isSuperAdmin) return true;
      // If industry not in config, default to enabled
      return rollout[industryKey] !== false;
    },
    [rollout, isSuperAdmin]
  );

  return {
    enabledIndustries: rollout,
    isIndustryEnabled,
    loading,
    refetch: () => fetchRollout(true),
  };
}

/**
 * saveIndustryRollout
 *
 * Saves the full rollout state to platform_config.
 * Only super admins can do this (enforced by RLS).
 *
 * @param {object} rolloutState - { law: true, school: false, ... }
 */
export async function saveIndustryRollout(rolloutState) {
  const { error } = await supabase
    .from('platform_config')
    .upsert(
      { key: 'industry_rollout', value: rolloutState, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

  if (!error) {
    // Bust the cache
    _cache = rolloutState;
    _cacheTs = Date.now();
  }

  return { error };
}
