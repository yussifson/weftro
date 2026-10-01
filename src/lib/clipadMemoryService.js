// src/lib/clipadMemoryService.js
// Clipad V3 Core Organizational Memory Service
// Manages Personal, Team, and Organizational Memories with lifecycle and provenance tracking.

import { supabase } from '@/api/supabaseClient';

export const MEMORY_TIERS = {
  PERSONAL: 'personal',
  TEAM: 'team',
  ORGANIZATIONAL: 'organizational',
};

export const MEMORY_TYPES = {
  FACT: 'FACT',
  DECISION: 'DECISION',
  COMMITMENT: 'COMMITMENT',
  PREFERENCE: 'PREFERENCE',
  PROCESS: 'PROCESS',
  POLICY: 'POLICY',
  PROJECT_CONTEXT: 'PROJECT_CONTEXT',
  PERSON_CONTEXT: 'PERSON_CONTEXT',
  TEAM_CONTEXT: 'TEAM_CONTEXT',
  ORGANIZATIONAL_CONTEXT: 'ORGANIZATIONAL_CONTEXT',
  INSIGHT: 'INSIGHT',
  SUMMARY: 'SUMMARY',
  EVENT: 'EVENT',
  RELATIONSHIP: 'RELATIONSHIP',
};

export const MEMORY_STATUS = {
  ACTIVE: 'ACTIVE',
  OUTDATED: 'OUTDATED',
  SUPERSEDED: 'SUPERSEDED',
  ARCHIVED: 'ARCHIVED',
  DELETED: 'DELETED',
};

/**
 * Create a new permission-aware memory entry.
 */
