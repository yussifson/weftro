// src/lib/clipadEntityService.js
// Clipad V3 Organizational Entity & Relationship Service (Graph-Ready Model)

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
};

export const RELATIONSHIP_TYPES = {
  MEMBER_OF: 'member_of',
  PARTICIPATED_IN: 'participated_in',
  BELONGS_TO: 'belongs_to',
  PRODUCED: 'produced',
  CREATES: 'creates',
  RELATES_TO: 'relates_to',
  DERIVED_FROM: 'derived_from',
  CONCERNS: 'concerns',
  SUPERSEDES: 'supersedes',
};

/**
 * Register or update an organizational entity node.
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
 * Register a directed relationship edge between two entities.
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
 * Fetch entity node and its connected relationships.
 */
export async function getEntityGraph(companyId, entityId) {
  if (!companyId || !entityId) return { entity: null, outgoing: [], incoming: [] };

  try {
    const [entityRes, outgoingRes, incomingRes] = await Promise.all([
      supabase.from('clipad_v3_entities').select('*').eq('id', entityId).single(),
      supabase.from('clipad_v3_entity_relationships').select('*').eq('source_entity_id', entityId),
      supabase.from('clipad_v3_entity_relationships').select('*').eq('target_entity_id', entityId),
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
