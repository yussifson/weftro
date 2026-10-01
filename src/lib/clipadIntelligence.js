// src/lib/clipadIntelligence.js
// Shared AI Intelligence Service for the ClipPad Organizational Intelligence Platform
// All AI extraction and event-writing utilities live here.

import { supabase } from '@/api/supabaseClient';
import { generateText } from '@/lib/cloudflareAI';
import { getMemories, MEMORY_STATUS } from '@/lib/clipadMemoryService';

// ──────────────────────────────────────────────────────────────────
// AI JSON Extraction Helper
// ──────────────────────────────────────────────────────────────────
async function extractJSON(prompt) {
  const raw = await generateText([
    {
      role: 'system',
      content:
        'You are a data extraction AI. Always respond with ONLY valid JSON — no explanation, no markdown, no code fences. If nothing is detected, return an empty array [].',
    },
    { role: 'user', content: prompt },
  ]);
  try {
    const cleaned = (raw || '').replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────
// 1. Detect Decisions from transcript/text
// ──────────────────────────────────────────────────────────────────
export async function detectDecisions(text, options = {}) {
  if (!text?.trim()) return [];

  const items = await extractJSON(`Extract every explicit DECISION from the following text.
A decision is when a group or individual commits to a specific course of action.
Return a JSON array where each item has:
- "decision_text": short description of the decision (max 120 chars)
- "rationale": why this was decided (1-2 sentences, or null)
- "participants": array of any names/roles mentioned as deciding parties (can be empty)
- "importance_score": integer 1-10 based on business impact
- "confidence_score": integer 1-10 based on how certain the decision sounds

TEXT:
${text.substring(0, 4000)}`);

  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item.decision_text)
    .map((item) => ({
      id: crypto.randomUUID(),
      decision_text: item.decision_text,
      rationale: item.rationale || null,
      status: 'active',
      ai_detected: true,
      participants: item.participants || [],
      importance_score: Math.min(10, Math.max(1, Number(item.importance_score) || 5)),
      confidence_score: Math.min(10, Math.max(1, Number(item.confidence_score) || 5)),
      source_text: text.substring(0, 500),
      ...options,
      created_at: new Date().toISOString(),
    }));
}

// ──────────────────────────────────────────────────────────────────
// 2. Detect Commitments / Promises from text
// ──────────────────────────────────────────────────────────────────
export async function detectCommitments(text, options = {}) {
  if (!text?.trim()) return [];

  const items = await extractJSON(`Extract every COMMITMENT or PROMISE from the following text.
A commitment is when someone says they will do something.
Return a JSON array where each item has:
- "commitment_text": the promise made (max 150 chars)
- "owner_name": who made the promise (or null)
- "due_date": inferred due date YYYY-MM-DD (or null)
- "confidence_score": integer 1-10

TEXT:
${text.substring(0, 4000)}`);

  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item.commitment_text)
    .map((item) => ({
      id: crypto.randomUUID(),
      commitment_text: item.commitment_text,
      owner_name: item.owner_name || null,
      due_date: item.due_date || null,
      status: 'pending',
      ai_detected: true,
      confidence_score: Math.min(10, Math.max(1, Number(item.confidence_score) || 5)),
      source_text: text.substring(0, 500),
      ...options,
      created_at: new Date().toISOString(),
    }));
}

// ──────────────────────────────────────────────────────────────────
// 3. Detect Blockers from text
// ──────────────────────────────────────────────────────────────────
export async function detectBlockers(text, options = {}) {
  if (!text?.trim()) return [];

  const items = await extractJSON(`Extract every BLOCKER or OBSTACLE from the following text.
A blocker is something that prevents progress or causes delays.
Return a JSON array where each item has:
- "description": the blocker (max 150 chars)
- "severity": "low", "medium", or "high"
- "importance_score": integer 1-10

TEXT:
${text.substring(0, 4000)}`);

  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item.description)
    .map((item) => ({
      id: crypto.randomUUID(),
      description: item.description,
      severity: ['low', 'medium', 'high'].includes(item.severity) ? item.severity : 'medium',
      status: 'open',
      ai_detected: true,
      importance_score: Math.min(10, Math.max(1, Number(item.importance_score) || 5)),
      source_text: text.substring(0, 500),
      detected_at: new Date().toISOString(),
      ...options,
    }));
}

