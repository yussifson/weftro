import { supabase } from '@/api/supabaseClient';
import { powerSync } from "@/api/PowerSyncConnector";
import { base44 } from '@/api/base44Client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { useAuth } from '@/lib/AuthContext';

export function useNotifications() {
  const companyId = useCompanyId();
  const { user: currentUser } = useAuth();

  const notify = async ({ recipientEmail, title, message, type = 'GENERAL', data = {} }) => {
    try {
      // 1. Save In-App Notification
      if (companyId && recipientEmail) {
        await base44.entities.Notification.create({
          company_id: companyId,
          recipient_email: recipientEmail,
          title,
          message,
          type,
          is_read: false
        });
      }

      // 2. Trigger Email via Edge Function
      const { data: resData, error } = await supabase.functions.invoke('send-notification', {
        body: {
          recipientEmail,
          title,
          message,
          type,
          data,
          senderName: currentUser?.full_name || 'Slate System'
        }
      });
      
      if (error) console.error("Edge function email error:", error);
      return resData;
    } catch (err) {
      console.error("Notify failed:", err);
    }
  };

  return { notify };
}
