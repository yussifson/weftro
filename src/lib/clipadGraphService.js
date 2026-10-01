// src/lib/clipadGraphService.js
// Clipad V3 — Phase 4: Knowledge Graph Traversal & Entity Resolution Service
//
// Builds on clipad_v3_entities and clipad_v3_entity_relationships from Phase 2.
// Adds multi-hop traversal, entity resolution, and permission-aware graph context.
//
// AUTHORIZATION RULE: Authorization is applied BEFORE results are returned.
// Graph traversal NEVER exposes a node that the requesting user cannot access.

import { supabase } from '@/api/supabaseClient';
import { upsertEntity, createRelationship } from '@/lib/clipadEntityService';

// ─── Constants ───────────────────────────────────────────────────────────────

export const ENTITY_TYPES_V4 = {
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

export const RELATIONSHIP_TYPES_V4 = {
  MEMBER_OF: 'member_of',
  PARTICIPATED_IN: 'participated_in',
  BELONGS_TO: 'belongs_to',
  PRODUCED: 'produced',
  CREATES: 'creates',
  RELATES_TO: 'relates_to',
  DERIVED_FROM: 'derived_from',
  CONCERNS: 'concerns',
  SUPERSEDES: 'supersedes',
  // Phase 4 additions:
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

// Traversal safety limits — prevents runaway graph walks
const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_MAX_NODES = 50;
const DEFAULT_MAX_RESULTS = 30;

// ─── Permission helper ────────────────────────────────────────────────────────

/**
 * Fetches the set of space IDs accessible to the current user.
 * Used to gate graph node visibility.
 */
async function getAccessibleSpaceIds(userId, companyId, isAdmin = false) {
  if (!userId || !companyId) return new Set();
  if (isAdmin) {
    const { data } = await supabase
      .from('clipad_spaces')
      .select('id')
      .eq('company_id', companyId);
    return new Set((data || []).map(s => s.id));
  }
  const [{ data: memberships }, { data: publicSpaces }] = await Promise.all([
    supabase.from('clipad_space_members').select('space_id').eq('user_id', userId),
    supabase.from('clipad_spaces').select('id').eq('company_id', companyId).eq('is_private', false),
  ]);
  const ids = new Set([
    ...(memberships || []).map(m => m.space_id),
    ...(publicSpaces || []).map(s => s.id),
  ]);
  return ids;
}

// ─── Entity Resolution ────────────────────────────────────────────────────────

/**
 * Resolves a text reference to a canonical entity node.
 * Uses aliases table first, then exact name match, then normalized fuzzy match.
 * Returns null if confidence is insufficient — does NOT guess.
 *
 * @param {string} companyId
 * @param {string} text - The reference text, e.g. "Yussif" or "the API project"
 * @param {string|null} entityType - Optional type hint to narrow search
 * @returns {object|null} Canonical entity or null
 */
export async function resolveEntity(companyId, text, entityType = null) {
  if (!companyId || !text?.trim()) return null;
  const normalized = text.trim().toLowerCase();

  // 1. Check alias table first (highest confidence)
  const { data: aliasData } = await supabase
    .from('clipad_v3_entity_aliases')
    .select('canonical_id, confidence, clipad_v3_entities(*)')
    .eq('company_id', companyId)
    .eq('alias_text', normalized)
    .order('confidence', { ascending: false })
    .limit(1);

  if (aliasData?.[0]?.clipad_v3_entities) {
    const entity = aliasData[0].clipad_v3_entities;
    if (!entityType || entity.entity_type === entityType) return entity;
  }

  // 2. Exact name match in entities table
  let query = supabase
    .from('clipad_v3_entities')
    .select('*')
    .eq('company_id', companyId)
    .ilike('name', normalized)
    .limit(1);
  if (entityType) query = query.eq('entity_type', entityType);
  const { data: exactMatch } = await query;
  if (exactMatch?.[0]) return exactMatch[0];

  // 3. Partial name match (only if text is >= 4 characters to avoid false positives)
  if (normalized.length >= 4) {
    let fuzzyQuery = supabase
      .from('clipad_v3_entities')
      .select('*')
      .eq('company_id', companyId)
      .ilike('name', `%${normalized}%`)
      .limit(3);
    if (entityType) fuzzyQuery = fuzzyQuery.eq('entity_type', entityType);
    const { data: fuzzyMatches } = await fuzzyQuery;

    // Only return if exactly one match (ambiguous = unresolved)
    if (fuzzyMatches?.length === 1) return fuzzyMatches[0];
  }

  // Insufficient confidence — leave unresolved
  return null;
}

/**
 * Register an alias for an entity to improve future resolution.
 */
export async function registerEntityAlias(companyId, canonicalEntityId, aliasText, source = 'manual', confidence = 1.0) {
  if (!companyId || !canonicalEntityId || !aliasText?.trim()) return null;
  const { data, error } = await supabase
    .from('clipad_v3_entity_aliases')
    .upsert({
      company_id: companyId,
      canonical_id: canonicalEntityId,
      alias_text: aliasText.trim().toLowerCase(),
      confidence,
      source,
    }, { onConflict: 'company_id,alias_text' })
    .select()
    .single();
  if (error) console.warn('[GraphService.registerAlias]', error.message);
  return data;
}

// ─── Core Graph API ───────────────────────────────────────────────────────────

/**
 * Get a single entity by its internal UUID.
 * Returns null if the entity doesn't belong to the company.
 */
export async function getEntity(companyId, entityId) {
  if (!companyId || !entityId) return null;
  const { data, error } = await supabase
    .from('clipad_v3_entities')
    .select('*')
    .eq('id', entityId)
    .eq('company_id', companyId)
    .single();
  if (error) return null;
  return data;
}

/**
 * Get all relationships for an entity (outgoing + incoming).
 * Scoped strictly to the company.
 */
export async function getEntityRelationships(companyId, entityId) {
  if (!companyId || !entityId) return { outgoing: [], incoming: [] };
  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    supabase
      .from('clipad_v3_entity_relationships')
      .select('*, target:target_entity_id(id, entity_type, name, metadata)')
      .eq('source_entity_id', entityId)
      .eq('company_id', companyId),
    supabase
      .from('clipad_v3_entity_relationships')
      .select('*, source:source_entity_id(id, entity_type, name, metadata)')
      .eq('target_entity_id', entityId)
      .eq('company_id', companyId),
  ]);
  return { outgoing: outgoing || [], incoming: incoming || [] };
}