// ──────────────────────────────────────────────────────────────────
// 4. Detect Follow-Ups from text
// ──────────────────────────────────────────────────────────────────
export async function detectFollowUps(text, options = {}) {
  if (!text?.trim()) return [];

  const items = await extractJSON(`Extract every FOLLOW-UP ACTION from the following text.
A follow-up is something that needs to be done as a consequence of the conversation.
Return a JSON array where each item has:
- "commitment_text": what needs to be done (max 150 chars)
- "owner_name": who should do it (or null)
- "due_date": inferred date YYYY-MM-DD (or null)

TEXT:
${text.substring(0, 4000)}`);

  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item.commitment_text)
    .map((item) => ({
      id: crypto.randomUUID(),
      commitment_text: item.commitment_text,
      detected_from: item.owner_name || null,
      due_date: item.due_date || null,
      status: 'pending',
      ai_detected: true,
      source_type: options.source_type || 'chat',
      ...options,
      created_at: new Date().toISOString(),
    }));
}

// ──────────────────────────────────────────────────────────────────
// 5. Generate AI Standup Summary
// ──────────────────────────────────────────────────────────────────
export async function generateStandupSummary(updates = [], contextDate = 'today') {
  if (!updates.length) return 'No standup updates posted yet.';

  const formatted = updates
    .map(
      (u) =>
        `Name: ${u.user_name || 'Team Member'}\n- Today: ${u.today || 'N/A'}\n- Yesterday: ${u.yesterday || 'N/A'}\n- Blockers: ${u.blockers || 'None'}\n- Mood: ${u.mood || 'neutral'}`
    )
    .join('\n\n');

  return await generateText([
    {
      role: 'system',
      content:
        `You are a team standup summarizer analyzing updates for this period: ${contextDate}. Create a clear, concise summary written in continuous, natural paragraphs. Do NOT use any special characters, markdown formatting, bullet points, or asterisks. Write in a clean prose format. You must strictly use the exact real names of the team members provided in the input data instead of generic terms or made-up names. Summarize key work happening, shared blockers, team mood, and items needing manager attention. Keep it under 200 words.`,
    },
    { role: 'user', content: `Summarize this team standup for the period (${contextDate}):\n\n${formatted}` },
  ]) || 'Unable to generate summary.';
}

