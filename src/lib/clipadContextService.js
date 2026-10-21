// src/lib/clipadContextService.js
// Clipad V3 Domain Organizational Context & Memory Retrieval Service
// Phase 4: Extended with Graph-Aware Context combining Memory + Entity + Smart Moments

import { supabase } from '@/api/supabaseClient';
import { getMemories, MEMORY_STATUS, MEMORY_TIERS } from '@/lib/clipadMemoryService';
import { getEntityGraph } from '@/lib/clipadEntityService';
import { findConnectedKnowledge } from '@/lib/clipadGraphService';
import { resolveIntelligenceContext, filterAuthorizedMemories, filterAuthorizedMoments, filterAuthorizedGraph } from './clipadIntelligenceGovernanceService';

/**
 * Score and rank memories based on relevance, freshness, confidence, and importance.
 */
export function rankMemories(memories = [], queryText = '') {
  const q = (queryText || '').toLowerCase().trim();
  const now = Date.now();

  return memories
    .map(mem => {
      let relevance = 0.5;
      if (q) {
        const titleMatch = (mem.title || '').toLowerCase().includes(q);
        const contentMatch = (mem.content || '').toLowerCase().includes(q);
        const summaryMatch = (mem.summary || '').toLowerCase().includes(q);
        if (titleMatch) relevance += 0.4;
        if (summaryMatch) relevance += 0.2;
        if (contentMatch) relevance += 0.1;
      }

      // Age decay factor (freshness)
      const ageInDays = (now - new Date(mem.created_at || now).getTime()) / (1000 * 60 * 60 * 24);
      const freshnessScore = Math.max(0.1, 1.0 - (ageInDays / 90)); // decay over 90 days

      const confidence = mem.confidence_score ?? 1.0;
      const importance = mem.importance ?? 0.5;

      // Combined ranking score calculation
      const compositeScore = (relevance * 0.35) + (freshnessScore * 0.25) + (confidence * 0.20) + (importance * 0.20);

      return {
        ...mem,
        ranking: {
          compositeScore: Number(compositeScore.toFixed(3)),
          relevance: Number(relevance.toFixed(2)),
          freshness: Number(freshnessScore.toFixed(2)),
          confidence,
          importance,
        }
      };
    })
    .sort((a, b) => b.ranking.compositeScore - a.ranking.compositeScore);
}

/**
 * Retrieve permission-filtered, ranked memories for a given query or context.
 */
export async function getRelevantMemories({
  companyId,
  userId = null,
  spaceIds = [],
  query = '',
  memoryTier = null,
  memoryType = null,
  limit = 20,
}) {
  const memories = await getMemories({
    companyId,
    userId,
    spaceIds,
    memoryTier,
    memoryType,
    status: MEMORY_STATUS.ACTIVE,
    queryText: query,
    limit: limit * 2, // Fetch double for ranking and trimming
  });

  const ranked = rankMemories(memories, query);
  return ranked.slice(0, limit);
}

/**
 * Retrieve comprehensive Organizational Context scoped by user permissions.
 */
export async function getOrganizationalContext({
  companyId,
  userId = null,
  userRole = 'member',
  spaceIds = [],
}) {
  if (!companyId) return { contextText: '', memories: [], totalNodes: 0 };

  const [activeMemories, decisionsRes, blockersRes, spacesRes] = await Promise.all([
    getRelevantMemories({ companyId, userId, spaceIds, limit: 30 }),
    supabase.from('clipad_decisions').select('id, decision_text, status').eq('workspace_id', companyId).limit(10).catch(() => ({ data: [] })),
    supabase.from('clipad_blockers').select('id, description, severity').eq('workspace_id', companyId).eq('status', 'open').limit(10).catch(() => ({ data: [] })),
    supabase.from('clipad_spaces').select('id, name, is_private').eq('company_id', companyId).limit(15).catch(() => ({ data: [] })),
  ]);

  const decisions = decisionsRes?.data || [];
  const blockers = blockersRes?.data || [];
  const spaces = spacesRes?.data || [];

  const contextTextLines = [
    `[ORGANIZATIONAL MEMORY & INTELLIGENCE CORE]`,
    `Company ID: ${companyId} | User Role: ${userRole}`,
    `\n━━ ACCESSIBLE MEMORY NODES (${activeMemories.length}) ━━`,
    activeMemories.length > 0
      ? activeMemories.map(m => `• [${(m.memory_tier || 'organizational').toUpperCase()}:${m.memory_type || 'FACT'}] "${m.title}" (Confidence: ${Math.round((m.confidence_score || 1) * 100)}%): ${m.content}`).join('\n')
      : '  No memory nodes found.',

    `\n━━ ACTIVE DECISIONS (${decisions.length}) ━━`,
    decisions.length > 0
      ? decisions.map(d => `• ${d.decision_text} [${d.status}]`).join('\n')
      : '  No decisions recorded.',

    `\n━━ OPEN BLOCKERS (${blockers.length}) ━━`,
    blockers.length > 0
      ? blockers.map(b => `• [${b.severity?.toUpperCase() || 'MEDIUM'}] ${b.description}`).join('\n')
      : '  No open blockers.',
  ];

  return {
    contextText: contextTextLines.join('\n'),
    memories: activeMemories,
    decisions,
    blockers,
    spaces,
    totalNodes: activeMemories.length + decisions.length + blockers.length,
  };
}

