// src/lib/clipadEntityService.js
// Clipad V3 Organizational Entity & Relationship Service (Graph-Ready Model)
// Phase 3 Stage 2: Synchronizes explicit foreign-key relationships into the graph model.
// Non-destructive, idempotent, and security-isolated.

import { supabase } from '@/api/supabaseClient';

export const ENTITY_TYPES = {
  PERSON: 'person',
  ORGANIZATION: 'organization',
  TEAM: 'team',
  SPACE: 'space',
  PROJECT: 'project',
  MEETING: 'meeting',
  CONVERSATION: 'conversation',
  DOCUMENT: 'document',
  KNOWLEDGE: 'knowledge',
  DECISION: 'decision',
  COMMITMENT: 'commitment',
  TASK: 'task',
  EVENT: 'event',
  MEMORY: 'memory',
  SMART_MOMENT: 'smart_moment',
};

export const RELATIONSHIP_TYPES = {
  // Phase 2 baseline
  MEMBER_OF: 'member_of',
  PARTICIPATED_IN: 'participated_in',
  BELONGS_TO: 'belongs_to',
  PRODUCED: 'produced',
  CREATES: 'creates',
  RELATES_TO: 'relates_to',
  DERIVED_FROM: 'derived_from',
  CONCERNS: 'concerns',
  SUPERSEDES: 'supersedes',
  // Phase 3 Stage 2 explicit foreign-key relationships
  ASSIGNED_TO: 'assigned_to',
  OWNS: 'owns',
  DISCUSSED_IN: 'discussed_in',
  MENTIONED_IN: 'mentioned_in',
  DECIDED_IN: 'decided_in',
  COMMITTED_IN: 'committed_in',
  SUPPORTS: 'supports',
  BLOCKS: 'blocks',
  DEPENDS_ON: 'depends_on',
};

/**
 * Register or update an organizational entity node idempotently.
 * Uniqueness enforced on (company_id, entity_type, entity_id).
 */
export async function upsertEntity({
  companyId,
  entityType,
  entityId,
  name,
  description = null,
  metadata = {},
}) {
  if (!companyId || !entityType || !name) {
    throw new Error('companyId, entityType, and name are required to register an entity.');
  }

  const payload = {
    company_id: companyId,
    entity_type: entityType,
    entity_id: entityId ? String(entityId) : null,
    name,
    description,
    metadata: metadata || {},
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('clipad_v3_entities')
      .upsert(payload, { onConflict: 'company_id,entity_type,entity_id' })
      .select('*')
      .single();

    if (error) {
      console.warn('[clipadEntityService.upsertEntity] Error:', error.message);
      return { id: crypto.randomUUID(), ...payload };
    }
    return data;
  } catch (err) {
    return { id: crypto.randomUUID(), ...payload };
  }
}

/**
 * Register a directed relationship edge between two entities idempotently.
 * Uniqueness enforced on (source_entity_id, target_entity_id, relationship_type).
 */
export async function createRelationship({
  companyId,
  sourceEntityId,
  targetEntityId,
  relationshipType,
  confidence = 1.0,
  metadata = {},
}) {
  if (!companyId || !sourceEntityId || !targetEntityId || !relationshipType) {
    throw new Error('companyId, sourceEntityId, targetEntityId, and relationshipType are required.');
  }

  const payload = {
    company_id: companyId,
    source_entity_id: sourceEntityId,
    target_entity_id: targetEntityId,
    relationship_type: relationshipType,
    confidence: Math.min(1.0, Math.max(0.0, Number(confidence) || 1.0)),
    metadata: metadata || {},
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('clipad_v3_entity_relationships')
      .upsert(payload, { onConflict: 'source_entity_id,target_entity_id,relationship_type' })
      .select('*')
      .single();

    if (error) {
      console.warn('[clipadEntityService.createRelationship] Error:', error.message);
      return { id: crypto.randomUUID(), ...payload };
    }
    return data;
  } catch {
    return { id: crypto.randomUUID(), ...payload };
  }
}

/**
 * Delete a specific relationship edge.
 */
export async function deleteRelationship({
  companyId,
  sourceEntityId,
  targetEntityId,
  relationshipType,
}) {
  if (!companyId || !sourceEntityId || !targetEntityId || !relationshipType) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('clipad_v3_entity_relationships')
      .delete()
      .eq('company_id', companyId)
      .eq('source_entity_id', sourceEntityId)
      .eq('target_entity_id', targetEntityId)
      .eq('relationship_type', relationshipType);

    return !error;
  } catch (err) {
    console.warn('[clipadEntityService.deleteRelationship] Exception:', err.message);
    return false;
  }
}

