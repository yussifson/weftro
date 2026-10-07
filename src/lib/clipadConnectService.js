// src/lib/clipadConnectService.js
// Phase 7: Connect Layer - Authorized Context Retrieval (API / MCP Foundation)

import { supabase } from '@/api/supabaseClient';
import { validateToken } from './clipadOAuthService';
import { getCapture } from './clipadCaptureService';
import { isV3FeatureEnabled, V3_FLAGS } from './clipadV3Flags';

const VALID_SCOPES = ['memory:read', 'knowledge:read', 'search:read', 'moments:read', 'context:read', 'analysis:read'];

/**
 * Ensures the scope is present in the granted scopes array
 */
function requireScope(grantedScopes, requiredScope) {
  if (!grantedScopes.includes(requiredScope)) {
    throw new Error(\`Unauthorized: missing required scope '\${requiredScope}'\`);
  }
}

/**
 * Core entry point for external AI / MCP to fetch context.
 * Resolves the token, enforces scopes, queries underlying V3 architecture securely.
 */
export async function getAuthorizedContext({ rawToken, query, resourceType = 'memory' }) {
  // 1. Authenticate the caller
  const { user, app, scopes } = await validateToken(rawToken);

  if (!isV3FeatureEnabled(V3_FLAGS.CONNECT_ENABLED, user)) {
    throw new Error('Connect API is currently disabled for this tenant.');
  }

  // 2. Route to the appropriate resource layer based on type
  switch (resourceType) {
    case 'memory':
      requireScope(scopes, 'memory:read');
      return await searchAuthorizedMemory(user, query);
    case 'context':
      requireScope(scopes, 'context:read');
      return await getAuthorizedContextSession(user, query.sessionId);
    case 'entity':
      requireScope(scopes, 'knowledge:read');
      return await getAuthorizedEntity(user, query.entityId);
    default:
      throw new Error(\`Unsupported resource type: \${resourceType}\`);
  }
}

/**
 * Retrieves memory, strictly respecting existing RLS.
 * Because we execute the query using the authenticated Supabase client 
 * injected with the user's JWT context (if we were in Edge Functions), 
 * RLS applies automatically. 
 * Since we are simulating the service boundary locally, we enforce the company_id.
 */
async function searchAuthorizedMemory(user, query) {
  const { data, error } = await supabase
    .from('clipad_v3_organizational_memory')
    .select('*')
    .eq('company_id', user.company_id)
    .ilike('content', \`%\${query}%\`) // Basic search simulation for Phase 7
    .limit(10);

  if (error) throw error;
  
  // Provenance formatting
  return data.map(mem => ({
    id: mem.id,
    type: mem.memory_type,
    content: mem.content,
    provenance: {
      source_id: mem.source_capture_id,
      timestamp: mem.created_at,
      confidence: mem.confidence,
      permissions: mem.tier
    }
  }));
}

async function getAuthorizedContextSession(user, sessionId) {
  if (!sessionId) throw new Error('sessionId required');
  
  const { data, error } = await supabase
    .from('clipad_v3_context_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('company_id', user.company_id)
    .single();

  if (error) throw new Error('Unauthorized or session not found');
  
  // Fetch captures linked to session to build full context tree
  const { data: captures } = await supabase
    .from('clipad_v3_captures')
    .select('id, title, content, visibility, metadata')
    .eq('context_session_id', sessionId)
    .eq('company_id', user.company_id);

  return {
    session: data,
    context_tree: captures || []
  };
}

async function getAuthorizedEntity(user, entityId) {
  if (!entityId) throw new Error('entityId required');

  const { data, error } = await supabase
    .from('clipad_v3_entities')
    .select('*')
    .eq('id', entityId)
    .eq('company_id', user.company_id)
    .single();

  if (error) throw new Error('Unauthorized or entity not found');
  return data;
}

/**
 * MCP Tool Interface (Simulation layer for MCP Servers)
 */
export const mcpTools = {
  search_clipad: async (args, token) => getAuthorizedContext({ rawToken: token, query: args.query, resourceType: 'memory' }),
  get_context: async (args, token) => getAuthorizedContext({ rawToken: token, query: { sessionId: args.sessionId }, resourceType: 'context' }),
  get_entity: async (args, token) => getAuthorizedContext({ rawToken: token, query: { entityId: args.entityId }, resourceType: 'entity' })
};
