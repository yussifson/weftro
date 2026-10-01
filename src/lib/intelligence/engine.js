// src/lib/intelligence/engine.js
// Core Intelligence Engine — runs client-side using PowerSync + Cloudflare AI
// All vertical engines extend this pattern.

import { powerSync } from '@/api/PowerSyncConnector';
import { invokeCloudflareAi } from '@/lib/cloudflareAI';

// ────────────────────────────────────────────────────────
// AI Helper — wraps the existing Cloudflare AI integration
// ────────────────────────────────────────────────────────
export async function generateInsight(prompt, dataContext) {
  const systemPrompt = `You are Slate's intelligence engine. You analyze real business data and produce concise, accurate, actionable insights in plain English. Never invent data. Only reason from the data provided to you. Keep responses under 3 sentences unless a detailed breakdown is requested. Always be specific with numbers. Always explain what the data means for the business.`;

  const fullPrompt = dataContext
    ? `Context data: ${JSON.stringify(dataContext)}\n\n${prompt}`
    : prompt;

  try {
    const response = await invokeCloudflareAi(fullPrompt, systemPrompt);
    return typeof response === 'string' ? response : (response?.response || response?.text || JSON.stringify(response));
  } catch (err) {
    console.error('[Intelligence] AI call failed:', err);
    return 'Unable to generate AI insight at this time.';
  }
}

// ────────────────────────────────────────────────────────
// Insight Suppression Check
// ────────────────────────────────────────────────────────
export async function shouldSurfaceInsight(companyId, insightKey) {
  const existing = await powerSync.execute(
    `SELECT accuracy_score, dismissed, total_produced FROM engine_accuracy 
     WHERE workspace_id = ? AND insight_key = ? LIMIT 1`,
    [companyId, insightKey]
  );

  if (existing.rows._array.length === 0) return true; // no history

  const data = existing.rows._array[0];
  if (data.total_produced < 5) return true; // not enough data

  const dismissRate = data.dismissed / data.total_produced;
  if (dismissRate > 0.7) return false;

  if (data.accuracy_score !== null && data.accuracy_score < 15) return false;

  return true;
}

