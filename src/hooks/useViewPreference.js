import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

/**
 * Hook to persist view preferences (grid, list, kanban) in Supabase user metadata
 * @param {string} moduleKey - The unique key for the module (e.g. 'pharmacy_customers')
 * @param {string} defaultView - The default view to use if none is set ('grid', 'list', 'kanban')
 */
export function useViewPreference(moduleKey, defaultView = 'grid') {
  const { user } = useAuth();
  const [view, setView] = useState(defaultView);

  useEffect(() => {
    if (user?.user_metadata?.views?.[moduleKey]) {
      setView(user.user_metadata.views[moduleKey]);
    }
  }, [user, moduleKey]);

  const changeView = async (newView) => {
    setView(newView);
    if (!user) return;

    try {
      const currentViews = user.user_metadata?.views || {};
      const updatedViews = { ...currentViews, [moduleKey]: newView };

      const { error } = await supabase.auth.updateUser({
        data: { views: updatedViews }
      });

      if (error) {
        console.error('Failed to save view preference:', error);
      }
    } catch (e) {
      console.error('Failed to save view preference:', e);
    }
  };

  return [view, changeView];
}