/**
 * Retrieve user-scoped personal context.
 */
export async function getUserContext({ userId, companyId }) {
  if (!userId) return { personalMemories: [], preferences: {} };

  const personalMemories = await getMemories({
    companyId,
    userId,
    memoryTier: MEMORY_TIERS.PERSONAL,
    status: MEMORY_STATUS.ACTIVE,
  });

  return {
    userId,
    personalMemories,
    totalPersonalMemories: personalMemories.length,
  };
}

/**
 * Retrieve team/workspace scoped context.
 */
export async function getTeamContext({ spaceId, companyId, userId }) {
  if (!spaceId) return { teamMemories: [] };

  const teamMemories = await getMemories({
    companyId,
    userId,
    spaceIds: [spaceId],
    memoryTier: MEMORY_TIERS.TEAM,
    status: MEMORY_STATUS.ACTIVE,
  });

  return {
    spaceId,
    teamMemories,
    totalTeamMemories: teamMemories.length,
  };
}

/**
 * Retrieve project-scoped context.
 */
export async function getProjectContext({ projectId, companyId, userId }) {
  const projectMemories = await getMemories({
    companyId,
    userId,
    queryText: projectId,
    status: MEMORY_STATUS.ACTIVE,
  });

  return {
    projectId,
    projectMemories,
  };
}

/**
 * Retrieve entity graph context.
 */
export async function getEntityContext({ entityId, companyId }) {
  return getEntityGraph(companyId, entityId);
}

/**
 * Phase 4: Graph-Aware Context Assembly
 *
 * Combines:
 *   1. Direct organizational memory context (Phase 2)
 *   2. Entity + relationship context (Phase 2 graph)
 *   3. Smart Moment context (Phase 3) — permission filtered
 *   4. Connected knowledge via graph traversal (Phase 4)
 *
 * Authorization is applied BEFORE content reaches this function's output.
 * The AI model should NEVER receive context the requesting user cannot access.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.userId
 * @param {string} params.userRole
 * @param {string[]} params.spaceIds - Authorized space IDs for this user
 * @param {string} params.query - User query for relevance ranking
 * @param {object} params.intentResult - From classifyQuery()
 * @param {boolean} params.isAdmin
 * @returns {object} { contextText, memories, smartMoments, entities, sources }
 */