/**
 * Get entities related to a given entity, optionally filtered by relationship or entity type.
 */
export async function getRelatedEntities(companyId, entityId, {
  relationshipType = null,
  targetEntityType = null,
  direction = 'both', // 'outgoing', 'incoming', 'both'
  limit = DEFAULT_MAX_RESULTS,
} = {}) {
  if (!companyId || !entityId) return [];

  const results = [];

  if (direction === 'outgoing' || direction === 'both') {
    let q = supabase
      .from('clipad_v3_entity_relationships')
      .select('relationship_type, confidence, metadata, target:target_entity_id(id, entity_type, name, description, metadata)')
      .eq('source_entity_id', entityId)
      .eq('company_id', companyId);
    if (relationshipType) q = q.eq('relationship_type', relationshipType);
    const { data } = await q.limit(limit);
    (data || []).forEach(r => {
      if (!targetEntityType || r.target?.entity_type === targetEntityType) {
        results.push({ ...r.target, relationship: r.relationship_type, direction: 'outgoing', confidence: r.confidence });
      }
    });
  }

  if (direction === 'incoming' || direction === 'both') {
    let q = supabase
      .from('clipad_v3_entity_relationships')
      .select('relationship_type, confidence, metadata, source:source_entity_id(id, entity_type, name, description, metadata)')
      .eq('target_entity_id', entityId)
      .eq('company_id', companyId);
    if (relationshipType) q = q.eq('relationship_type', relationshipType);
    const { data } = await q.limit(limit);
    (data || []).forEach(r => {
      if (!targetEntityType || r.source?.entity_type === targetEntityType) {
        results.push({ ...r.source, relationship: r.relationship_type, direction: 'incoming', confidence: r.confidence });
      }
    });
  }

  // Deduplicate by id
  const seen = new Set();
  return results.filter(e => e?.id && !seen.has(e.id) && seen.add(e.id));
}

/**
 * Multi-hop breadth-first graph traversal.
 * Traversal is strictly bounded by maxDepth, maxNodes, and company isolation.
 * Authorization is enforced: nodes in restricted spaces are EXCLUDED.
 *
 * @param {string} companyId
 * @param {string} startEntityId
 * @param {object} opts
 * @returns {object} { nodes: [], edges: [], truncated: boolean }
 */