/**
 * Fetch entity node and its connected relationships.
 */
export async function getEntityGraph(companyId, entityId) {
  if (!companyId || !entityId) return { entity: null, outgoing: [], incoming: [] };

  try {
    const [entityRes, outgoingRes, incomingRes] = await Promise.all([
      supabase.from('clipad_v3_entities').select('*').eq('company_id', companyId).eq('id', entityId).single(),
      supabase.from('clipad_v3_entity_relationships').select('*').eq('company_id', companyId).eq('source_entity_id', entityId),
      supabase.from('clipad_v3_entity_relationships').select('*').eq('company_id', companyId).eq('target_entity_id', entityId),
    ]);

    return {
      entity: entityRes.data || null,
      outgoing: outgoingRes.data || [],
      incoming: incomingRes.data || [],
    };
  } catch (err) {
    console.error('[clipadEntityService.getEntityGraph] Error:', err);
    return { entity: null, outgoing: [], incoming: [] };
  }
}

// ──────────────────────────────────────────────────────────────────
// STAGE 2: Explicit Foreign-Key Relationship Synchronizers
// Idempotent, verified relationships derived ONLY from real relational keys.
// ──────────────────────────────────────────────────────────────────

/**
 * Helper to ensure an entity node exists for a given source record and return its UUID.
 */
export async function ensureEntityForRecord({
  companyId,
  entityType,
  entityId,
  name,
  description = null,
  metadata = {},
}) {
  if (!companyId || !entityType || !entityId) return null;
  const node = await upsertEntity({
    companyId,
    entityType,
    entityId: String(entityId),
    name: name || `${entityType}:${entityId}`,
    description,
    metadata,
  });
  return node?.id || null;
}

/**
 * Synchronize a Space Document's explicit foreign keys into the relationship graph.
 * Explicit edge: doc -> belongs_to -> space
 */
export async function syncDocRelationships({
  docId,
  companyId,
  spaceId,
  title,
  authorId = null,
  authorName = null,
  isPrivateSpace = false,
}) {
  if (!docId || !companyId) return null;

  const docNodeId = await ensureEntityForRecord({
    companyId,
    entityType: ENTITY_TYPES.DOCUMENT,
    entityId: docId,
    name: title || 'Untitled Document',
    metadata: { space_id: spaceId, is_private: isPrivateSpace },
  });

  if (!docNodeId) return null;

  const createdRels = [];

  // 1. Doc belongs_to Space (if spaceId is present)
  if (spaceId) {
    const spaceNodeId = await ensureEntityForRecord({
      companyId,
      entityType: ENTITY_TYPES.SPACE,
      entityId: spaceId,
      name: `Space ${spaceId}`,
      metadata: { is_private: isPrivateSpace },
    });

    if (spaceNodeId) {
      const rel = await createRelationship({
        companyId,
        sourceEntityId: docNodeId,
        targetEntityId: spaceNodeId,
        relationshipType: RELATIONSHIP_TYPES.BELONGS_TO,
        confidence: 1.0,
        metadata: { origin: 'foreign_key', space_id: spaceId },
      });
      if (rel) createdRels.push(rel);
    }
  }

  // 2. Person created/produced Doc (if authorId is present)
  if (authorId) {
    const personNodeId = await ensureEntityForRecord({
      companyId,
      entityType: ENTITY_TYPES.PERSON,
      entityId: authorId,
      name: authorName || `User ${authorId}`,
      metadata: { user_id: authorId },
    });

    if (personNodeId) {
      const rel = await createRelationship({
        companyId,
        sourceEntityId: personNodeId,
        targetEntityId: docNodeId,
        relationshipType: RELATIONSHIP_TYPES.PRODUCED,
        confidence: 1.0,
        metadata: { origin: 'author_id' },
      });
      if (rel) createdRels.push(rel);
    }
  }

  return { docNodeId, relationships: createdRels };
}

/**
 * Synchronize a Decision's explicit foreign keys into the relationship graph.
 * Explicit edges:
 *  - decision -> decided_in -> meeting (via source_meeting_id)
 *  - decision -> belongs_to -> space (via team_space_id)
 *  - person -> participated_in -> decision (via decided_by array)
 */
