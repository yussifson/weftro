import { supabase } from '@/api/supabaseClient';

/**
 * OmniNotificationService.js
 * 
 * Unified in-app and external email notification engine for CliPad / KERINT.
 * - In-App: Writes to `clipad_notifications` (triggering Supabase Realtime, audio alert, badge count, and local capacitor push)
 * - External Email: Dispatches emails branded for CliPad/KERINT with the unified Optavel sender identity
 */

const OPTAVEL_SENDER = 'KERINT by Optavel <notifications@optavel.com>';

/**
 * Generate standardized corporate HTML email template
 */
function createEmailTemplate({ title, recipientName, preheader, bodyHtml, ctaText, ctaUrl }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #006065; padding: 32px 40px; text-align: left; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header span { color: #fad503; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-top: 4px; }
    .content { padding: 40px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #0f172a; }
    .message { font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 28px; }
    .cta-container { text-align: left; margin: 32px 0; }
    .cta-btn { display: inline-block; background: #006065; color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,96,101,0.25); }
    .footer { background: #f1f5f9; padding: 24px 40px; font-size: 12px; color: #64748b; line-height: 1.5; border-top: 1px solid #e2e8f0; }
    .footer a { color: #006065; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>KERINT</h1>
      <span>CliPad Intelligence Platform</span>
    </div>
    <div class="content">
      <div class="greeting">Hello ${recipientName || 'there'},</div>
      <div class="message">
        ${bodyHtml}
      </div>
      ${ctaText && ctaUrl ? `
      <div class="cta-container">
        <a href="${ctaUrl}" class="cta-btn" target="_blank">${ctaText}</a>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0;">This notification was delivered by the <strong>Optavel Communications System</strong> on behalf of your workspace.</p>
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} Optavel Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export const OmniNotificationService = {

  /**
   * Universal notification dispatcher
   * @param {Object} options
   * @param {string} [options.userId] - The recipient user ID in Supabase Auth
   * @param {string} [options.recipientEmail] - The email address
   * @param {string} [options.recipientName] - Display name
   * @param {string} options.type - 'meeting_invite' | 'task_assigned' | 'chat_mention' | 'video_shared' | 'space_invite' | 'system'
   * @param {string} options.title - Short summary
   * @param {string} options.message - Detailed body
   * @param {string} [options.link] - Navigation link inside the application (e.g. /join/xxx or /spaces/yyy)
   * @param {string} [options.sourceId] - ID of the originating record
   * @param {boolean} [options.sendEmail=true] - Whether to also dispatch via Optavel external email
   * @param {string} [options.ctaText] - Label on the email CTA button
   * @param {string} [options.emailBodyHtml] - Custom HTML override for the email body
   */
  async notify({
    userId,
    recipientEmail,
    recipientName = '',
    type = 'system',
    title,
    message,
    link = null,
    sourceId = null,
    sendEmail = true,
    ctaText = 'View in KERINT',
    emailBodyHtml = null
  }) {
    let resolvedUserId = userId;
    let resolvedEmail = recipientEmail;
    let resolvedName = recipientName;

    try {
      // 1. Resolve missing identifiers if only email or only userId was provided
      if (resolvedUserId && !resolvedEmail) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', resolvedUserId)
          .maybeSingle();

        if (profile) {
          resolvedEmail = profile.email;
          if (!resolvedName) resolvedName = profile.full_name;
        }
      } else if (!resolvedUserId && resolvedEmail) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('email', resolvedEmail)
          .maybeSingle();

        if (profile) {
          resolvedUserId = profile.id;
          if (!resolvedName) resolvedName = profile.full_name;
        }
      }

      // 2. Dispatch In-App Notification (if user has an account)
      if (resolvedUserId) {
        const inAppRow = {
          user_id: resolvedUserId,
          type,
          title,
          message,
          link,
          source_id: sourceId,
          is_read: false,
          created_at: new Date().toISOString()
        };

        const { error: inAppErr } = await supabase
          .from('clipad_notifications')
          .insert(inAppRow);

        if (inAppErr) {
          console.warn('[OmniNotificationService] in-app insert warning:', inAppErr.message);
        }
      }

      // 3. Dispatch External Email (Optavel Resend / Edge Function)
      if (sendEmail && resolvedEmail) {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kerint.optavel.com';
        const absoluteCtaUrl = link ? (link.startsWith('http') ? link : `${origin}${link}`) : origin;

        const htmlContent = emailBodyHtml || `<p>${message.replace(/\n/g, '<br/>')}</p>`;
        const emailHtml = createEmailTemplate({
          title,
          recipientName: resolvedName,
          bodyHtml: htmlContent,
          ctaText,
          ctaUrl: absoluteCtaUrl
        });

        // Attempt delivery through the Supabase Edge Function
        try {
          const { error: edgeError } = await supabase.functions.invoke('send-email', {
            body: {
              from: OPTAVEL_SENDER,
              to: [resolvedEmail.trim()],
              subject: `${title} — KERINT`,
              html: emailHtml
            }
          });

          if (edgeError) {
            console.warn('[OmniNotificationService] Edge Function send-email error, logged for sync:', edgeError.message);
          }
        } catch (mailErr) {
          console.warn('[OmniNotificationService] Email delivery invoke caught:', mailErr);
        }

        // Also record to the offline sync notifications table
        try {
          await supabase.from('notifications').insert({
            recipient_email: resolvedEmail,
            recipient_name: resolvedName,
            title,
            message,
            type,
            related_id: link,
            is_read: 'false',
            email_sent: 'true',
            created_at: new Date().toISOString()
          });
        } catch (_) {}
      }

      return { success: true };
    } catch (err) {
      console.error('[OmniNotificationService] Unexpected error:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Helper: Meeting Invitation
   */
  async sendMeetingInvite({ hostName, recipientEmail, roomUrl, scheduledTime = null }) {
    const title = `${hostName || 'A colleague'} invited you to a video meeting`;
    const message = scheduledTime 
      ? `You have been invited to a scheduled video meeting starting at ${new Date(scheduledTime).toLocaleString()}.`
      : `You have been invited to join a live video meeting on KERINT right now.`;

    const bodyHtml = `
      <p style="font-size: 16px; color: #0f172a; font-weight: 600; margin-bottom: 8px;">
        ${hostName || 'A team member'} is inviting you to connect.
      </p>
      <p style="color: #475569; line-height: 1.6;">
        ${message}
      </p>
      <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 14px; margin: 18px 0; font-family: monospace; font-size: 13px; color: #006065; word-break: break-all;">
        ${roomUrl}
      </div>
    `;

    return this.notify({
      recipientEmail,
      type: 'meeting_invite',
      title,
      message,
      link: roomUrl.startsWith('http') ? new URL(roomUrl).pathname : roomUrl,
      ctaText: 'Join Video Meeting',
      emailBodyHtml: bodyHtml,
      sendEmail: true
    });
  },

  /**
   * Helper: Task / Action Item Assignment
   */
  async sendTaskAssigned({ assigneeId, assigneeEmail, taskTitle, spaceName, spaceId, assignerName }) {
    const title = `New Action Item Assigned: "${taskTitle}"`;
    const message = `${assignerName || 'A team member'} assigned you a new task in workspace "${spaceName || 'Workspace'}".`;

    const bodyHtml = `
      <p style="font-size: 16px; color: #0f172a; font-weight: 600; margin-bottom: 8px;">
        You have a new action item to complete.
      </p>
      <div style="background: #f1f5f9; border-left: 4px solid #006065; padding: 14px; border-radius: 6px; margin: 16px 0;">
        <strong style="color: #0f172a; font-size: 15px;">${taskTitle}</strong>
        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Workspace: ${spaceName || 'Workspace'}</p>
      </div>
      <p style="color: #475569; line-height: 1.6;">
        Click below to review the action item details and update its progress.
      </p>
    `;

    return this.notify({
      userId: assigneeId,
      recipientEmail: assigneeEmail,
      type: 'task_assigned',
      title,
      message,
      link: spaceId ? `/spaces/${spaceId}?tab=tasks` : '/action-items',
      ctaText: 'View Action Item',
      emailBodyHtml: bodyHtml,
      sendEmail: true
    });
  },

  /**
   * Helper: Chat Direct Message or @Mention
   */
  async sendChatAlert({ recipientId, recipientEmail, senderName, roomName, messageSnippet, roomId }) {
    const title = `New message from ${senderName || 'a team member'}`;
    const message = `${senderName} mentioned you or sent a message in "${roomName || 'Chat'}": "${messageSnippet?.slice(0, 80)}"`;

    const bodyHtml = `
      <p style="font-size: 16px; color: #0f172a; font-weight: 600; margin-bottom: 8px;">
        ${senderName || 'Someone'} sent a message in <strong>${roomName || 'Chat'}</strong>:
      </p>
      <blockquote style="background: #f8fafc; border-left: 4px solid #fad503; padding: 12px 16px; margin: 16px 0; color: #334155; font-style: italic;">
        "${messageSnippet}"
      </blockquote>
      <p style="color: #475569; line-height: 1.6;">
        Reply quickly by opening the chat window below.
      </p>
    `;

    return this.notify({
      userId: recipientId,
      recipientEmail,
      type: 'chat_mention',
      title,
      message,
      link: `/chat?room=${roomId}`,
      ctaText: 'Reply in Chat',
      emailBodyHtml: bodyHtml,
      sendEmail: true
    });
  },

  /**
   * Helper: New Video Recording Shared
   */
  async sendVideoPublished({ memberIds, videoTitle, spaceName, spaceId, creatorName }) {
    if (!memberIds || memberIds.length === 0) return;

    const title = `New video in ${spaceName}: "${videoTitle}"`;
    const message = `${creatorName || 'A team member'} published a new video recording in "${spaceName}".`;

    for (const memberId of memberIds) {
      await this.notify({
        userId: memberId,
        type: 'video_shared',
        title,
        message,
        link: `/spaces/${spaceId}`,
        ctaText: 'Watch Recording',
        sendEmail: true
      });
    }
  }
};

export default OmniNotificationService;
