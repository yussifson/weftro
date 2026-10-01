import { supabase } from '@/api/supabaseClient';
import { powerSync } from "@/api/PowerSyncConnector";

/**
 * Omnichannel Notification Service
 * Sends notifications via In-App (Supabase), Email (Resend), and SMS (Twilio).
 * This now uses a secure Supabase Edge Function to avoid CORS and exposed keys.
 */

export const NotificationService = {
  
  /**
   * Send a notification through multiple channels securely via Edge Function.
   * @param {Object} params
   * @param {string} params.companyId - The company ID.
   * @param {string} params.recipientEmail - Required for in-app and email.
   * @param {string} params.recipientName - Name of the recipient.
   * @param {string} params.recipientPhone - Required for SMS.
   * @param {string} params.title - Notification title / Email Subject.
   * @param {string} params.message - Body of the notification.
   * @param {string} params.type - 'info', 'alert', 'success'.
   * @param {string[]} params.channels - Array containing 'in-app', 'email', 'sms'. Default ['in-app'].
   */
  async send({ companyId, recipientEmail, recipientName, recipientPhone, title, message, type = 'info', channels = ['in-app'] }) {
    try {
      const { data, error } = await supabase.functions.invoke('notify-omnichannel', {
        body: {
          companyId,
          recipientEmail,
          recipientName,
          recipientPhone,
          title,
          message,
          type,
          channels
        }
      });

      if (error) {
        console.error("Failed to invoke notify-omnichannel edge function:", error);
        return { inApp: { success: false }, email: { success: false }, sms: { success: false }, error };
      }

      return data;
    } catch (err) {
      console.error("Omnichannel Notification Error:", err);
      return { inApp: { success: false }, email: { success: false }, sms: { success: false }, error: err };
    }
  }
};
