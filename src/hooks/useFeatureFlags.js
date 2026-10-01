import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

// Default flag states: all V2/OmniCore feature flags default to off/false
const DEFAULT_FEATURE_FLAGS = {
  slate_v2_enabled: false,
  omnicore_enabled: false,
};

let _flagCache = null;
let _flagCacheTs = 0;
const CACHE_TTL_MS = 60_000; // 1 minute cache TTL

/**
 * useFeatureFlags
 *
 * Reads feature flag states from Supabase platform_config table.
 * Defaults slate_v2_enabled and omnicore_enabled to false.
 * Dynamic runtime toggleable without requiring a application redeploy.
 *
 * @returns {{ flags: object, isFeatureEnabled: function, loading: boolean, refetch: function }}
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState(_flagCache || DEFAULT_FEATURE_FLAGS);
  const [loading, setLoading] = useState(!_flagCache);

  const fetchFlags = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && _flagCache && now - _flagCacheTs < CACHE_TTL_MS) {
      setFlags(_flagCache);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('platform_config')
        .select('key, value')
        .in('key', ['feature_flags', 'slate_v2_enabled', 'omnicore_enabled']);

      if (!error && data) {
        const fetchedMap = { ...DEFAULT_FEATURE_FLAGS };
        data.forEach(item => {
          if (item.key === 'feature_flags' && typeof item.value === 'object') {
            Object.assign(fetchedMap, item.value);
          } else if (item.key === 'slate_v2_enabled') {
            fetchedMap.slate_v2_enabled = Boolean(item.value);
          } else if (item.key === 'omnicore_enabled') {
            fetchedMap.omnicore_enabled = Boolean(item.value);
          }
        });

        _flagCache = fetchedMap;
        _flagCacheTs = now;
        setFlags(fetchedMap);
      } else {
        setFlags(DEFAULT_FEATURE_FLAGS);
      }
    } catch (err) {
      console.warn('[useFeatureFlags] Failed to fetch flags from platform_config, defaulting to off:', err);
      setFlags(DEFAULT_FEATURE_FLAGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const isFeatureEnabled = useCallback(
    (flagKey) => {
      return flags[flagKey] === true;
    },
    [flags]
  );

  return {
    flags,
    isFeatureEnabled,
    loading,
    refetch: () => fetchFlags(true),
  };
}

/**
 * setFeatureFlag
 *
 * Updates a feature flag in platform_config table.
 *
 * @param {string} flagKey - Flag key e.g. 'slate_v2_enabled'
 * @param {boolean} value - Target state
 */
export async function setFeatureFlag(flagKey, value) {
  const { error } = await supabase
    .from('platform_config')
    .upsert(
      { key: flagKey, value: Boolean(value), updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

  if (!error && _flagCache) {
    _flagCache[flagKey] = Boolean(value);
    _flagCacheTs = Date.now();
  }

  return { error };
}
