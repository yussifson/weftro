// src/lib/clipadHybridRetrievalService.js
// Weftro V3 — Hybrid Retrieval Service (Lexical + Semantic pgvector RRF)
// Author: AGENT-RAG (Phase 3 Implementation)
//
// Combines:
// 1. Semantic Vector Retrieval via `match_memories_hybrid` RPC (HNSW cosine similarity, 768-dim)
// 2. Lexical Full-Text Search via Postgres GIN / ts_rank_cd / ILIKE queries
// 3. Reciprocal Rank Fusion (RRF) with deterministic deduplication & score normalization
// 4. Zero-Trust Security: Caller's authenticated context & SECURITY INVOKER enforced;
//    cross-tenant boundaries, personal-memory ownership, and private-space memberships
//    are strictly preserved even under RPC failure or fallback.

import { supabase } from '@/api/supabaseClient';
import { searchKnowledgeChunks } from './clipadChunkIngestionService';

/**
 * Standard Reciprocal Rank Fusion (RRF) Constant
 * k = 60 is the industry standard (Cormack, Clarke, Buettcher 2009) to balance high vs. low ranks.
 */
export const RRF_K = 60;

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

/**
 * Core Hybrid Retrieval Function
 * Performs combined retrieval and fusion with deterministic fallback.
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
 * @returns {Promise<Array<Object>>} Deduplicated, fused, permission-scoped results
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
  includeChunks = false
}) {
  if (!queryText || !queryText.trim() || !companyId) {
    return [];
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

  // If multiple channels returned results, combine all via Reciprocal Rank Fusion
  if (validChannels.length > 1) {
    const fused = reciprocalRankFusion(validChannels, RRF_K);
    return fused.slice(0, limit);
  }

  // If only one channel returned results, format and return it
  if (validChannels.length === 1) {
    const singleChannel = validChannels[0];
    const channelName = singleChannel[0]?.source_channel || 'retrieval';
    return singleChannel.slice(0, limit).map((m, idx) => ({
      ...m,
      rrf_score: Number((1 / (RRF_K + idx + 1)).toFixed(6)),
      retrieval_metadata: {
        ranks: { 0: idx + 1 },
        source_channels: [channelName],
        is_hybrid_match: false
      }
    }));
  }

  return [];
}
