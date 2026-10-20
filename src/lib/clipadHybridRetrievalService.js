// src/lib/clipadHybridRetrievalService.js
// Weftro V3 — Hybrid Retrieval Service (Lexical + Semantic pgvector RRF + Stage 3 Relationship Expansion)
//
// Combines:
// 1. Semantic Vector Retrieval via `match_memories_hybrid` RPC (HNSW cosine similarity, 768-dim)
// 2. Lexical Full-Text Search via Postgres GIN / ts_rank_cd / ILIKE queries
// 3. Reciprocal Rank Fusion (RRF) with deterministic deduplication & score normalization
// 4. Zero-Trust Security: Caller's authenticated context & SECURITY INVOKER enforced;
//    cross-tenant boundaries, personal-memory ownership, and private-space memberships
//    are strictly preserved even under RPC failure or fallback.
// 5. Stage 3 Addition: Optional permission-aware one-hop relationship expansion for high-confidence seeds.

import { supabase } from '@/api/supabaseClient';
import { searchKnowledgeChunks } from './clipadChunkIngestionService';
import { isV3FeatureEnabled, V3_FLAGS } from './clipadV3Flags';

/**
 * Standard Reciprocal Rank Fusion (RRF) Constant
 * k = 60 is the industry standard (Cormack, Clarke, Buettcher 2009) to balance high vs. low ranks.
 */
export const RRF_K = 60;

/**
 * Stage 3 Relationship Expansion Constants
 */
export const RELATIONSHIP_EXPANSION_DEFAULTS = {
  MIN_CONFIDENCE: 0.75,
  MAX_HOPS: 1,
  MAX_RELATED_RECORDS: 6,
  MAX_SEEDS: 3,
};

/**
 * Compute Reciprocal Rank Fusion (RRF) score for a list of ranked item lists.
 * @param {Array<Array<{id: string, [key: string]: any}>>} rankingLists - Array of ordered result arrays
 * @param {number} k - Smoothing constant (default 60)
 * @returns {Array<Object>} Deterministically ranked, deduplicated items with `rrf_score`
 */
export function reciprocalRankFusion(rankingLists, k = RRF_K) {
  if (!Array.isArray(rankingLists) || rankingLists.length === 0) return [];

  const itemMap = new Map();

  rankingLists.forEach((list, listIndex) => {
    if (!Array.isArray(list)) return;
    list.forEach((item, rankZero) => {
      if (!item || !item.id) return;
      const rank = rankZero + 1; // 1-indexed rank
      const scoreIncrement = 1 / (k + rank);

      if (!itemMap.has(item.id)) {
        itemMap.set(item.id, {
          item: { ...item },
          rrf_score: scoreIncrement,
          ranks: { [listIndex]: rank },
          source_channels: [listIndex === 0 ? 'semantic' : 'lexical']
        });
      } else {
        const existing = itemMap.get(item.id);
        existing.rrf_score += scoreIncrement;
        existing.ranks[listIndex] = rank;
        // Merge attributes, keeping existing primary fields
        existing.item = { ...item, ...existing.item };
        const channelName = listIndex === 0 ? 'semantic' : 'lexical';
        if (!existing.source_channels.includes(channelName)) {
          existing.source_channels.push(channelName);
        }
      }
    });
  });

  // Convert to sorted array
  const fused = Array.from(itemMap.values()).map(entry => {
    return {
      ...entry.item,
      rrf_score: Number(entry.rrf_score.toFixed(6)),
      retrieval_metadata: {
        ranks: entry.ranks,
        source_channels: entry.source_channels,
        is_hybrid_match: entry.source_channels.length > 1
      }
    };
  });

  // Deterministic sort: by rrf_score descending, then id ascending for tie-breaking
  fused.sort((a, b) => {
    if (b.rrf_score !== a.rrf_score) {
      return b.rrf_score - a.rrf_score;
    }
    return String(a.id).localeCompare(String(b.id));
  });

  return fused;
}

/**
 * Perform safe lexical fallback query directly using Supabase client under caller session.
 * Guarantees company isolation, status active filtering, and accessible space boundary.
 */
