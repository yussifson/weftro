import { base44 } from '@/api/base44Client';


/**
 * Universal Notification Engine
 * 
 * Writes directly to the PowerSync `notifications` table for instant local feedback 
 * and guaranteed offline sync. When connectivity is restored, these sync to Supabase 
 * where Edge Functions can optionally push them to email (Novu/Resend).
 */
export const NotificationService = {
  /**
   * Dispatch a new notification to a specific user.
   * 
   * @param {Object} params
   * @param {string} params.companyId - The company ID.
   * @param {string} params.recipientEmail - The email of the receiving user.
   * @param {string} params.title - Short summary (e.g. 'Task Assigned').
   * @param {string} params.message - Detailed body.
   * @param {string} [params.type='system'] - 'system', 'mention', 'alert', 'task', etc.
   * @param {string} [params.relatedId] - Optional link/ID (e.g. '/tasks/123').
   * @param {string} [params.createdBy] - Optional email of the sender.
   */
  emit: async ({ companyId, recipientEmail, title, message, type = 'other', relatedId = null, createdBy = 'system' }) => {
    try {
      if (!companyId || !recipientEmail) {
        console.warn('NotificationService: companyId and recipientEmail are required.');
        return;
      }

      const payload = {
        id: crypto.randomUUID(),
        company_id: companyId,
        recipient_email: recipientEmail,
        title,
        message,
        type,
        created_by: createdBy,
        is_read: 'false',
        email_sent: 'false',
        created_at: new Date().toISOString()
      };
      
      if (relatedId) payload.related_id = relatedId;

      await base44.entities.Notification.create(payload);
      
    } catch (e) {
      console.error('Failed to dispatch notification:', e);
    }
  }
};