export async function createMemory({
  companyId,
  userId = null,
  teamSpaceId = null,
  memoryTier = MEMORY_TIERS.ORGANIZATIONAL,
  memoryType = MEMORY_TYPES.FACT,
  title,
  content,
  summary = null,
  confidenceScore = 1.0,
  freshnessScore = 1.0,
  importance = 0.5,
  sourceType = null,
  sourceId = null,
  sourceUrl = null,
  sourceMetadata = {},
  speakerId = null,
  speakerName = null,
  timestampMarker = null,
  permissionsPolicy = { visibility: 'inherit' },
  metadata = {},
  status = MEMORY_STATUS.ACTIVE,
  expiresAt = null,
}) {
  if (!companyId && memoryTier !== MEMORY_TIERS.PERSONAL) {
    throw new Error('companyId is required for team or organizational memories.');
  }
  if (!title || !content) {
    throw new Error('Memory title and content are required.');
  }

  // Force scope restriction if source/policy is marked private
  let effectiveTier = memoryTier;
  if (permissionsPolicy?.is_private || permissionsPolicy?.visibility === 'personal') {
    effectiveTier = MEMORY_TIERS.PERSONAL;
  } else if (memoryTier === MEMORY_TIERS.TEAM && !teamSpaceId) {
    throw new Error('teamSpaceId is required for team tier memories.');
  }

  const newMemory = {
    company_id: companyId,
    user_id: userId,
    team_space_id: effectiveTier === MEMORY_TIERS.TEAM ? teamSpaceId : null,
    memory_tier: effectiveTier,
    memory_type: memoryType,
    title,
    content,
    summary: summary || title,
    confidence_score: Math.min(1.0, Math.max(0.0, Number(confidenceScore) || 1.0)),
    freshness_score: Math.min(1.0, Math.max(0.0, Number(freshnessScore) || 1.0)),
    importance: Math.min(1.0, Math.max(0.0, Number(importance) || 0.5)),
    source_type: sourceType,
    source_id: sourceId ? String(sourceId) : null,
    source_url: sourceUrl,
    source_metadata: sourceMetadata || {},
    speaker_id: speakerId,
    speaker_name: speakerName,
    timestamp_marker: timestampMarker,
    permissions_policy: permissionsPolicy || { visibility: 'inherit' },
    is_active: status === MEMORY_STATUS.ACTIVE,
    status,
    metadata: metadata || {},
    version: 1,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_verified_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('clipad_v3_memories')
    .insert(newMemory)
    .select('*')
    .single();

  if (error) {
    console.error('[clipadMemoryService.createMemory] Error:', error);
    // Fallback in-memory representation if database is not reachable during client operation
    return { id: crypto.randomUUID(), ...newMemory };
  }

  return data;
}

/**
 * Retrieve memories filtered by tier, type, status, and permissions.
 */
export async function getMemories({
  companyId = null,
  userId = null,
  spaceIds = [],
  memoryTier = null,
  memoryType = null,
  status = MEMORY_STATUS.ACTIVE,
  minConfidence = 0,
  queryText = '',
  limit = 50,
  offset = 0,
}) {
  try {
    let q = supabase
      .from('clipad_v3_memories')
      .select('*')
      .order('updated_at', { ascending: false });

    if (companyId) {
      q = q.eq('company_id', companyId);
    }

    if (status) {
      q = q.eq('status', status);
    }

    if (memoryTier) {
      q = q.eq('memory_tier', memoryTier);
    }

    if (memoryType) {
      q = q.eq('memory_type', memoryType);
    }

    if (minConfidence > 0) {
      q = q.gte('confidence_score', minConfidence);
    }

    if (limit) {
      q = q.range(offset, offset + limit - 1);
    }

    const { data, error } = await q;

    if (error || !data) return [];

    // Filter in JS for fine-grained space & scope permissions
    return data.filter(mem => {
      // 1. Personal tier filter
      if (mem.memory_tier === MEMORY_TIERS.PERSONAL) {
        return mem.user_id === userId;
      }
      // 2. Team tier filter
      if (mem.memory_tier === MEMORY_TIERS.TEAM && mem.team_space_id) {
        if (spaceIds.length > 0 && !spaceIds.includes(mem.team_space_id)) {
          return false;
        }
      }
      // 3. Query text filter if requested
      if (queryText && queryText.trim()) {
        const text = (mem.title + ' ' + mem.content + ' ' + (mem.summary || '')).toLowerCase();
        if (!text.includes(queryText.toLowerCase().trim())) {
          return false;
        }
      }
      return true;
    });
  } catch (err) {
    console.error('[clipadMemoryService.getMemories] Error:', err);
    return [];
  }
}

/**
 * Update an existing memory.
 */
export async function updateMemory(memoryId, updates) {
  if (!memoryId) return null;

  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('clipad_v3_memories')
    .update(payload)
    .eq('id', memoryId)
    .select('*')
    .single();

  if (error) {
    console.error('[clipadMemoryService.updateMemory] Error:', error);
    return null;
  }
  return data;
}

/**
 * Supersede an existing memory with a new updated memory while preserving provenance and version history.
 */
export async function supersedeMemory(oldMemoryId, newMemoryData) {
  if (!oldMemoryId) throw new Error('oldMemoryId is required to supersede memory');

  // 1. Fetch current memory
  const { data: oldMemory, error: fetchErr } = await supabase
    .from('clipad_v3_memories')
    .select('*')
    .eq('id', oldMemoryId)
    .single();

  const currentVersion = oldMemory?.version || 1;

  // 2. Create new memory linked as successor
  const created = await createMemory({
    companyId: newMemoryData.companyId || oldMemory?.company_id,
    userId: newMemoryData.userId || oldMemory?.user_id,
    teamSpaceId: newMemoryData.teamSpaceId || oldMemory?.team_space_id,
    memoryTier: newMemoryData.memoryTier || oldMemory?.memory_tier,
    memoryType: newMemoryData.memoryType || oldMemory?.memory_type,
    title: newMemoryData.title,
    content: newMemoryData.content,
    summary: newMemoryData.summary || newMemoryData.title,
    confidenceScore: newMemoryData.confidenceScore ?? oldMemory?.confidence_score ?? 1.0,
    importance: newMemoryData.importance ?? oldMemory?.importance ?? 0.5,
    sourceType: newMemoryData.sourceType || oldMemory?.source_type,
    sourceId: newMemoryData.sourceId || oldMemory?.source_id,
    sourceUrl: newMemoryData.sourceUrl || oldMemory?.source_url,
    sourceMetadata: {
      ...(oldMemory?.source_metadata || {}),
      ...(newMemoryData.sourceMetadata || {}),
      supersedes_id: oldMemoryId,
    },
    speakerId: newMemoryData.speakerId || oldMemory?.speaker_id,
    speakerName: newMemoryData.speakerName || oldMemory?.speaker_name,
    permissionsPolicy: newMemoryData.permissionsPolicy || oldMemory?.permissions_policy,
    metadata: { ...(oldMemory?.metadata || {}), ...(newMemoryData.metadata || {}) },
    status: MEMORY_STATUS.ACTIVE,
  });

  // 3. Mark old memory as SUPERSEDED and link to new memory
  if (oldMemoryId && created?.id) {
    await supabase
      .from('clipad_v3_memories')
      .update({
        status: MEMORY_STATUS.SUPERSEDED,
        is_active: false,
        superseded_by: created.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', oldMemoryId);
  }

  return created;
}

/**
 * Archive a memory entry.
 */
export async function archiveMemory(memoryId) {
  return updateMemory(memoryId, {
    status: MEMORY_STATUS.ARCHIVED,
    is_active: false,
  });
}

/**
 * Retrieve complete traceable source provenance for a memory.
 */
export async function getMemoryProvenance(memoryId) {
  if (!memoryId) return null;

  const { data: memory, error } = await supabase
    .from('clipad_v3_memories')
    .select('*')
    .eq('id', memoryId)
    .single();

  if (error || !memory) return null;

  const provenance = {
    memory_id: memory.id,
    title: memory.title,
    memory_tier: memory.memory_tier,
    memory_type: memory.memory_type,
    confidence: memory.confidence_score,
    source: {
      type: memory.source_type,
      id: memory.source_id,
      url: memory.source_url,
      speaker: memory.speaker_name,
      timestamp: memory.timestamp_marker,
      metadata: memory.source_metadata || {},
    },
    history: {
      created_at: memory.created_at,
      last_verified_at: memory.last_verified_at,
      version: memory.version,
      status: memory.status,
      superseded_by: memory.superseded_by,
    }
  };

  return provenance;
}