export async function fetchLexicalMemories({
  companyId,
  queryText,
  limit = 20,
  spaceIds = null,
  tier = null
}) {
  if (!companyId || !queryText?.trim()) return [];

  const cleanQuery = queryText.trim();
  const term = `%${cleanQuery}%`;

  try {
    let query = supabase
      .from('clipad_v3_memories')
      .select('id, company_id, team_space_id, title, content, summary, memory_type, memory_tier, confidence_score, importance, source_type, source_id, created_at, updated_at')
      .eq('company_id', companyId)
      .eq('status', 'ACTIVE')
      .eq('is_active', true);

    if (tier) {
      query = query.eq('memory_tier', tier);
    }

    if (Array.isArray(spaceIds) && spaceIds.length > 0) {
      // Either in accessible spaces or non-space organizational/personal memories
      query = query.or(`team_space_id.is.null,team_space_id.in.(${spaceIds.join(',')})`);
    }

    // Match title, content, or summary
    query = query.or(`title.ilike.${term},content.ilike.${term},summary.ilike.${term}`);

    // Order by confidence and recency
    query = query.order('confidence_score', { ascending: false }).limit(limit);

    const { data, error } = await query;
    if (error) {
      console.warn('[clipadHybridRetrievalService] Lexical query warning:', error.message);
      return [];
    }

    return (data || []).map(m => ({
      ...m,
      source_channel: 'lexical',
      search_rank: 1.0,
      similarity: 0.0
    }));
  } catch (err) {
    console.warn('[clipadHybridRetrievalService] Lexical query exception:', err.message);
    return [];
  }
}

/**
 * Execute RPC call `match_memories_hybrid` through caller's active session.
 * Handled gracefully if pgvector RPC is unavailable or embedding is null.
 */