export async function getGraphAwareContext({
  companyId,
  userId = null,
  userRole = 'member',
  spaceIds = [],
  query = '',
  intentResult = null,
  isAdmin = false,
}) {
  if (!companyId) return { contextText: '', memories: [], smartMoments: [], entities: [], sources: [] };

  const momentTypes = intentResult?.momentTypes || null;
  const timeFilter = intentResult?.timeFilter || null;

  // ── 1. Retrieve permission-filtered memories ───────────────────────────────
  const memories = await getRelevantMemories({
    companyId,
    userId,
    spaceIds,
    query,
    limit: 15,
  });

  // ── 2. Retrieve Smart Moments (Phase 3) — permission filtered by space ─────
  let momentQuery = supabase
    .from('clipad_v3_smart_moments')
    .select('id, title, description, moment_type, status, confidence, importance, team_space_id, meeting_id, created_at')
    .eq('company_id', companyId)
    .neq('status', 'dismissed')
    .order('created_at', { ascending: false })
    .limit(15);

  // Filter by team space access
  if (!isAdmin && spaceIds.length > 0) {
    momentQuery = momentQuery.or(
      `team_space_id.is.null,team_space_id.in.(${spaceIds.join(',')})`
    );
  } else if (!isAdmin) {
    momentQuery = momentQuery.is('team_space_id', null);
  }

  if (momentTypes?.length) {
    momentQuery = momentQuery.in('moment_type', momentTypes);
  }

  if (timeFilter?.since) {
    momentQuery = momentQuery.gte('created_at', timeFilter.since);
  }

  if (query?.trim()) {
    momentQuery = momentQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%`);
  }

  const { data: smartMoments } = await momentQuery;

  // ── 3. Find connected knowledge via graph (if query has topic candidates) ──
  let graphKnowledge = { entities: [], memories: [], smartMoments: [] };
  if (query?.trim()) {
    graphKnowledge = await findConnectedKnowledge(companyId, query, {
      userId,
      isAdmin,
      limit: 10,
    });
  }

  // ── 4. Merge and deduplicate ───────────────────────────────────────────────
  const allMemories = [...memories];
  const memoryIds = new Set(memories.map(m => m.id));
  (graphKnowledge.memories || []).forEach(m => {
    if (!memoryIds.has(m.id)) { allMemories.push(m); memoryIds.add(m.id); }
  });

  const allMoments = [...(smartMoments || [])];
  const momentIds = new Set(allMoments.map(m => m.id));
  (graphKnowledge.smartMoments || []).forEach(m => {
    if (!momentIds.has(m.id)) { allMoments.push(m); momentIds.add(m.id); }
  });

  // ── 5. Assemble context text ───────────────────────────────────────────────
  // --- Phase 8: Apply Intelligence Governance Layer ---
  let authMemories = allMemories;
  let authMoments = allMoments;
  let authEntities = graphKnowledge.entities || [];

  if (userId) {
    const govCtx = await resolveIntelligenceContext({ id: userId, company_id: companyId, role: userRole });
    authMemories = filterAuthorizedMemories(allMemories, govCtx);
    authMoments = filterAuthorizedMoments(allMoments, govCtx);
    authEntities = filterAuthorizedGraph({ nodes: authEntities, edges: [] }, govCtx).nodes;
  }

  const contextLines = [
    `# RELEVANT CONTEXT`
  ];

  if (authMemories.length > 0) {
    contextLines.push(`\nMEMORY NODES (${authMemories.length})`);
    authMemories.slice(0, 12).forEach(m => {
      contextLines.push(`[[${m.memory_type || 'FACT'}/${m.memory_tier || 'organizational'}]] "${m.title}": ${(m.content || m.summary || '').substring(0, 200)}`);
    });
  }

  if (authMoments.length > 0) {
    contextLines.push(`\nSMART MOMENTS (${authMoments.length})`);
    authMoments.slice(0, 12).forEach(m => {
      const src = m.meeting_id ? `Meeting:${m.meeting_id}` : 'Video';
      contextLines.push(`[[${m.moment_type}]] "${m.title}" (${Math.round((m.confidence || 0.9) * 100)}% confidence, from ${src}, ${new Date(m.created_at).toLocaleDateString()})`);
    });
  }

  if (authEntities.length > 0) {
    contextLines.push(`\nCONNECTED ENTITIES (${authEntities.length})`);
    authEntities.slice(0, 8).forEach(e => {
      contextLines.push(`[[${e.entity_type?.toUpperCase()}]] ${e.name}${e.description ? ': ' + e.description.substring(0, 120) : ''}`);
    });
  }

  // Build source provenance list
  const sources = [
    ...authMoments.map(m => ({ id: m.id, type: 'smart_moment', label: m.title, subType: m.moment_type })),
    ...authMemories.map(m => ({ id: m.id, type: 'memory', label: m.title, subType: m.memory_type })),
  ].slice(0, 20);

  return {
    contextText: contextLines.join('\n'),
    memories: authMemories,
    smartMoments: authMoments,
    entities: authEntities,
    sources,
  };
}

// ──────────────────────────────────────────────────────────────────
// STAGE 4: Organizational Context Assembly
// Formats direct evidence, related evidence, organizational context, and conflicts
// with deterministic deduplication and strict budget enforcement.
// ──────────────────────────────────────────────────────────────────

export const CONTEXT_BUDGETS = {
  MAX_TOTAL_CONTEXT_CHARS: 18000,
  MAX_RELATED_CONTEXT_CHARS: 4000,
  MAX_ORGANIZATIONAL_CONTEXT_CHARS: 2500,
};

/**
 * Assembles four-category structured organizational context:
 * A. Direct Evidence (prioritized, deduplicated)
 * B. Related Evidence (1-hop verified relationships, budgeted)
 * C. Organizational Context (people, teams, spaces, active decisions/blockers)
 * D. Conflicts and Uncertainty (status/date discrepancies detected across records)
 *
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} [params.userId=null]
 * @param {Array<string>} [params.accessibleSpaceIds=[]]
 * @param {Array<Object>} [params.directEvidence=[]]
 * @param {Array<Object>} [params.relatedEvidence=[]]
 * @param {Array<Object>} [params.organizationalEntities=[]]
 * @param {string} [params.query='']
 * @returns {Object} Structured context pack
 */