// ────────────────────────────────────────────────────────
// Insight Storage — write computed insights to PowerSync
// ────────────────────────────────────────────────────────
export async function storeInsight(companyId, insight) {
  const now = new Date().toISOString();

  // Check if this insight already exists (upsert by key+entity)
  const existing = await powerSync.execute(
    `SELECT id FROM workspace_insights WHERE company_id = ? AND insight_key = ? AND (entity_id = ? OR (entity_id IS NULL AND ? IS NULL))`,
    [companyId, insight.insight_key, insight.entity_id || null, insight.entity_id || null]
  );

  if (existing.rows._array.length > 0) {
    // Update existing
    await powerSync.execute(
      `UPDATE workspace_insights SET title = ?, body = ?, severity = ?, confidence = ?, data_snapshot = ?, action_label = ?, action_url = ?, computed_at = ?, expires_at = ?, is_dismissed = 0 WHERE id = ?`,
      [insight.title, insight.body, insight.severity, insight.confidence || null, insight.data_snapshot ? JSON.stringify(insight.data_snapshot) : null, insight.action_label || null, insight.action_url || null, now, insight.expires_at || null, existing.rows._array[0].id]
    );
    return 'updated';
  } else {
    // Insert new
    await powerSync.execute(
      `INSERT INTO workspace_insights (id, company_id, vertical, insight_type, insight_key, entity_type, entity_id, title, body, severity, confidence, data_snapshot, action_label, action_url, is_dismissed, computed_at, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [crypto.randomUUID(), companyId, insight.vertical, insight.insight_type, insight.insight_key, insight.entity_type || null, insight.entity_id || null, insight.title, insight.body, insight.severity, insight.confidence || null, insight.data_snapshot ? JSON.stringify(insight.data_snapshot) : null, insight.action_label || null, insight.action_url || null, now, insight.expires_at || null, now]
    );
    return 'created';
  }
}

// ────────────────────────────────────────────────────────
// Run Log — tracks engine execution
// ────────────────────────────────────────────────────────
export async function logEngineRun(companyId, vertical, engineName, status, insightsCreated, insightsUpdated, durationMs, errorMessage) {
  await powerSync.execute(
    `INSERT INTO intelligence_runs (id, company_id, vertical, engine_name, status, insights_created, insights_updated, error_message, duration_ms, started_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [crypto.randomUUID(), companyId, vertical, engineName, status, insightsCreated || 0, insightsUpdated || 0, errorMessage || null, durationMs || 0]
  );
}

// ────────────────────────────────────────────────────────
// Entity Intelligence — per-record AI summaries
// ────────────────────────────────────────────────────────
export async function storeEntityIntelligence(companyId, entityType, entityId, data) {
  const existing = await powerSync.execute(
    `SELECT id FROM entity_intelligence WHERE company_id = ? AND entity_type = ? AND entity_id = ?`,
    [companyId, entityType, entityId]
  );

  if (existing.rows._array.length > 0) {
    await powerSync.execute(
      `UPDATE entity_intelligence SET summary = ?, risk_score = ?, risk_factors = ?, next_actions = ?, key_signals = ?, computed_at = datetime('now') WHERE id = ?`,
      [data.summary || null, data.risk_score || null, data.risk_factors ? JSON.stringify(data.risk_factors) : null, data.next_actions ? JSON.stringify(data.next_actions) : null, data.key_signals ? JSON.stringify(data.key_signals) : null, existing.rows._array[0].id]
    );
  } else {
    await powerSync.execute(
      `INSERT INTO entity_intelligence (id, company_id, entity_type, entity_id, summary, risk_score, risk_factors, next_actions, key_signals, computed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [crypto.randomUUID(), companyId, entityType, entityId, data.summary || null, data.risk_score || null, data.risk_factors ? JSON.stringify(data.risk_factors) : null, data.next_actions ? JSON.stringify(data.next_actions) : null, data.key_signals ? JSON.stringify(data.key_signals) : null]
    );
  }
}

// ────────────────────────────────────────────────────────
// Engine Runner — runs an engine function with logging
// ────────────────────────────────────────────────────────
export async function runEngine(companyId, vertical, engineName, engineFn) {
  const startTime = Date.now();
  let created = 0;
  let updated = 0;

  try {
    const insights = await engineFn(companyId);

    for (const insight of insights) {
      const shouldShow = await shouldSurfaceInsight(companyId, insight.insight_key);
      if (!shouldShow) continue;

      const result = await storeInsight(companyId, { ...insight, vertical });
      if (result === 'created') created++;
      if (result === 'updated') updated++;
    }

    await logEngineRun(companyId, vertical, engineName, 'completed', created, updated, Date.now() - startTime, null);
    return { status: 'completed', created, updated };
  } catch (err) {
    console.error(`[Intelligence] ${engineName} failed:`, err);
    await logEngineRun(companyId, vertical, engineName, 'failed', created, updated, Date.now() - startTime, err.message);
    return { status: 'failed', error: err.message };
  }
}

// ────────────────────────────────────────────────────────
// Data Helpers
// ────────────────────────────────────────────────────────
export function groupByWeek(data, dateField = 'created_at', valueField = 'amount') {
  const weeks = {};
  (data || []).forEach(item => {
    const d = new Date(item[dateField]);
    if (isNaN(d.getTime())) return;
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split('T')[0];
    if (!weeks[key]) weeks[key] = { total: 0, count: 0, week: key };
    weeks[key].total += Number(item[valueField] || 0);
    weeks[key].count++;
  });
  return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week));
}

export function groupByDay(data, dateField = 'created_at') {
  const days = {};
  (data || []).forEach(item => {
    const day = (item[dateField] || '').split('T')[0];
    if (!day) return;
    if (!days[day]) days[day] = { count: 0, day };
    days[day].count++;
  });
  return Object.values(days).sort((a, b) => a.day.localeCompare(b.day));
}