// ──────────────────────────────────────────────────────────────────
// 6. Build Organization Context for AI Brain — FULL KNOWLEDGE ENGINE
//    Pulls every table that holds organisational knowledge so that
//    OrbitFlow & Spotlight can answer questions about anything.
// ──────────────────────────────────────────────────────────────────
export async function buildOrgContext(options = {}) {
  const limit     = options.limit     || 20;
  const spaceIds  = options.spaceIds  || [];
  const companyId = options.companyId || null;
  // Privacy scoping — always pass these from the calling component
  const userId    = options.userId    || null;
  const userRole  = options.userRole  || 'member'; // 'super_admin' | 'admin' | 'spaceman' | 'member'
  const isAdmin   = ['super_admin', 'admin'].includes(userRole);

  // Helper: build space filter clause
  const inSpaces = (col) => spaceIds.length > 0 ? { in: [col, spaceIds] } : null;

  // ── Imported knowledge visibility rules ─────────────────────────────────────
  // personal  — only the connecting user can see it
  // space     — members of that space can see it
  // company   — all company members can see it (admin connections)
  let importedKnowledgeQuery = supabase
    .from('clipad_imported_knowledge')
    .select('id, provider, content_type, title, content, ai_summary, ai_action_items, metadata, updated_at, connected_by_user_id, visibility')
    .order('updated_at', { ascending: false })
    .limit(30);

  if (companyId) {
    importedKnowledgeQuery = importedKnowledgeQuery.eq('company_id', companyId);
  }

  // Non-admins only see: their own personal integrations + company-wide integrations + space integrations they belong to
  if (!isAdmin && userId) {
    // Use Supabase OR filter: (connected_by_user_id = me) OR (visibility = 'company') OR (visibility = 'space' AND space_id IN mySpaces)
    importedKnowledgeQuery = importedKnowledgeQuery.or(
      `connected_by_user_id.eq.${userId},visibility.eq.company${spaceIds.length > 0 ? `,and(visibility.eq.space,space_id.in.(${spaceIds.join(',')}))` : ''}`
    );
  }
  // Admins see everything within their company (no extra filter needed — companyId filter above is sufficient)

  // Run ALL fetches in parallel for speed
  const [
    meetingsRes,
    decisionsRes,
    blockersRes,
    videosRes,
    tasksRes,
    importedKnowledgeRes,
    commitmentsRes,
    spacesRes,
    standupsRes,
    orgEventsRes,
    membersRes,
    chatRoomsRes,
    followUpsRes,
    actionItemsRes,
  ] = await Promise.all([
    // Meetings — always scoped to accessible spaces (which are already company-scoped)
    Promise.resolve(spaceIds.length > 0
      ? supabase.from('clipad_meeting_records')
          .select('id, title, ai_summary, created_at, ended_at, space_id')
          .in('space_id', spaceIds)
          .order('created_at', { ascending: false })
          .limit(limit)
      : companyId
        ? supabase.from('clipad_meeting_records')
            .select('id, title, ai_summary, created_at, ended_at, space_id')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(limit)
        : { data: [] }).catch(() => ({ data: [] })),

    // Decisions — require companyId, no fallback to unscoped query
    Promise.resolve(companyId
      ? supabase.from('clipad_decisions')
          .select('id, decision_text, rationale, created_at')
          .eq('workspace_id', companyId)
          .order('created_at', { ascending: false })
          .limit(15)
      : { data: [] }).catch(() => ({ data: [] })),

    // Blockers — require companyId, no fallback to unscoped query
    Promise.resolve(companyId
      ? supabase.from('clipad_blockers')
          .select('id, description, severity')
          .eq('workspace_id', companyId)
          .limit(10)
      : { data: [] }).catch(() => ({ data: [] })),

    // Videos
    Promise.resolve(spaceIds.length > 0
      ? supabase.from('clipad_videos')
          .select('id, title, ai_summary, created_at, duration_seconds, space_id')
          .in('space_id', spaceIds)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(limit)
      : supabase.from('clipad_videos')
          .select('id, title, ai_summary, created_at, duration_seconds, space_id')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(limit)).catch(() => ({ data: [] })),

    // Tasks / Action items — scoped to accessible spaces or companyId
    Promise.resolve(spaceIds.length > 0
      ? supabase.from('clipad_action_items')
          .select('id, title, is_complete, due_date, assigned_to, space_id')
          .eq('is_complete', false)
          .in('space_id', spaceIds)
          .order('created_at', { ascending: false })
          .limit(20)
      : companyId
        ? supabase.from('clipad_action_items')
            .select('id, title, is_complete, due_date, assigned_to, space_id')
            .eq('is_complete', false)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(20)
        : { data: [] }).catch(() => ({ data: [] })),

    // Imported Knowledge — PRIVACY-SCOPED per userId/userRole
    Promise.resolve(importedKnowledgeQuery).catch(() => ({ data: [] })),

    // Commitments — scoped to companyId via spaceIds
    Promise.resolve(spaceIds.length > 0
      ? supabase.from('clipad_commitments')
          .select('id, commitment_text, due_date')
          .in('team_space_id', spaceIds)
          .order('created_at', { ascending: false })
          .limit(15)
      : { data: [] }).catch(() => ({ data: [] })),

    // Spaces — always scoped via spaceIds (already company-scoped) or companyId
    Promise.resolve(spaceIds.length > 0
      ? supabase.from('clipad_spaces')
          .select('id, name, description, created_at, is_private')
          .in('id', spaceIds)
          .order('created_at', { ascending: false })
          .limit(20)
      : companyId
        ? supabase.from('clipad_spaces')
            .select('id, name, description, created_at, is_private')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(20)
        : { data: [] }).catch(() => ({ data: [] })),

    // ── Standups — scoped to accessible spaces or companyId ──
    Promise.resolve(spaceIds.length > 0
      ? supabase.from('clipad_standups')
          .select('id, user_name, today, yesterday, blockers, mood, created_at, space_id')
          .in('space_id', spaceIds)
          .order('created_at', { ascending: false })
          .limit(30)
      : companyId
        ? supabase.from('clipad_standups')
            .select('id, user_name, today, yesterday, blockers, mood, created_at, space_id')
            .eq('workspace_id', companyId)
            .order('created_at', { ascending: false })
            .limit(30)
        : { data: [] }).catch(() => ({ data: [] })),

    // ── Org Events timeline — scoped to accessible spaces or companyId ──
    Promise.resolve(spaceIds.length > 0
      ? supabase.from('clipad_org_events')
          .select('id, event_type, title, description, created_at, space_id, actor_id, importance')
          .in('space_id', spaceIds)
          .order('created_at', { ascending: false })
          .limit(20)
      : companyId
        ? supabase.from('clipad_org_events')
            .select('id, event_type, title, description, created_at, space_id, actor_id, importance')
            .eq('workspace_id', companyId)
            .order('created_at', { ascending: false })
            .limit(20)
        : { data: [] }).catch(() => ({ data: [] })),

    // ── Space members ──
    Promise.resolve(spaceIds.length > 0
      ? supabase.from('clipad_space_members')
          .select('id, space_id, user_id')
          .in('space_id', spaceIds)
          .limit(50)
      : { data: [] }).catch(() => ({ data: [] })),

    // ── Chat rooms (PowerSync / Local fallback) ──
    Promise.resolve({ data: [] }),

    // ── Follow-ups — scoped to companyId via workspace_id ──
    Promise.resolve(companyId
      ? supabase.from('clipad_follow_ups')
          .select('id, commitment_text, due_date, status, detected_from')
          .eq('workspace_id', companyId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(15)
      : { data: [] }).catch(() => ({ data: [] })),

    // ── Completed action items — scoped to accessible spaces or companyId ──
    Promise.resolve(spaceIds.length > 0
      ? supabase.from('clipad_action_items')
          .select('id, title, is_complete, due_date, assigned_to, space_id')
          .eq('is_complete', true)
          .in('space_id', spaceIds)
          .order('created_at', { ascending: false })
          .limit(10)
      : companyId
        ? supabase.from('clipad_action_items')
            .select('id, title, is_complete, due_date, assigned_to, space_id')
            .eq('is_complete', true)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(10)
        : { data: [] }).catch(() => ({ data: [] })),
  ]);

  // ── Pull from integration_knowledge (new table) if it exists ─────────────
  let integrationKnowledge = [];
  if (userId || companyId) {
    try {
      let ikQuery = supabase
        .from('integration_knowledge')
        .select('id, integration_type, title, summary, tags, sentiment, flagged_action, source_url, metadata, is_flagged, updated_at')
        .order('updated_at', { ascending: false })
        .limit(25);
      if (companyId) ikQuery = ikQuery.eq('company_id', companyId);
      if (!isAdmin && userId) {
        ikQuery = ikQuery.or(
          `connected_by_user_id.eq.${userId},visibility.eq.company${spaceIds.length > 0 ? `,and(visibility.eq.space,space_id.in.(${spaceIds.join(',')}))` : ''}`
        );
      }
      const { data: ikData, error: ikErr } = await ikQuery;
      if (!ikErr && ikData) integrationKnowledge = ikData;
    } catch {/* table may not exist yet */}
  }

  let v3Memories = [];
  try {
    v3Memories = await getMemories({
      companyId,
      userId,
      spaceIds,
      status: MEMORY_STATUS.ACTIVE,
      limit: 25,
    });
  } catch {/* memory service safety */}

  const meetings     = meetingsRes?.data     || [];
  const decisions    = decisionsRes?.data    || [];
  const blockers     = blockersRes?.data     || [];
  const videos       = videosRes?.data       || [];
  const tasks        = tasksRes?.data        || [];
  const importedKnowledge = importedKnowledgeRes?.data || [];
  const commitments  = commitmentsRes?.data  || [];
  const spaces       = spacesRes?.data       || [];
  const standups     = standupsRes?.data     || [];
  const orgEvents    = orgEventsRes?.data    || [];
  const members      = membersRes?.data      || [];
  const chatRooms    = chatRoomsRes?.data    || [];
  const followUps    = followUpsRes?.data    || [];
  const completedTasks = actionItemsRes?.data || [];

  // Build source map for citation
  const sourceMap = {};
  meetings.forEach((m) => { sourceMap[m.id] = { type: 'meeting', title: m.title, id: m.id }; });
  decisions.forEach((d) => { sourceMap[d.id] = { type: 'decision', title: d.decision_text?.substring(0, 60), id: d.id }; });
  videos.forEach((v) => { sourceMap[v.id] = { type: 'video', title: v.title, id: v.id }; });
  spaces.forEach((s) => { sourceMap[s.id] = { type: 'space', title: s.name, id: s.id }; });
  integrationKnowledge.forEach((ik) => { sourceMap[ik.id] = { type: ik.integration_type, title: ik.title, id: ik.id, url: ik.source_url }; });
  v3Memories.forEach((mem) => { sourceMap[mem.id] = { type: 'memory', title: mem.title, id: mem.id, tier: mem.memory_tier, memoryType: mem.memory_type }; });

  // Build context text — comprehensive view of the entire org
  const today = new Date().toISOString().slice(0, 10);

  const standupsByDate = {};
  standups.forEach(s => {
    const date = s.created_at?.slice(0, 10) || 'unknown';
    if (!standupsByDate[date]) standupsByDate[date] = [];
    standupsByDate[date].push(s);
  });

  const contextText = [
    `[TODAY: ${today}]`,
    `\n━━ ORGANIZATIONAL MEMORY & INTELLIGENCE CORE (${v3Memories.length} memories) ━━`,
    v3Memories.length > 0
      ? v3Memories.map(m => `• [${m.memory_tier.toUpperCase()}:${m.memory_type}] "${m.title}" (Confidence: ${Math.round((m.confidence_score || 1) * 100)}%): ${m.content}`).join('\n')
      : '  No v3 organizational memory nodes recorded yet.',
    `\n━━ ACTIVE SPACES (${spaces.length}) ━━`,
    spaces.length > 0
      ? spaces.map(s => `• [SPACE:${s.id}] "${s.name}"${s.is_private ? ' (private)' : ''}: ${s.description?.substring(0, 120) || 'No description'}`).join('\n')
      : '  No spaces found.',

    `\n━━ CONNECTED KNOWLEDGE PLATFORMS (${importedKnowledge.length} items recently imported) ━━`,
    importedKnowledge.length > 0
      ? importedKnowledge.map(ik => `• [${ik.provider?.toUpperCase()} - ${ik.content_type}] "${ik.title}" (updated ${ik.updated_at?.slice(0,10)}): ${ik.ai_summary || ik.content?.substring(0,250)}`).join('\n')
      : '  No external knowledge imported.',

    `\n━━ TEAM MEMBERS (${members.length}) ━━`,
    members.length > 0
      ? members.map(m => {
          const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          return `• ${profile?.full_name || 'Unknown'} <${profile?.email || 'no email'}> — role: ${m.role || 'member'} in space ${m.space_id}`;
        }).join('\n')
      : '  No member data.',

    `\n━━ DAILY STANDUPS (${standups.length} total) ━━`,
    standups.length > 0
      ? Object.entries(standupsByDate)
          .slice(0, 5) // last 5 days
          .map(([date, dayUpdates]) => {
            return `\n  [${date}] — ${dayUpdates.length} update(s):\n` +
              dayUpdates.map(s =>
                `    👤 ${s.user_name || 'Team member'}:\n` +
                `       Today: ${s.today || 'not specified'}\n` +
                `       Yesterday: ${s.yesterday || 'not specified'}\n` +
                `       Blockers: ${s.blockers || 'none'}\n` +
                `       Mood: ${s.mood || 'neutral'}`
              ).join('\n');
          }).join('\n')
      : '  No standups posted yet.',

    `\n━━ RECENT MEETINGS (${meetings.length}) ━━`,
    meetings.length > 0
      ? meetings.map(m => `• [MEETING:${m.id}] "${m.title}" (${m.created_at?.slice(0, 10)}): ${m.ai_summary?.substring(0, 250) || 'No summary yet'}`).join('\n')
      : '  No meetings recorded.',

    `\n━━ ACTIVE DECISIONS (${decisions.length}) ━━`,
    decisions.length > 0
      ? decisions.map(d => `• [DECISION:${d.id}] ${d.decision_text} — Rationale: ${d.rationale || 'none'}`).join('\n')
      : '  No active decisions.',

    `\n━━ OPEN BLOCKERS (${blockers.length}) ━━`,
    blockers.length > 0
      ? blockers.map(b => `• [${(b.severity || 'medium').toUpperCase()}] ${b.description}`).join('\n')
      : '  No open blockers.',

    `\n━━ OPEN TASKS / ACTION ITEMS (${tasks.length}) ━━`,
    tasks.length > 0
      ? tasks.map(t => `• ${t.title}${t.assigned_to ? ` → @${t.assigned_to}` : ''}${t.due_date ? ` (due ${t.due_date})` : ''}`).join('\n')
      : '  No open tasks.',

    completedTasks.length > 0 ? `\n━━ RECENTLY COMPLETED TASKS (${completedTasks.length}) ━━\n` +
      completedTasks.map(t => `• ✅ ${t.title}${t.assigned_to ? ` — ${t.assigned_to}` : ''}`).join('\n') : '',

    `\n━━ PENDING COMMITMENTS (${commitments.length}) ━━`,
    commitments.length > 0
      ? commitments.map(c => `• ${c.commitment_text}${c.owner_name ? ` (${c.owner_name})` : ''}${c.due_date ? ` by ${c.due_date}` : ''}`).join('\n')
      : '  No pending commitments.',

    followUps.length > 0
      ? `\n━━ PENDING FOLLOW-UPS (${followUps.length}) ━━\n` +
        followUps.map(f => `• ${f.commitment_text}${f.detected_from ? ` (from: ${f.detected_from})` : ''}${f.due_date ? ` by ${f.due_date}` : ''}`).join('\n')
      : '',

    `\n━━ RECENT ASYNC VIDEOS (${videos.length}) ━━`,
    videos.length > 0
      ? videos.map(v => `• [VIDEO:${v.id}] "${v.title}" (${v.created_at?.slice(0, 10)}${v.duration_seconds ? `, ${Math.round(v.duration_seconds / 60)}min` : ''}): ${v.ai_summary?.substring(0, 200) || 'No summary'}`).join('\n')
      : '  No videos recorded.',

    chatRooms.length > 0 ? `\n━━ ACTIVE CHAT ROOMS (${chatRooms.length}) ━━\n` +
      chatRooms.map(r => `• #${r.name} — ${r.description || 'No description'}`).join('\n') : '',

    // ── Integration Knowledge (GitHub, Gmail, Notion, Jira, etc.) ──────────────
    integrationKnowledge.length > 0
      ? `\n━━ THIRD-PARTY INTEGRATION INTELLIGENCE (${integrationKnowledge.length} items from connected apps) ━━\n` +
        integrationKnowledge.map(ik => {
          const flagged = ik.is_flagged ? ' ⚠️ ACTION NEEDED' : '';
          const action = ik.flagged_action ? ` → ${ik.flagged_action}` : '';
          const tags = ik.tags?.length > 0 ? ` [${ik.tags.join(', ')}]` : '';
          return `• [${(ik.integration_type || 'integration').toUpperCase()}${flagged}] "${ik.title}"${tags}: ${ik.summary || 'No summary'}${action}${ik.source_url ? ` — ${ik.source_url}` : ''}`;
        }).join('\n')
      : '',
  ];

  // ── TOPOLOGICAL GRAPH MAPPING ──
  // Build relationship vectors (User -> Authored Content, Meeting -> Decisions)
  const topologicalMap = [];
  topologicalMap.push('\n━━ SEMANTIC RELATIONSHIPS (TOPOLOGICAL MAP) ━━');
  
  // People -> Content mapping
  const authorMap = {};
  importedKnowledge.forEach(ik => {
    if (ik.author) {
      if (!authorMap[ik.author]) authorMap[ik.author] = [];
      authorMap[ik.author].push(`[${ik.content_type || 'file'} ID:${ik.id}] ${ik.title}`);
    }
  });
  Object.entries(authorMap).forEach(([author, items]) => {
    topologicalMap.push(`• Person "${author}" authored/owns: ${items.join(', ')}`);
  });

  // Task Assignments
  const assigneeMap = {};
  [...tasks, ...completedTasks].forEach(t => {
    if (t.assigned_to) {
      if (!assigneeMap[t.assigned_to]) assigneeMap[t.assigned_to] = [];
      assigneeMap[t.assigned_to].push(`[Task ID:${t.id}] ${t.title} (${t.is_complete ? 'Completed' : 'Open'})`);
    }
  });
  Object.entries(assigneeMap).forEach(([assignee, tasks]) => {
    topologicalMap.push(`• Person "${assignee}" is assigned to: ${tasks.join(', ')}`);
  });

  // Host -> Meetings
  const hostMap = {};
  meetings.forEach(m => {
    if (m.host_name || m.host_id) {
      const host = m.host_name || `User ID:${m.host_id}`;
      if (!hostMap[host]) hostMap[host] = [];
      hostMap[host].push(`[Meeting ID:${m.id}] ${m.title}`);
    }
  });
  Object.entries(hostMap).forEach(([host, meetings]) => {
    topologicalMap.push(`• Person "${host}" hosted/attended: ${meetings.join(', ')}`);
  });

  if (topologicalMap.length > 1) {
    contextText.push(...topologicalMap);
  }

  return {
    contextText: contextText.filter(Boolean).join('\n'),
    sourceMap,
    meetings,
    decisions,
    blockers,
    videos,
    tasks,
    importedKnowledge,
    integrationKnowledge, // NEW: AI-ingested third-party data
    commitments,
    spaces,
    standups,
    orgEvents,
    members,
    chatRooms,
    followUps,
  };
}

// ──────────────────────────────────────────────────────────────────
// 7. Detect Organizational Risks
// ──────────────────────────────────────────────────────────────────
export async function detectRisks(companyId, spaceIds = []) {
  const risks = [];
  const now = new Date();

  try {
    // 1. Overdue tasks (due more than 3 days ago, still open)
    const overdueCutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const tasksQuery = supabase
      .from('clipad_action_items')
      .select('id, title, due_date, assigned_to, space_id')
      .eq('is_complete', false)
      .not('due_date', 'is', null)
      .lt('due_date', overdueCutoff);
    if (spaceIds.length > 0) tasksQuery.in('space_id', spaceIds);
    const { data: overdueTasks } = await tasksQuery.limit(10);
    (overdueTasks || []).forEach(task => {
      risks.push({
        type: 'overdue_task',
        severity: 'high',
        title: `Overdue task: "${task.title}"`,
        description: `Due ${task.due_date}, still open${task.assigned_to ? ` — assigned to ${task.assigned_to}` : ''}`,
        source_id: task.id,
        source_table: 'clipad_action_items',
      });
    });

    // 2. Old open blockers (raised more than 7 days ago)
    const blockerCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const blockersQuery = supabase
      .from('clipad_blockers')
      .select('id, description, severity, detected_at, team_space_id')
      .eq('status', 'open')
      .lt('detected_at', blockerCutoff);
    if (spaceIds.length > 0) blockersQuery.in('team_space_id', spaceIds);
    const { data: staleBlockers } = await blockersQuery.limit(10);
    (staleBlockers || []).forEach(blocker => {
      const daysOpen = Math.floor((now - new Date(blocker.detected_at)) / (1000 * 60 * 60 * 24));
      risks.push({
        type: 'stale_blocker',
        severity: blocker.severity === 'high' ? 'critical' : 'high',
        title: `Unresolved blocker for ${daysOpen} days`,
        description: blocker.description,
        source_id: blocker.id,
        source_table: 'clipad_blockers',
      });
    });

    // 3. Decisions with no follow-up actions (older than 7 days)
    const decisionCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const decisionsQuery = supabase
      .from('clipad_decisions')
      .select('id, decision_text, created_at, team_space_id')
      .eq('status', 'active')
      .lt('created_at', decisionCutoff);
    if (spaceIds.length > 0) decisionsQuery.in('team_space_id', spaceIds);
    const { data: oldDecisions } = await decisionsQuery.limit(5);

    for (const decision of (oldDecisions || [])) {
      // Check if there are any action items linked to this decision
      const { data: linkedTasks } = await supabase
        .from('clipad_action_items')
        .select('id')
        .eq('source_id', decision.id)
        .limit(1);

      if (!linkedTasks || linkedTasks.length === 0) {
        risks.push({
          type: 'unactioned_decision',
          severity: 'medium',
          title: `Decision with no follow-up tasks`,
          description: `"${decision.decision_text?.substring(0, 100)}" — made ${new Date(decision.created_at).toLocaleDateString()} with no assigned tasks`,
          source_id: decision.id,
          source_table: 'clipad_decisions',
        });
      }
    }

    // 4. No meetings in the last 14 days (org going quiet)
    const meetingCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const meetingQuery = supabase
      .from('clipad_meeting_records')
      .select('id')
      .gt('created_at', meetingCutoff);
    if (spaceIds.length > 0) meetingQuery.in('space_id', spaceIds);
    else if (companyId) meetingQuery.eq('company_id', companyId);
    const { data: recentMeetings } = await meetingQuery.limit(1);

    if (!recentMeetings || recentMeetings.length === 0) {
      risks.push({
        type: 'low_activity',
        severity: 'medium',
        title: 'No meetings in the last 14 days',
        description: 'The team has had no recorded meetings recently. This may indicate reduced collaboration or missing data.',
        source_id: null,
        source_table: null,
      });
    }

    // 5. Commitments overdue (due_date passed and still pending)
    const { data: overdueCommitments } = await supabase
      .from('clipad_commitments')
      .select('id, commitment_text, due_date, assignee:assignee_id(full_name)')
      .eq('status', 'pending')
      .not('due_date', 'is', null)
      .lt('due_date', now.toISOString().split('T')[0])
      .limit(5);

    (overdueCommitments || []).forEach(c => {
      const ownerName = c.assignee?.full_name;
      risks.push({
        type: 'overdue_commitment',
        severity: 'high',
        title: `Commitment overdue`,
        description: `"${c.commitment_text?.substring(0, 100)}"${ownerName ? ` (${ownerName})` : ''} — was due ${c.due_date}`,
        source_id: c.id,
        source_table: 'clipad_commitments',
      });
    });

  } catch (err) {
    console.warn('[detectRisks] Error:', err.message);
  }

  return risks;
}

// ──────────────────────────────────────────────────────────────────
// 8. Write to Org Timeline (clipad_org_events)
// ──────────────────────────────────────────────────────────────────
export async function writeOrgEvent({ workspace_id, space_id, event_type, title, description, actor_id, source_id, source_table, metadata, importance = 3 }) {
  try {
    await supabase.from('clipad_org_events').insert({
      workspace_id, space_id, event_type, title, description,
      actor_id, source_id, source_table,
      metadata: metadata || {}, importance,
    });
  } catch (err) {
    console.warn('[OrgEvents] Failed to write event:', err.message);
  }
}
