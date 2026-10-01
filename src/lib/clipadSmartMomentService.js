// src/lib/clipadSmartMomentService.js
// Clipad V3 Core Smart Moment Service
// Manages creation, query, editing, confirmation, dismissal, and Phase 2 memory conversion for Smart Moments.

import { supabase } from '@/api/supabaseClient';
import { createMemory, MEMORY_TIERS, MEMORY_TYPES, MEMORY_STATUS } from '@/lib/clipadMemoryService';
import { upsertEntity, createRelationship, ENTITY_TYPES, RELATIONSHIP_TYPES } from '@/lib/clipadEntityService';

export const MOMENT_TYPES = {
  DECISION: 'DECISION',
  ACTION: 'ACTION',
  COMMITMENT: 'COMMITMENT',
  QUESTION: 'QUESTION',
  RISK: 'RISK',
  BLOCKER: 'BLOCKER',
  INSIGHT: 'INSIGHT',
  FOLLOW_UP: 'FOLLOW_UP',
  IMPORTANT_TOPIC: 'IMPORTANT_TOPIC',
  AGREEMENT: 'AGREEMENT',
  DISAGREEMENT: 'DISAGREEMENT',
  CHANGE: 'CHANGE',
};

export const MOMENT_STATUS = {
  DETECTED: 'detected',
  CONFIRMED: 'confirmed',
  EDITED: 'edited',
  DISMISSED: 'dismissed',
  CONVERTED: 'converted',
};

/**
 * Create a new Smart Moment record.
 */
export async function createSmartMoment({
  companyId,
  teamSpaceId = null,
  meetingId = null,
  videoId = null,
  momentType = MOMENT_TYPES.INSIGHT,
  title,
  description = null,
  content = null,
  confidence = 0.90,
  importance = 0.50,
  timestampStart = null,
  timestampEnd = null,
  speakerId = null,
  speakerName = null,
  createdBy = null,
  metadata = {},
  status = MOMENT_STATUS.DETECTED,
}) {
  if (!companyId || (!meetingId && !videoId) || !title) {
    throw new Error('companyId, meetingId or videoId, and title are required to create a Smart Moment.');
  }

  const payload = {
    company_id: companyId,
    team_space_id: teamSpaceId,
    meeting_id: meetingId ? String(meetingId) : null,
    video_id: videoId ? String(videoId) : null,
    moment_type: momentType,
    title,
    description: description || title,
    content: content || description || title,
    confidence: Math.min(1.0, Math.max(0.0, Number(confidence) || 0.90)),
    importance: Math.min(1.0, Math.max(0.0, Number(importance) || 0.50)),
    timestamp_start: timestampStart,
    timestamp_end: timestampEnd,
    speaker_id: speakerId,
    speaker_name: speakerName,
    status,
    created_by: createdBy,
    metadata: metadata || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('clipad_v3_smart_moments')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('[clipadSmartMomentService.createSmartMoment] Error:', error);
    return { id: crypto.randomUUID(), ...payload };
  }

  return data;
}

/**
 * Fetch Smart Moments for a meeting or async video.
 */
export async function getSmartMoments({
  companyId = null,
  meetingId = null,
  videoId = null,
  momentType = null,
  status = null,
}) {
  try {
    let q = supabase
      .from('clipad_v3_smart_moments')
      .select('*')
      .order('created_at', { ascending: true });

    if (companyId) q = q.eq('company_id', companyId);
    if (meetingId) q = q.eq('meeting_id', meetingId);
    if (videoId) q = q.eq('video_id', videoId);
    if (momentType) q = q.eq('moment_type', momentType);
    if (status) q = q.eq('status', status);

    const { data, error } = await q;

    if (error || !data) return [];
    return data;
  } catch (err) {
    console.error('[clipadSmartMomentService.getSmartMoments] Error:', err);
    return [];
  }
}

/**
 * Update a Smart Moment (edit text, timestamps, speaker).
 */
export async function updateSmartMoment(momentId, updates) {
  if (!momentId) return null;

  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('clipad_v3_smart_moments')
    .update(payload)
    .eq('id', momentId)
    .select('*')
    .single();

  if (error) {
    console.error('[clipadSmartMomentService.updateSmartMoment] Error:', error);
    return null;
  }
  return data;
}

