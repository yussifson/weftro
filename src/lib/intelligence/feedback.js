import { powerSync } from '@/api/PowerSyncConnector';
import { supabase } from '@/api/supabaseClient';

export async function submitInsightFeedback(insightId, workspaceId, feedbackType, outcome, userId) {
  if (!insightId || !workspaceId || !feedbackType) return false;

  const now = new Date().toISOString();

  // Insert feedback record
  await powerSync.execute(
    `INSERT INTO insight_feedback (id, insight_id, workspace_id, feedback_type, outcome, user_id, created_at)
     VALUES (uuid(), ?, ?, ?, ?, ?, ?)`,
    [insightId, workspaceId, feedbackType, outcome || null, userId || null, now]
  );

  // Get insight details to update engine accuracy
  const insight = await powerSync.execute(
    `SELECT insight_key, vertical FROM workspace_insights WHERE id = ?`,
    [insightId]
  );

  if (insight.rows._array.length > 0) {
    const { insight_key, vertical } = insight.rows._array[0];
    await updateEngineAccuracy(workspaceId, vertical, insight_key, feedbackType);
  }

  // If dismissed or not_relevant, mark as dismissed in workspace_insights
  if (feedbackType === 'dismissed' || feedbackType === 'not_relevant') {
    await powerSync.execute(
      `UPDATE workspace_insights SET is_dismissed = 1 WHERE id = ?`,
      [insightId]
    );
  }

  // Also sync to Supabase backend in real-time if online (optional but good for global analysis)
  try {
    supabase.from('insight_feedback').insert({
      insight_id: insightId,
      workspace_id: workspaceId,
      feedback_type: feedbackType,
      outcome: outcome || null,
      user_id: userId || null
    }).then();
  } catch(e) {}

  return true;
}

async function updateEngineAccuracy(workspaceId, engineName, insightKey, feedbackType) {
  // Try to fetch existing
  const existing = await powerSync.execute(
    `SELECT id, total_produced, acted_on, dismissed, marked_incorrect FROM engine_accuracy 
     WHERE workspace_id = ? AND engine_name = ? AND insight_key = ?`,
    [workspaceId, engineName, insightKey]
  );

  let record;
  if (existing.rows._array.length === 0) {
    // We should not be creating a record *here* if total_produced wasn't incremented, 
    // but the insight exists so maybe it was generated before accuracy tracking.
    record = { id: crypto.randomUUID(), total_produced: 1, acted_on: 0, dismissed: 0, marked_incorrect: 0 };
    await powerSync.execute(
      `INSERT INTO engine_accuracy (id, workspace_id, engine_name, insight_key, total_produced, acted_on, dismissed, marked_incorrect, accuracy_score, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [record.id, workspaceId, engineName, insightKey, 1, 0, 0, 0, null, new Date().toISOString()]
    );
  } else {
    record = existing.rows._array[0];
  }

  let { total_produced, acted_on, dismissed, marked_incorrect } = record;

  if (feedbackType === 'acted_on' || feedbackType === 'helpful') {
    acted_on += 1;
  } else if (feedbackType === 'incorrect') {
    marked_incorrect += 1;
  } else if (feedbackType === 'dismissed' || feedbackType === 'not_relevant') {
    dismissed += 1;
  }

  const denominator = acted_on + marked_incorrect;
  const accuracy_score = denominator > 0 ? ((acted_on / denominator) * 100).toFixed(2) : null;

  await powerSync.execute(
    `UPDATE engine_accuracy SET 
      acted_on = ?, 
      dismissed = ?, 
      marked_incorrect = ?, 
      accuracy_score = ?, 
      updated_at = ?
     WHERE workspace_id = ? AND engine_name = ? AND insight_key = ?`,
    [acted_on, dismissed, marked_incorrect, accuracy_score, new Date().toISOString(), workspaceId, engineName, insightKey]
  );
}