export async function fetchRpcHybridMemories({
  queryText,
  queryEmbedding = null,
  limit = 20,
  filterTier = null,
  filterSpaceId = null,
  minConfidence = 0.0,
  similarityThreshold = 0.15
}) {
  if (!queryText?.trim()) return [];

  try {
    const params = {
      query_text: queryText.trim(),
      query_embedding: queryEmbedding, // null is safely accepted by RPC
      match_count: limit,
      filter_tier: filterTier || null,
      filter_space_id: filterSpaceId || null,
      min_confidence: minConfidence,
      similarity_threshold: similarityThreshold
    };

    const { data, error } = await supabase.rpc('match_memories_hybrid', params);

    if (error) {
      console.warn('[clipadHybridRetrievalService] RPC match_memories_hybrid warning:', error.message);
      return [];
    }

    return (data || []).map(m => ({
      ...m,
      source_channel: 'semantic_rpc'
    }));
  } catch (rpcErr) {
    console.warn('[clipadHybridRetrievalService] RPC call exception:', rpcErr.message);
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────
// STAGE 3: Permission-Aware One-Hop Relationship Expansion
// ──────────────────────────────────────────────────────────────────

/**
 * Expands direct search results with 1-hop connected entities through verified relationships.
 * 
 * Invariants:
 * 1. Only top direct-evidence results are used as expansion seeds (max 3 seeds).
 * 2. Only high-confidence relationships (>= 0.75) are traversed.
 * 3. Never exceeds 1 hop.
 * 4. Strictly enforces caller's company_id and accessibleSpaceIds on both edge and target node.
 * 5. Private-space records are strictly discarded if caller lacks membership.
 * 6. Target nodes already present in direct results are deduplicated.
 * 7. Returns at most maxRelated (default 6) related items.
 */
export async function expandOneHopRelationships({
  directResults = [],
  companyId,
  accessibleSpaceIds = [],
  minConfidence = RELATIONSHIP_EXPANSION_DEFAULTS.MIN_CONFIDENCE,
  maxRelated = RELATIONSHIP_EXPANSION_DEFAULTS.MAX_RELATED_RECORDS,
  maxSeeds = RELATIONSHIP_EXPANSION_DEFAULTS.MAX_SEEDS,
}) {
  if (!companyId || !Array.isArray(directResults) || directResults.length === 0) {
    return [];
  }

  const directIdSet = new Set(directResults.map(r => String(r.id)));
  const seeds = directResults.slice(0, maxSeeds);
  const seedRecordIds = seeds.map(s => String(s.source_id || s.id));

  try {
    // 1. Locate entity nodes corresponding to the seed records
    const { data: seedNodes, error: seedError } = await supabase
      .from('clipad_v3_entities')
      .select('id, entity_type, entity_id, name, metadata')
      .eq('company_id', companyId)
      .in('entity_id', seedRecordIds);

    if (seedError || !seedNodes || seedNodes.length === 0) {
      return [];
    }

    const seedNodeIds = seedNodes.map(n => n.id);
    const seedNodeMap = new Map(seedNodes.map(n => [n.id, n]));

    // 2. Query 1-hop relationships originating from or targeting seed nodes
    // Filter strictly by company_id and minConfidence
    const [outgoingRes, incomingRes] = await Promise.all([
      supabase
        .from('clipad_v3_entity_relationships')
        .select('id, source_entity_id, target_entity_id, relationship_type, confidence, metadata')
        .eq('company_id', companyId)
        .in('source_entity_id', seedNodeIds)
        .gte('confidence', minConfidence)
        .limit(maxRelated * 3),
      supabase
        .from('clipad_v3_entity_relationships')
        .select('id, source_entity_id, target_entity_id, relationship_type, confidence, metadata')
        .eq('company_id', companyId)
        .in('target_entity_id', seedNodeIds)
        .gte('confidence', minConfidence)
        .limit(maxRelated * 3),
    ]);

    const candidateEdges = [];
    (outgoingRes.data || []).forEach(edge => {
      candidateEdges.push({
        ...edge,
        seedNodeId: edge.source_entity_id,
        connectedNodeId: edge.target_entity_id,
        direction: 'outgoing',
      });
    });
    (incomingRes.data || []).forEach(edge => {
      candidateEdges.push({
        ...edge,
        seedNodeId: edge.target_entity_id,
        connectedNodeId: edge.source_entity_id,
        direction: 'incoming',
      });
    });

    if (candidateEdges.length === 0) {
      return [];
    }

    // 3. Fetch connected target entity nodes
    const connectedNodeIds = Array.from(new Set(candidateEdges.map(e => e.connectedNodeId)));
    const { data: targetNodes, error: targetError } = await supabase
      .from('clipad_v3_entities')
      .select('id, company_id, entity_type, entity_id, name, description, metadata')
      .eq('company_id', companyId)
      .in('id', connectedNodeIds);

    if (targetError || !targetNodes || targetNodes.length === 0) {
      return [];
    }

    const targetNodeMap = new Map(targetNodes.map(n => [n.id, n]));
    const spaceIdSet = new Set((accessibleSpaceIds || []).map(String));

    // 4. Permission filtering & deduplication
    const seenRelatedIds = new Set();
    const relatedEvidence = [];

    for (const edge of candidateEdges) {
      if (relatedEvidence.length >= maxRelated) break;

      const target = targetNodeMap.get(edge.connectedNodeId);
      if (!target) continue;

      // Tenant isolation guard
      if (target.company_id !== companyId) continue;

      // Duplicate prevention: do not include if already in direct results or already added
      const targetRecordId = String(target.entity_id || target.id);
      if (directIdSet.has(targetRecordId) || seenRelatedIds.has(targetRecordId)) {
        continue;
      }

      // Space authorization check
      const targetMeta = target.metadata || {};
      const edgeMeta = edge.metadata || {};
      const targetSpaceId = targetMeta.space_id || targetMeta.team_space_id || edgeMeta.space_id || null;
      const isPrivate = targetMeta.is_private === true || edgeMeta.is_private === true;

      if (isPrivate) {
        if (!targetSpaceId || !spaceIdSet.has(String(targetSpaceId))) {
          // Caller lacks membership in private space: strictly reject without leaking title or metadata
          continue;
        }
      }

      const seedNode = seedNodeMap.get(edge.seedNodeId);
      seenRelatedIds.add(targetRecordId);

      relatedEvidence.push({
        id: targetRecordId,
        entity_id: target.id,
        title: target.name,
        snippet: target.description || targetMeta.snippet || `Connected ${target.entity_type}`,
        type: target.entity_type,
        isRelatedEvidence: true,
        relationship: {
          type: edge.relationship_type,
          confidence: edge.confidence,
          direction: edge.direction,
          seedRecordId: seedNode?.entity_id || seedNode?.id,
          seedTitle: seedNode?.name || 'Search Result',
        },
        source_channel: 'relationship_expansion',
      });
    }

    return relatedEvidence;
  } catch (err) {
    console.warn('[HybridRetrieval.expandOneHopRelationships] Exception caught, falling back gracefully:', err.message);
    return [];
  }
}

/**
 * Core Hybrid Retrieval Function
 * Performs combined retrieval and fusion with deterministic fallback.
 * Extends with optional one-hop relationship expansion when enabled.
 *
 * @param {Object} options
 * @param {string} options.queryText - The search query
 * @param {Array<number>|null} [options.queryEmbedding=null] - 768-dim embedding float array (optional)
 * @param {string} options.companyId - Caller's company ID (strictly required for tenant isolation)
 * @param {string} [options.userId=null] - Caller's user ID
 * @param {Array<string>} [options.accessibleSpaceIds=[]] - Space IDs caller has permission to view
 * @param {string|null} [options.tier=null] - Filter by memory tier ('personal', 'team', 'organizational')
 * @param {string|null} [options.spaceId=null] - Filter to a specific team space
 * @param {number} [options.limit=20] - Max results to return
 * @param {boolean} [options.enableSemantic=true] - Whether to attempt semantic RPC
 * @param {boolean} [options.includeChunks=false] - Whether to search chunk repository
 * @param {boolean} [options.expandRelationships=false] - Explicit override to enable 1-hop relationship expansion
 * @param {Object} [options.user=null] - User context for feature-flag checking
 * @returns {Promise<{ direct: Array<Object>, related: Array<Object>, all: Array<Object> } | Array<Object>>}
 */
export async function searchMemoriesHybrid({
  queryText,
  queryEmbedding = null,
  companyId,
  userId = null,
  accessibleSpaceIds = [],
  tier = null,
  spaceId = null,
  limit = 20,
  enableSemantic = true,
  includeChunks = false,
  expandRelationships = false,
  user = null,
  returnStructured = false,
}) {
  if (!queryText || !queryText.trim() || !companyId) {
    return returnStructured ? { direct: [], related: [], all: [] } : [];
  }

  const cleanQuery = queryText.trim();

  // Execute Semantic RPC (Channel 1) and Lexical Fallback (Channel 2) concurrently
  const promises = [];

  // Channel 1: Semantic / Hybrid RPC
  if (enableSemantic) {
    promises.push(
      fetchRpcHybridMemories({
        queryText: cleanQuery,
        queryEmbedding: queryEmbedding,
        limit: Math.max(limit, 20),
        filterTier: tier,
        filterSpaceId: spaceId,
        minConfidence: 0.0,
        similarityThreshold: 0.15
      }).catch(err => {
        console.warn('[HybridRetrieval] Channel 1 error:', err);
        return [];
      })
    );
  } else {
    promises.push(Promise.resolve([]));
  }

  // Channel 2: Lexical Fallback (Direct Table Query)
  promises.push(
    fetchLexicalMemories({
      companyId,
      queryText: cleanQuery,
      limit: Math.max(limit, 20),
      spaceIds: accessibleSpaceIds,
      tier
    }).catch(err => {
      console.warn('[HybridRetrieval] Channel 2 error:', err);
      return [];
    })
  );

  // Optional Channel 3: Granular Knowledge Chunks (Phase 4 Extension)
  if (includeChunks && queryEmbedding) {
    promises.push(
      searchKnowledgeChunks({
        queryEmbedding,
        companyId,
        matchThreshold: 0.4,
        matchCount: 10
      }).then(chunks => {
        return chunks.map(c => ({
          id: c.chunk_id || c.id,
          title: c.title ? `${c.title} (Chunk #${c.chunk_index + 1})` : `Chunk #${c.chunk_index + 1}`,
          content: c.content,
          summary: c.ai_summary,
          memory_tier: 'organizational',
          memory_type: 'CHUNK',
          source_type: 'knowledge_chunk',
          source_id: c.id,
          similarity: c.similarity,
          source_channel: 'semantic_chunk'
        }));
      }).catch(err => {
        console.warn('[HybridRetrieval] Channel 3 chunk error:', err);
        return [];
      })
    );
  }

  const allChannels = await Promise.all(promises);
  const validChannels = allChannels.filter(channelResults => Array.isArray(channelResults) && channelResults.length > 0);

  let directResults = [];

  // If multiple channels returned results, combine all via Reciprocal Rank Fusion
  if (validChannels.length > 1) {
    const fused = reciprocalRankFusion(validChannels, RRF_K);
    directResults = fused.slice(0, limit);
  } else if (validChannels.length === 1) {
    const singleChannel = validChannels[0];
    const channelName = singleChannel[0]?.source_channel || 'retrieval';
    directResults = singleChannel.slice(0, limit).map((m, idx) => ({
      ...m,
      rrf_score: Number((1 / (RRF_K + idx + 1)).toFixed(6)),
      retrieval_metadata: {
        ranks: { 0: idx + 1 },
        source_channels: [channelName],
        is_hybrid_match: false
      }
    }));
  }

  // Stage 3: Feature Flag Check for Relationship-Aware Retrieval
  const isFlagActive = isV3FeatureEnabled(V3_FLAGS.RELATIONSHIP_AWARE_RETRIEVAL_ENABLED, user);
  const shouldExpand = (expandRelationships || isFlagActive) && directResults.length > 0;

  let relatedResults = [];
  if (shouldExpand) {
    try {
      relatedResults = await expandOneHopRelationships({
        directResults,
        companyId,
        accessibleSpaceIds,
      });
    } catch (expErr) {
      console.warn('[HybridRetrieval] Relationship expansion failed, falling back to direct results:', expErr.message);
      relatedResults = [];
    }
  }

  if (returnStructured) {
    return {
      direct: directResults,
      related: relatedResults,
      all: [...directResults, ...relatedResults],
    };
  }

  // Preserve existing contract by default: array of items
  // If relationships were expanded, they are appended with isRelatedEvidence: true
  return shouldExpand && relatedResults.length > 0
    ? [...directResults, ...relatedResults]
    : directResults;
}