export async function traverseGraph(companyId, startEntityId, {
  maxDepth = DEFAULT_MAX_DEPTH,
  maxNodes = DEFAULT_MAX_NODES,
  relationshipTypes = null,   // null = all types
  entityTypes = null,         // null = all entity types
  userId = null,
  isAdmin = false,
} = {}) {
  if (!companyId || !startEntityId) return { nodes: [], edges: [], truncated: false };

  const accessibleSpaceIds = await getAccessibleSpaceIds(userId, companyId, isAdmin);
  const visited = new Set();
  const nodes = [];
  const edges = [];
  let truncated = false;
  const queue = [{ id: startEntityId, depth: 0 }];

  while (queue.length > 0) {
    const { id: currentId, depth } = queue.shift();
    if (visited.has(currentId) || depth > maxDepth) continue;
    if (nodes.length >= maxNodes) { truncated = true; break; }
    visited.add(currentId);

    // Fetch entity — company_id enforces tenant isolation
    const entity = await getEntity(companyId, currentId);
    if (!entity) continue;

    // Space-based authorization check
    const entitySpaceId = entity.metadata?.space_id;
    if (entitySpaceId && !accessibleSpaceIds.has(entitySpaceId) && !isAdmin) continue;

    nodes.push(entity);

    if (depth < maxDepth) {
      // Fetch all relationships from this node
      let relQuery = supabase
        .from('clipad_v3_entity_relationships')
        .select('id, source_entity_id, target_entity_id, relationship_type, confidence')
        .eq('company_id', companyId)
        .or(`source_entity_id.eq.${currentId},target_entity_id.eq.${currentId}`);

      if (relationshipTypes?.length) {
        relQuery = relQuery.in('relationship_type', relationshipTypes);
      }

      const { data: rels } = await relQuery.limit(50);
      (rels || []).forEach(rel => {
        const nextId = rel.source_entity_id === currentId ? rel.target_entity_id : rel.source_entity_id;
        edges.push({ ...rel, direction: rel.source_entity_id === currentId ? 'outgoing' : 'incoming' });
        if (!visited.has(nextId)) queue.push({ id: nextId, depth: depth + 1 });
      });
    }
  }

  // Filter edges to only include both-endpoint-visible nodes
  const nodeIds = new Set(nodes.map(n => n.id));
  const safeEdges = edges.filter(e => nodeIds.has(e.source_entity_id) && nodeIds.has(e.target_entity_id));

  return { nodes, edges: safeEdges, truncated };
}

/**
 * Find entities by type and optional name search, within the company.
 */
export async function findEntities(companyId, {
  entityType = null,
  searchText = '',
  limit = DEFAULT_MAX_RESULTS,
} = {}) {
  if (!companyId) return [];
  let q = supabase
    .from('clipad_v3_entities')
    .select('*')
    .eq('company_id', companyId)
    .limit(limit);
  if (entityType) q = q.eq('entity_type', entityType);
  if (searchText?.trim()) q = q.ilike('name', `%${searchText.trim()}%`);
  const { data } = await q.order('updated_at', { ascending: false });
  return data || [];
}

/**
 * Get a rich entity context: the entity itself + all its relationships + relevant memories + smart moments.
 * Authorization is applied: no restricted content is returned.
 *
 * @param {string} companyId
 * @param {string} entityId
 * @param {object} opts - userId, isAdmin
 * @returns {object} Rich entity context
 */
export async function getEntityContext(companyId, entityId, { userId = null, isAdmin = false } = {}) {
  if (!companyId || !entityId) return null;

  const accessibleSpaceIds = await getAccessibleSpaceIds(userId, companyId, isAdmin);

  // Fetch entity + relationships + memories referencing this entity + smart moments
  const [entity, { outgoing, incoming }] = await Promise.all([
    getEntity(companyId, entityId),
    getEntityRelationships(companyId, entityId),
  ]);

  if (!entity) return null;

  // Fetch memories mentioning this entity's name or ID
  const { data: memories } = await supabase
    .from('clipad_v3_memories')
    .select('id, title, content, memory_type, memory_tier, team_space_id, confidence_score, importance, created_at')
    .eq('company_id', companyId)
    .or(`title.ilike.%${entity.name}%,content.ilike.%${entity.name}%`)
    .not('status', 'eq', 'DELETED')
    .limit(10);

  // Fetch smart moments mentioning this entity's name
  const { data: smartMoments } = await supabase
    .from('clipad_v3_smart_moments')
    .select('id, title, moment_type, status, confidence, importance, team_space_id, created_at')
    .eq('company_id', companyId)
    .or(`title.ilike.%${entity.name}%,content.ilike.%${entity.name}%`)
    .not('status', 'eq', 'dismissed')
    .limit(10);

  // Authorization filter on memories and moments using space access
  const filterBySpaceAccess = (items) => (items || []).filter(item => {
    if (!item.team_space_id) return true; // company-wide
    return accessibleSpaceIds.has(item.team_space_id) || isAdmin;
  });

  return {
    entity,
    relationships: {
      outgoing,
      incoming,
    },
    memories: filterBySpaceAccess(memories),
    smartMoments: filterBySpaceAccess(smartMoments),
  };
}

