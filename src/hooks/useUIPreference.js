/**
 * useUIPreference - persists a boolean UI preference (e.g. sidebar collapsed state)
 * to the `preferences` JSONB column in the `profiles` Supabase table.
 *
 * The value is also mirrored in localStorage as a fast initial read
 * so there is no flicker before the Supabase fetch resolves.
 *
 * Usage:
 *   const [collapsed, setCollapsed] = useUIPreference(user, 'chatSidebarCollapsed', false);
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

export function useUIPreference(user, preferenceKey, defaultValue = false) {
  // Initialize from localStorage for instant value (no flicker)
  const localKey = user?.id ? `pref_${user.id}_${preferenceKey}` : null;

  const [value, setValue] = useState(() => {
    if (!localKey) return defaultValue;
    const stored = localStorage.getItem(localKey);
    if (stored !== null) return JSON.parse(stored);
    return defaultValue;
  });

  // On mount (or when user becomes available), fetch from Supabase
  useEffect(() => {
    if (!user?.id) return;

    const fetchPref = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .single();

      if (error || !data) return;

      let prefs = {};
      try {
        prefs = typeof data.preferences === 'string'
          ? JSON.parse(data.preferences)
          : (data.preferences || {});
      } catch { /* ignore parse errors */ }

      if (preferenceKey in prefs) {
        const remoteValue = prefs[preferenceKey];
        setValue(remoteValue);
        // Mirror to localStorage
        if (localKey) localStorage.setItem(localKey, JSON.stringify(remoteValue));
      }
    };

    fetchPref();
  }, [user?.id]);

  // Setter: updates state, localStorage, and Supabase
  const setPref = useCallback(async (newValue) => {
    const resolvedValue = typeof newValue === 'function' ? newValue(value) : newValue;

    setValue(resolvedValue);

    // Mirror to localStorage immediately
    if (localKey) localStorage.setItem(localKey, JSON.stringify(resolvedValue));

    // Persist to Supabase asynchronously
    if (!user?.id) return;
    try {
      // Read current prefs first to avoid overwriting other keys
      const { data } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .single();

      let prefs = {};
      try {
        prefs = typeof data?.preferences === 'string'
          ? JSON.parse(data.preferences)
          : (data?.preferences || {});
      } catch { /* ignore */ }

      prefs[preferenceKey] = resolvedValue;

      await supabase
        .from('profiles')
        .update({ preferences: JSON.stringify(prefs) })
        .eq('id', user.id);
    } catch (err) {
      console.error('useUIPreference: failed to save to Supabase', err);
    }
  }, [user?.id, preferenceKey, localKey, value]);

  return [value, setPref];
}
