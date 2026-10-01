import { supabase } from '@/api/supabaseClient';
import { useState } from 'react';
import { powerSync } from "@/api/PowerSyncConnector";
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'react-hot-toast';

export const useNotifications = () => {
  const [isNotifying, setIsNotifying] = useState(false);
  const { session } = useAuth();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';

  const notifyTeam = async ({ companyId, provider, message, channel, recipientPhone }) => {
    setIsNotifying(true);

    if (!navigator.onLine) {
      setTimeout(() => setIsNotifying(false), 500);
      return { success: true, offline: true };
    }

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/notify-team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          companyId,
          provider, 
          message,
          channel,
          recipientPhone
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to send notification');
      }

      return data; 
    } catch (error) {
      console.error("Notification Error:", error);
      // We don't always want to toast notifications since they run in background, 
      // but keeping it here for debug/explicit triggers
      throw error;
    } finally {
      setIsNotifying(false);
    }
  };

  return { notifyTeam, isNotifying };
};