/**
 * Register or sync a Clipad source record as an entity node.
 * Prevents duplicate entities by using upsert on (company_id, entity_type, entity_id).
 */
export async function syncEntityFromSource(companyId, sourceType, sourceId, name, metadata = {}) {
  if (!companyId || !sourceType || !sourceId || !name) return null;
  return upsertEntity({
    companyId,
    entityType: sourceType,
    entityId: String(sourceId),
    name,
    metadata,
  });
}

/**
 * Create a safe relationship between two entities.
 * Validates both entities belong to the same company before inserting.
 */
export async function safeCreateRelationship(companyId, sourceId, targetId, relationshipType, metadata = {}) {
  if (!companyId || !sourceId || !targetId || !relationshipType) return null;

  // Verify both entities belong to this company
  const [sourceEntity, targetEntity] = await Promise.all([
    getEntity(companyId, sourceId),
    getEntity(companyId, targetId),
  ]);

  if (!sourceEntity || !targetEntity) {
    console.warn('[GraphService.safeCreateRelationship] One or both entities not found in company');
    return null;
  }

  return createRelationship({
    companyId,
    sourceEntityId: sourceId,
    targetEntityId: targetId,
    relationshipType,
    metadata,
  });
}

/**
 * Find knowledge connected to a topic/entity name through the graph.
 * Implements the "Preloom API → Meetings → Smart Moments → Decisions → Memories" pattern.
 *
 * @param {string} companyId
 * @param {string} topicText - Free-text topic to search for
 * @param {object} opts - userId, isAdmin, maxDepth
 * @returns {object} Connected knowledge with provenance
 */
export async function findConnectedKnowledge(companyId, topicText, {
  userId = null,
  isAdmin = false,
  maxDepth = 2,
  limit = DEFAULT_MAX_RESULTS,
} = {}) {
  if (!companyId || !topicText?.trim()) return { entities: [], memories: [], smartMoments: [] };

  const accessibleSpaceIds = await getAccessibleSpaceIds(userId, companyId, isAdmin);
  const term = `%${topicText.trim()}%`;

  // 1. Find matching entities
  const { data: entities } = await supabase
    .from('clipad_v3_entities')
    .select('*')
    .eq('company_id', companyId)
    .ilike('name', term)
    .limit(10);

  // 2. Find matching memories (with permission filter)
  const { data: rawMemories } = await supabase
    .from('clipad_v3_memories')
    .select('id, title, content, summary, memory_type, memory_tier, team_space_id, confidence_score, importance, source_type, source_id, created_at')
    .eq('company_id', companyId)
    .or(`title.ilike.${term},content.ilike.${term}`)
    .not('status', 'eq', 'DELETED')
    .limit(limit);

  // 3. Find matching smart moments (with permission filter)
  const { data: rawMoments } = await supabase
    .from('clipad_v3_smart_moments')
    .select('id, title, description, content, moment_type, status, confidence, importance, team_space_id, meeting_id, video_id, speaker_name, created_at')
    .eq('company_id', companyId)
    .or(`title.ilike.${term},content.ilike.${term},description.ilike.${term}`)
    .not('status', 'eq', 'dismissed')
    .limit(limit);

  // Permission filter
  const filterBySpace = (items) => (items || []).filter(item => {
    if (!item.team_space_id) return true;
    return accessibleSpaceIds.has(item.team_space_id) || isAdmin;
  });

  return {
    entities: entities || [],
    memories: filterBySpace(rawMemories),
    smartMoments: filterBySpace(rawMoments),
  };
}