export function assembleOrganizationalContext({
  companyId,
  userId = null,
  accessibleSpaceIds = [],
  directEvidence = [],
  relatedEvidence = [],
  organizationalEntities = [],
  query = '',
}) {
  const spaceSet = new Set((accessibleSpaceIds || []).map(String));

  // 1. Permission security enforcement: filter out any cross-tenant or private space records
  const authDirect = (directEvidence || []).filter(item => {
    if (item.company_id && item.company_id !== companyId) return false;
    const isPrivate = item.is_private === true || item.metadata?.is_private === true;
    const spaceId = item.space_id || item.team_space_id || item.metadata?.space_id;
    if (isPrivate && (!spaceId || !spaceSet.has(String(spaceId)))) return false;
    return true;
  });

  const authRelated = (relatedEvidence || []).filter(item => {
    if (item.company_id && item.company_id !== companyId) return false;
    const isPrivate = item.is_private === true || item.metadata?.is_private === true;
    const spaceId = item.space_id || item.team_space_id || item.metadata?.space_id;
    if (isPrivate && (!spaceId || !spaceSet.has(String(spaceId)))) return false;
    return true;
  });

  const authEntities = (organizationalEntities || []).filter(e => {
    if (e.company_id && e.company_id !== companyId) return false;
    const isPrivate = e.is_private === true || e.metadata?.is_private === true;
    const spaceId = e.space_id || e.team_space_id || e.metadata?.space_id;
    if (isPrivate && (!spaceId || !spaceSet.has(String(spaceId)))) return false;
    return true;
  });

  // 2. Prioritization & Deduplication across evidence
  const allCandidateEvidence = [
    ...authDirect.map(d => ({ ...d, isRelatedEvidence: false })),
    ...authRelated.map(r => ({ ...r, isRelatedEvidence: true })),
  ];

  // Deterministic sorting and duplicate excision
  const directList = [];
  const relatedList = [];
  const seenIds = new Set();
  const seenContent = new Map();

  for (const item of allCandidateEvidence) {
    const id = String(item.id || '');
    if (seenIds.has(id)) continue;

    const raw = (item.snippet || item.content || item.summary || item.description || '').trim().toLowerCase();
    if (raw.length > 20 && seenContent.has(raw)) {
      const existing = seenContent.get(raw);
      // Check if there is a meaningful contradiction in status
      const st1 = (existing.status || existing.state || '').toLowerCase();
      const st2 = (item.status || item.state || '').toLowerCase();
      if (st1 === st2) {
        continue; // duplicate content with same status: prune
      }
    }

    seenIds.add(id);
    if (raw.length > 20) seenContent.set(raw, item);

    if (item.isRelatedEvidence) {
      relatedList.push(item);
    } else {
      directList.push(item);
    }
  }

  // 3. Category D: Conflicts and Uncertainty Detection
  const conflicts = [];
  const statusTracker = new Map();
  for (const item of [...directList, ...relatedList]) {
    const title = (item.label || item.title || item.name || '').trim();
    const status = (item.status || item.state || item.metadata?.status || '').trim();
    const date = item.updated_at || item.created_at;

    if (title && status) {
      const norm = title.toLowerCase();
      if (statusTracker.has(norm)) {
        const prev = statusTracker.get(norm);
        if (prev.status.toLowerCase() !== status.toLowerCase()) {
          conflicts.push({
            subject: title,
            description: `Differing record status for "${title}": recorded as "${prev.status}" (${prev.date ? prev.date.slice(0, 10) : 'earlier'}) vs "${status}" (${date ? date.slice(0, 10) : 'subsequent'}).`,
          });
        }
      } else {
        statusTracker.set(norm, { title, status, date });
      }
    }
  }

  // 4. Budget Enforcement & Assembly
  let totalChars = 0;
  const directBlocks = [];
  const relatedBlocks = [];
  const citationMap = [];

  let directIdx = 1;
  let relatedIdx = 1;

  // A. Format Direct Evidence (Highest priority)
  for (const item of directList) {
    if (totalChars >= CONTEXT_BUDGETS.MAX_TOTAL_CONTEXT_CHARS) {
      citationMap.push({ index: `${directIdx}`, id: item.id, title: item.title, isTruncated: true, isRelated: false });
      directIdx++;
      continue;
    }
    const title = item.label || item.title || item.name || 'Direct Record';
    const content = item.snippet || item.content || item.summary || item.description || '';
    const slice = content.length > 2000 ? content.slice(0, 2000) + '\n[... truncated ...]' : content;
    const block = `[DIRECT EVIDENCE #${directIdx}: ${title}]\nTYPE: ${item.type || 'record'}\nCONTENT:\n${slice}`;

    if (totalChars + block.length <= CONTEXT_BUDGETS.MAX_TOTAL_CONTEXT_CHARS) {
      directBlocks.push(block);
      totalChars += block.length;
      citationMap.push({ index: `${directIdx}`, id: item.id, title, isTruncated: content.length > 2000, isRelated: false });
      directIdx++;
    } else {
      citationMap.push({ index: `${directIdx}`, id: item.id, title, isTruncated: true, isRelated: false });
      directIdx++;
    }
  }

  // B. Format Related Evidence (Cap at MAX_RELATED_CONTEXT_CHARS sub-budget)
  let relatedChars = 0;
  for (const item of relatedList) {
    if (relatedChars >= CONTEXT_BUDGETS.MAX_RELATED_CONTEXT_CHARS || totalChars >= CONTEXT_BUDGETS.MAX_TOTAL_CONTEXT_CHARS) {
      citationMap.push({ index: `R${relatedIdx}`, id: item.id, title: item.title, isTruncated: true, isRelated: true });
      relatedIdx++;
      continue;
    }
    const title = item.label || item.title || item.name || 'Related Context';
    const content = item.snippet || item.content || item.summary || item.description || '';
    const slice = content.length > 2000 ? content.slice(0, 2000) + '\n[... truncated ...]' : content;
    const relInfo = item.relationship ? ` (Via ${item.relationship.type} to "${item.relationship.seedTitle || 'query seed'}")` : '';
    const block = `[RELATED EVIDENCE #R${relatedIdx}: ${title}${relInfo}]\nTYPE: ${item.type || 'record'}\nCONTENT:\n${slice}`;

    if (relatedChars + block.length <= CONTEXT_BUDGETS.MAX_RELATED_CONTEXT_CHARS && (totalChars + block.length) <= CONTEXT_BUDGETS.MAX_TOTAL_CONTEXT_CHARS) {
      relatedBlocks.push(block);
      relatedChars += block.length;
      totalChars += block.length;
      citationMap.push({ index: `R${relatedIdx}`, id: item.id, title, isTruncated: content.length > 2000, isRelated: true, relationship: item.relationship });
      relatedIdx++;
    } else {
      citationMap.push({ index: `R${relatedIdx}`, id: item.id, title, isTruncated: true, isRelated: true });
      relatedIdx++;
    }
  }

  // C. Category C: Organizational Context (Entities, Teams, Projects)
  const orgBlocks = [];
  let orgChars = 0;
  for (const ent of authEntities) {
    if (orgChars >= CONTEXT_BUDGETS.MAX_ORGANIZATIONAL_CONTEXT_CHARS || totalChars >= CONTEXT_BUDGETS.MAX_TOTAL_CONTEXT_CHARS) break;
    const line = `• [[${(ent.entity_type || 'entity').toUpperCase()}]] ${ent.name}${ent.description ? `: ${ent.description.slice(0, 150)}` : ''}`;
    if (orgChars + line.length <= CONTEXT_BUDGETS.MAX_ORGANIZATIONAL_CONTEXT_CHARS && totalChars + line.length <= CONTEXT_BUDGETS.MAX_TOTAL_CONTEXT_CHARS) {
      orgBlocks.push(line);
      orgChars += line.length;
      totalChars += line.length;
    }
  }

  // Construct structured context document
  const sections = [];
  if (directBlocks.length > 0) {
    sections.push(`=== DIRECT EVIDENCE (${directBlocks.length} records) ===\n\n` + directBlocks.join('\n\n---\n\n'));
  }
  if (relatedBlocks.length > 0) {
    sections.push(`=== RELATED ORGANIZATIONAL CONTEXT (1-HOP RELATIONSHIPS) ===\n\n` + relatedBlocks.join('\n\n---\n\n'));
  }
  if (orgBlocks.length > 0) {
    sections.push(`=== ORGANIZATIONAL CONTEXT (ENTITIES & TEAMS) ===\n\n` + orgBlocks.join('\n'));
  }
  if (conflicts.length > 0) {
    sections.push(`=== POTENTIAL CONFLICTS & DISCREPANCIES ===\n\n` + conflicts.map(c => `⚠ ${c.description}`).join('\n'));
  }

  return {
    contextText: sections.join('\n\n======\n\n'),
    directCount: directBlocks.length,
    relatedCount: relatedBlocks.length,
    orgEntitiesCount: orgBlocks.length,
    conflicts,
    citationMap,
    totalChars,
  };
}
