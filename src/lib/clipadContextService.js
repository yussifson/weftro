// src/lib/clipadContextService.js
// Clipad V3 Domain Organizational Context & Memory Retrieval Service

import { supabase } from '@/api/supabaseClient';
import { getMemories, MEMORY_STATUS, MEMORY_TIERS } from '@/lib/clipadMemoryService';
import { getEntityGraph } from '@/lib/clipadEntityService';

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
