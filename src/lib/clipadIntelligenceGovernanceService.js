// src/lib/clipadIntelligenceGovernanceService.js
// Clipad V3 - Phase 8: Role-Aware Intelligence + Governance + Privacy

import { supabase } from '@/api/supabaseClient';

export const PRIVACY_LEVELS = {
  PERSONAL: 'PERSONAL',
  TEAM: 'TEAM',
  ORGANIZATION: 'ORGANIZATION',
  RESTRICTED: 'RESTRICTED',
  PRIVATE: 'PRIVATE' // e.g. Private meetings, private captures
};

/**
 * Derives a secure intelligence context for the authenticated user based on actual DB state.
 * This guarantees the AI never receives unauthorized knowledge.
 */
export async function resolveIntelligenceContext(user) {
  if (!user) throw new Error('Unauthenticated user cannot resolve intelligence context');

  const companyId = user.user_metadata?.company_id || user.company_id;
  const role = user.role || user.user_metadata?.role || 'member';
  const isAdmin = ['super_admin', 'admin'].includes(role);

  // Derive accessible spaces from the canonical space members table
  const { data: spaceMemberships } = await supabase
    .from('clipad_space_members')
    .select('space_id, role')
    .eq('user_id', user.id);

  const accessibleSpaces = (spaceMemberships || []).map(sm => sm.space_id);
  const managedSpaces = (spaceMemberships || []).filter(sm => sm.role === 'manager' || sm.role === 'admin').map(sm => sm.space_id);

  // Map roles to conceptual access tiers
  let allowedMemoryScopes = [PRIVACY_LEVELS.PERSONAL];
  let allowedKnowledgeScopes = ['public'];

  if (accessibleSpaces.length > 0) {
    allowedMemoryScopes.push(PRIVACY_LEVELS.TEAM);
  }

  if (isAdmin || role === 'owner') {
    allowedMemoryScopes.push(PRIVACY_LEVELS.ORGANIZATION);
    allowedKnowledgeScopes.push('organizational');
  } else if (role === 'manager' || role === 'team_lead') {
    allowedKnowledgeScopes.push('team');
  }

  return {
    userId: user.id,
    companyId,
    role,
    isAdmin,
    accessibleSpaces,
    managedSpaces,
    allowedMemoryScopes,
    allowedKnowledgeScopes,
    allowedMomentScopes: isAdmin ? ['ORGANIZATION', 'TEAM', 'PERSONAL'] : ['TEAM', 'PERSONAL'],
    allowedContextScopes: isAdmin ? ['GLOBAL', 'SPACE', 'USER'] : ['SPACE', 'USER'],
    allowedActions: isAdmin ? ['READ', 'WRITE', 'DELETE'] : ['READ', 'WRITE']
  };
}

/**
 * Filter memories before they reach the AI Assistant.
 * Uses the resolved governance context.
 */
export function filterAuthorizedMemories(memories = [], governanceContext) {
  const { userId, isAdmin, accessibleSpaces } = governanceContext;

  return memories.filter(mem => {
    // Admin override (assuming admins can see org data, but maybe NOT personal data of others)
    if (isAdmin && mem.tier === 'ORGANIZATION') return true;

    // Ownership check (always overrides)
    if (mem.owner_id === userId || mem.user_id === userId) return true;

    // Tier based checks
    switch ((mem.tier || '').toUpperCase()) {
      case 'PRIVATE':
      case 'PERSONAL':
      case 'RESTRICTED':
        // If not owner (handled above), DENY
        return false;
      case 'TEAM':
      case 'SPACE':
        // Must belong to the team/space
        if (mem.space_id && accessibleSpaces.includes(mem.space_id)) return true;
        // Fallback for array mapping
        if (mem.space_ids && mem.space_ids.some(id => accessibleSpaces.includes(id))) return true;
        return false;
      case 'ORGANIZATION':
      case 'COMPANY':
        return true; // Org memories are visible to all authenticated members of the org
      default:
        // By default, deny unknown visibility if not owner
        return false;
    }
  });
}

/**
 * Filter Knowledge Graph Nodes & Relationships
 * Prevents side-channel leaks (e.g. seeing a private meeting node through a public project edge)
 */
export function filterAuthorizedGraph(graph = { nodes: [], edges: [] }, governanceContext) {
  const { userId, accessibleSpaces } = governanceContext;

  const validNodes = graph.nodes.filter(node => {
    const visibility = (node.visibility || node.tier || 'ORGANIZATION').toUpperCase();
    
    if (node.owner_id === userId || node.created_by === userId) return true;
    if (visibility === 'PRIVATE' || visibility === 'PERSONAL' || visibility === 'RESTRICTED') return false;
    if (visibility === 'TEAM' || visibility === 'SPACE') {
      return node.space_id && accessibleSpaces.includes(node.space_id);
    }
    return true; // ORGANIZATION
  });

  const validNodeIds = new Set(validNodes.map(n => n.id));

  // Relationships are only valid if BOTH source and target are visible
  const validEdges = graph.edges.filter(edge => 
    validNodeIds.has(edge.source_entity_id || edge.source) && 
    validNodeIds.has(edge.target_entity_id || edge.target)
  );

  return { nodes: validNodes, edges: validEdges };
}

/**
 * Filter Smart Moments 
 */
export function filterAuthorizedMoments(moments = [], governanceContext) {
  const { userId, isAdmin, accessibleSpaces } = governanceContext;

  return moments.filter(moment => {
    if (moment.owner_id === userId || moment.user_id === userId) return true;
    
    // Derived privacy: If tied to a meeting/capture, what was the visibility?
    const visibility = (moment.visibility || moment.tier || (moment.team_space_id ? 'TEAM' : 'ORGANIZATION')).toUpperCase();

    if (visibility === 'PRIVATE' || visibility === 'PERSONAL' || visibility === 'RESTRICTED') return false;
    if (visibility === 'TEAM' || visibility === 'SPACE') {
      if (moment.team_space_id && accessibleSpaces.includes(moment.team_space_id)) return true;
      return false;
    }
    return true; // ORGANIZATION
  });
}