/**
 * Confirm a Smart Moment and optionally auto-convert to Phase 2 Organizational Memory.
 */
export async function confirmSmartMoment(momentId, userId = null) {
  const moment = await updateSmartMoment(momentId, {
    status: MOMENT_STATUS.CONFIRMED,
  });

  if (moment) {
    await convertMomentToMemory(moment, userId);
  }

  return moment;
}

/**
 * Dismiss a Smart Moment.
 */
export async function dismissSmartMoment(momentId) {
  return updateSmartMoment(momentId, {
    status: MOMENT_STATUS.DISMISSED,
  });
}

/**
 * Convert a confirmed Smart Moment into a Phase 2 Organizational Memory node with complete provenance.
 */
export async function convertMomentToMemory(moment, userId = null) {
  if (!moment) return null;

  // Map Moment Type to Memory Type
  const typeMap = {
    [MOMENT_TYPES.DECISION]: MEMORY_TYPES.DECISION,
    [MOMENT_TYPES.ACTION]: MEMORY_TYPES.COMMITMENT,
    [MOMENT_TYPES.COMMITMENT]: MEMORY_TYPES.COMMITMENT,
    [MOMENT_TYPES.RISK]: MEMORY_TYPES.INSIGHT,
    [MOMENT_TYPES.BLOCKER]: MEMORY_TYPES.INSIGHT,
    [MOMENT_TYPES.INSIGHT]: MEMORY_TYPES.INSIGHT,
    [MOMENT_TYPES.QUESTION]: MEMORY_TYPES.FACT,
  };

  const memoryType = typeMap[moment.moment_type] || MEMORY_TYPES.FACT;
  const isPrivate = moment.metadata?.source_permissions?.is_private || moment.metadata?.is_private || false;
  const memoryTier = isPrivate ? MEMORY_TIERS.PERSONAL : (moment.team_space_id ? MEMORY_TIERS.TEAM : MEMORY_TIERS.ORGANIZATIONAL);

  // 1. Create Phase 2 Memory Node
  const memory = await createMemory({
    companyId: moment.company_id,
    userId: userId || moment.created_by,
    teamSpaceId: moment.team_space_id,
    memoryTier,
    memoryType,
    title: moment.title,
    content: moment.content || moment.description || moment.title,
    summary: moment.description || moment.title,
    confidenceScore: moment.confidence || 0.95,
    importance: moment.importance || 0.5,
    sourceType: moment.meeting_id ? 'meeting' : 'video',
    sourceId: moment.meeting_id || moment.video_id,
    speakerId: moment.speaker_id,
    speakerName: moment.speaker_name,
    timestampMarker: moment.timestamp_start,
    permissionsPolicy: {
      is_private: isPrivate,
      visibility: isPrivate ? 'personal' : (moment.team_space_id ? 'space' : 'company'),
      allowed_space_id: moment.team_space_id,
    },
    sourceMetadata: {
      smart_moment_id: moment.id,
      timestamp_start: moment.timestamp_start,
      timestamp_end: moment.timestamp_end,
      moment_type: moment.moment_type,
      source_permissions: moment.metadata?.source_permissions || {},
    },
    status: MEMORY_STATUS.ACTIVE,
  });

  // 2. Mark moment status as CONVERTED
  await updateSmartMoment(moment.id, {
    status: MOMENT_STATUS.CONVERTED,
    metadata: { ...(moment.metadata || {}), memory_id: memory?.id },
  });

  // 3. Register Graph Entities & Relationships
  if (moment.company_id) {
    const momentEntity = await upsertEntity({
      companyId: moment.company_id,
      entityType: ENTITY_TYPES.MEMORY,
      entityId: `moment:${moment.id}`,
      name: moment.title,
    });

    if (moment.meeting_id) {
      await createRelationship({
        companyId: moment.company_id,
        sourceEntityId: momentEntity.id,
        targetEntityId: `meeting:${moment.meeting_id}`,
        relationshipType: RELATIONSHIP_TYPES.DERIVED_FROM,
      });
    }
  }

  return memory;
}