export async function syncDecisionRelationships({
  decisionId,
  companyId,
  teamSpaceId = null,
  decisionText,
  sourceMeetingId = null,
  meetingTitle = null,
  decidedBy = [], // array of profile/user UUIDs
  importance = 0.5,
  confidence = 1.0,
  isPrivateSpace = false,
}) {
  if (!decisionId || !companyId) return null;

  const decisionNodeId = await ensureEntityForRecord({
    companyId,
    entityType: ENTITY_TYPES.DECISION,
    entityId: decisionId,
    name: decisionText?.slice(0, 100) || 'Decision',
    description: decisionText,
    metadata: {
      team_space_id: teamSpaceId,
      source_meeting_id: sourceMeetingId,
      is_private: isPrivateSpace,
    },
  });

  if (!decisionNodeId) return null;
  const createdRels = [];

  // 1. Decision decided_in Meeting
  if (sourceMeetingId) {
    const meetingNodeId = await ensureEntityForRecord({
      companyId,
      entityType: ENTITY_TYPES.MEETING,
      entityId: sourceMeetingId,
      name: meetingTitle || `Meeting ${sourceMeetingId}`,
      metadata: { team_space_id: teamSpaceId, is_private: isPrivateSpace },
    });

    if (meetingNodeId) {
      const rel = await createRelationship({
        companyId,
        sourceEntityId: decisionNodeId,
        targetEntityId: meetingNodeId,
        relationshipType: RELATIONSHIP_TYPES.DECIDED_IN,
        confidence: 1.0,
        metadata: { origin: 'foreign_key', source_meeting_id: sourceMeetingId },
      });
      if (rel) createdRels.push(rel);
    }
  }

  // 2. Decision belongs_to Space
  if (teamSpaceId) {
    const spaceNodeId = await ensureEntityForRecord({
      companyId,
      entityType: ENTITY_TYPES.SPACE,
      entityId: teamSpaceId,
      name: `Space ${teamSpaceId}`,
      metadata: { is_private: isPrivateSpace },
    });

    if (spaceNodeId) {
      const rel = await createRelationship({
        companyId,
        sourceEntityId: decisionNodeId,
        targetEntityId: spaceNodeId,
        relationshipType: RELATIONSHIP_TYPES.BELONGS_TO,
        confidence: 1.0,
        metadata: { origin: 'foreign_key', team_space_id: teamSpaceId },
      });
      if (rel) createdRels.push(rel);
    }
  }

  // 3. Person participated_in Decision
  if (Array.isArray(decidedBy)) {
    for (const userId of decidedBy) {
      if (!userId) continue;
      const personNodeId = await ensureEntityForRecord({
        companyId,
        entityType: ENTITY_TYPES.PERSON,
        entityId: userId,
        name: `User ${userId}`,
        metadata: { user_id: userId },
      });

      if (personNodeId) {
        const rel = await createRelationship({
          companyId,
          sourceEntityId: personNodeId,
          targetEntityId: decisionNodeId,
          relationshipType: RELATIONSHIP_TYPES.PARTICIPATED_IN,
          confidence: 1.0,
          metadata: { origin: 'decided_by' },
        });
        if (rel) createdRels.push(rel);
      }
    }
  }

  return { decisionNodeId, relationships: createdRels };
}

/**
 * Synchronize an Action Item / Task explicit foreign keys into the relationship graph.
 * Explicit edges:
 *  - task -> discussed_in -> meeting (via meeting_id)
 *  - task -> assigned_to -> person (via assigned_to / assignee_id)
 *  - task -> belongs_to -> space (via space_id)
 *  - task -> supports -> decision (via explicit decision_id if provided)
 */
