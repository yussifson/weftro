import { powerSync } from '@/api/PowerSyncConnector';

export async function publishTemplateToMarketplace(industryKey, workspaceId) {
  // Get the template
  const res = await powerSync.execute(
    `SELECT id FROM industry_templates WHERE industry_key = ? AND created_by_workspace = ?`,
    [industryKey, workspaceId]
  );
  
  if (res.rows._array.length === 0) {
    throw new Error('Template not found or you do not have permission to publish it.');
  }
  
  const templateId = res.rows._array[0].id;

  // Mark as pending Optavel review — stays false until approved
  await powerSync.execute(
    `UPDATE industry_templates SET is_public = 0 WHERE id = ?`,
    [templateId]
  );

  // Create a review request
  await powerSync.execute(
    `INSERT INTO marketplace_review_requests (id, item_type, item_id, submitted_by, status, created_at)
     VALUES (uuid(), 'industry_template', ?, ?, 'pending', datetime('now'))`,
    [templateId, workspaceId]
  );

  return {
    success: true,
    message: 'Your industry template has been submitted for review. It will be available in the marketplace after approval.'
  };
}