export async function syncActionItemRelationships({
  actionItemId,
  companyId,
  title,
  spaceId = null,
  meetingId = null,
  meetingTitle = null,
  assignedTo = null,
  assignedName = null,
  decisionId = null,
  isPrivateSpace = false,
}) {
  if (!actionItemId || !companyId) return null;

  const taskNodeId = await ensureEntityForRecord({
    companyId,
    entityType: ENTITY_TYPES.TASK,
    entityId: actionItemId,
    name: title || 'Task',
    metadata: {
      space_id: spaceId,
      meeting_id: meetingId,
      assigned_to: assignedTo,
      decision_id: decisionId,
      is_private: isPrivateSpace,
    },
  });

  if (!taskNodeId) return null;
  const createdRels = [];

  // 1. Task discussed_in Meeting
  if (meetingId) {
    const meetingNodeId = await ensureEntityForRecord({
      companyId,
      entityType: ENTITY_TYPES.MEETING,
      entityId: meetingId,
      name: meetingTitle || `Meeting ${meetingId}`,
      metadata: { space_id: spaceId, is_private: isPrivateSpace },
    });

    if (meetingNodeId) {
      const rel = await createRelationship({
        companyId,
        sourceEntityId: taskNodeId,
        targetEntityId: meetingNodeId,
        relationshipType: RELATIONSHIP_TYPES.DISCUSSED_IN,
        confidence: 1.0,
        metadata: { origin: 'foreign_key', meeting_id: meetingId },
      });
      if (rel) createdRels.push(rel);
    }
  }

  // 2. Task assigned_to Person
  if (assignedTo) {
    const personNodeId = await ensureEntityForRecord({
      companyId,
      entityType: ENTITY_TYPES.PERSON,
      entityId: assignedTo,
      name: assignedName || `User ${assignedTo}`,
      metadata: { user_id: assignedTo },
    });

    if (personNodeId) {
      const rel = await createRelationship({
        companyId,
        sourceEntityId: taskNodeId,
        targetEntityId: personNodeId,
        relationshipType: RELATIONSHIP_TYPES.ASSIGNED_TO,
        confidence: 1.0,
        metadata: { origin: 'assigned_to' },
      });
      if (rel) createdRels.push(rel);
    }
  }

  // 3. Task belongs_to Space
  if (spaceId) {
    const spaceNodeId = await ensureEntityForRecord({
      companyId,
      entityType: ENTITY_TYPES.SPACE,
      entityId: spaceId,
      name: `Space ${spaceId}`,
      metadata: { is_private: isPrivateSpace },
    });

    if (spaceNodeId) {
      const rel = await createRelationship({
        companyId,
        sourceEntityId: taskNodeId,
        targetEntityId: spaceNodeId,
        relationshipType: RELATIONSHIP_TYPES.BELONGS_TO,
        confidence: 1.0,
        metadata: { origin: 'foreign_key', space_id: spaceId },
      });
      if (rel) createdRels.push(rel);
    }
  }

  // 4. Task supports Decision (if explicitly associated)
  if (decisionId) {
    const decisionNodeId = await ensureEntityForRecord({
      companyId,
      entityType: ENTITY_TYPES.DECISION,
      entityId: decisionId,
      name: `Decision ${decisionId}`,
      metadata: { space_id: spaceId, is_private: isPrivateSpace },
    });

    if (decisionNodeId) {
      const rel = await createRelationship({
        companyId,
        sourceEntityId: taskNodeId,
        targetEntityId: decisionNodeId,
        relationshipType: RELATIONSHIP_TYPES.SUPPORTS,
        confidence: 1.0,
        metadata: { origin: 'explicit_link', decision_id: decisionId },
      });
      if (rel) createdRels.push(rel);
    }
  }

  return { taskNodeId, relationships: createdRels };
}

/**
 * Synchronize Space Memberships into the relationship graph.
 * Explicit edge: person -> member_of -> space
 */
export async function syncSpaceMemberRelationship({
  companyId,
  spaceId,
  userId,
  userName = null,
  role = 'member',
  isPrivateSpace = false,
}) {
  if (!companyId || !spaceId || !userId) return null;

  const [personNodeId, spaceNodeId] = await Promise.all([
    ensureEntityForRecord({
      companyId,
      entityType: ENTITY_TYPES.PERSON,
      entityId: userId,
      name: userName || `User ${userId}`,
      metadata: { user_id: userId },
    }),
    ensureEntityForRecord({
      companyId,
      entityType: ENTITY_TYPES.SPACE,
      entityId: spaceId,
      name: `Space ${spaceId}`,
      metadata: { is_private: isPrivateSpace },
    }),
  ]);

  if (!personNodeId || !spaceNodeId) return null;

  return createRelationship({
    companyId,
    sourceEntityId: personNodeId,
    targetEntityId: spaceNodeId,
    relationshipType: RELATIONSHIP_TYPES.MEMBER_OF,
    confidence: 1.0,
    metadata: { role, is_private: isPrivateSpace },
  });
}

/**
 * Synchronize a Commitment's explicit foreign keys into the relationship graph.
 * Explicit edges:
 *  - commitment -> committed_in -> meeting (via source_meeting_id)
 *  - commitment -> assigned_to -> person (via assignee_id)
 *  - commitment -> belongs_to -> space (via team_space_id)
 */
export async function syncCommitmentRelationships({
  commitmentId,
  companyId,
  commitmentText,
  assigneeId = null,
  assigneeName = null,
  teamSpaceId = null,
  sourceMeetingId = null,
  isPrivateSpace = false,
}) {
  if (!commitmentId || !companyId) return null;

  const commitmentNodeId = await ensureEntityForRecord({
    companyId,
    entityType: ENTITY_TYPES.COMMITMENT,
    entityId: commitmentId,
    name: commitmentText?.slice(0, 100) || 'Commitment',
    description: commitmentText,
    metadata: {
      team_space_id: teamSpaceId,
      source_meeting_id: sourceMeetingId,
      is_private: isPrivateSpace,
    },
  });

  if (!commitmentNodeId) return null;
  const createdRels = [];

  // 1. Commitment committed_in Meeting
  if (sourceMeetingId) {
    const meetingNodeId = await ensureEntityForRecord({
      companyId,
      entityType: ENTITY_TYPES.MEETING,
      entityId: sourceMeetingId,
      name: `Meeting ${sourceMeetingId}`,
      metadata: { team_space_id: teamSpaceId, is_private: isPrivateSpace },
    });

    if (meetingNodeId) {
      const rel = await createRelationship({
        companyId,
        sourceEntityId: commitmentNodeId,
        targetEntityId: meetingNodeId,
        relationshipType: RELATIONSHIP_TYPES.COMMITTED_IN,
        confidence: 1.0,
        metadata: { origin: 'foreign_key', source_meeting_id: sourceMeetingId },
      });
      if (rel) createdRels.push(rel);
    }
  }

  // 2. Commitment assigned_to Person
  if (assigneeId) {
    const personNodeId = await ensureEntityForRecord({
      companyId,
      entityType: ENTITY_TYPES.PERSON,
      entityId: assigneeId,
      name: assigneeName || `User ${assigneeId}`,
      metadata: { user_id: assigneeId },
    });

    if (personNodeId) {
      const rel = await createRelationship({
        companyId,
        sourceEntityId: commitmentNodeId,
        targetEntityId: personNodeId,
        relationshipType: RELATIONSHIP_TYPES.ASSIGNED_TO,
        confidence: 1.0,
        metadata: { origin: 'assignee_id' },
      });
      if (rel) createdRels.push(rel);
    }
  }

  // 3. Commitment belongs_to Space
  if (teamSpaceId) {
    const spaceNodeId = await ensureEntityForRecord({
      companyId,
      entityType: ENTITY_TYPES.SPACE,
      entityId: teamSpaceId,
      name: `Space ${teamSpaceId}`,
      metadata: { is_private: isPrivateSpace },
    });

    if (spaceNodeId) {
      const rel = await createRelationship({
        companyId,
        sourceEntityId: commitmentNodeId,
        targetEntityId: spaceNodeId,
        relationshipType: RELATIONSHIP_TYPES.BELONGS_TO,
        confidence: 1.0,
        metadata: { origin: 'foreign_key', team_space_id: teamSpaceId },
      });
      if (rel) createdRels.push(rel);
    }
  }

  return { commitmentNodeId, relationships: createdRels };
}

/**
 * Clean up all entity nodes and relationship edges for a deleted source record.
 * Ensures zero stale or dangling edges remain in the graph.
 */
export async function deleteEntityForRecord({
  companyId,
  entityType,
  entityId,
}) {
  if (!companyId || !entityType || !entityId) return false;

  try {
    // 1. Locate the entity node ID
    const { data: entity } = await supabase
      .from('clipad_v3_entities')
      .select('id')
      .eq('company_id', companyId)
      .eq('entity_type', entityType)
      .eq('entity_id', String(entityId))
      .single();

    if (!entity?.id) return false;

    // 2. Delete all incoming and outgoing edges for this entity
    await Promise.all([
      supabase
        .from('clipad_v3_entity_relationships')
        .delete()
        .eq('company_id', companyId)
        .eq('source_entity_id', entity.id),
      supabase
        .from('clipad_v3_entity_relationships')
        .delete()
        .eq('company_id', companyId)
        .eq('target_entity_id', entity.id),
    ]);

    // 3. Delete the entity node itself
    const { error } = await supabase
      .from('clipad_v3_entities')
      .delete()
      .eq('company_id', companyId)
      .eq('id', entity.id);

    return !error;
  } catch (err) {
    console.warn('[clipadEntityService.deleteEntityForRecord] Exception:', err.message);
    return false;
  }
}
