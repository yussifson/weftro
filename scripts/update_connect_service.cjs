const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'lib', 'clipadConnectService.js');
let content = fs.readFileSync(file, 'utf8');

// Add Audit Logging to getAuthorizedContext
const auditLogSnippet = `
  // 1.5. Audit Log the Request
  await supabase.from('clipad_v3_events').insert([{
    company_id: user.company_id,
    user_id: user.id,
    event_type: 'connect.access',
    source_domain: 'mcp_or_api',
    payload: { app: app.id, resourceType, query, scopes }
  }]).catch(err => console.warn('Failed to write audit log', err));
`;
content = content.replace(
  "  // 2. Route to the appropriate resource layer based on type",
  auditLogSnippet + "\n  // 2. Route to the appropriate resource layer based on type"
);

// Add missing resource types to getAuthorizedContext switch
const missingResourceTypesSnippet = `
    case 'relationships':
      requireScope(scopes, 'knowledge:read');
      return await getAuthorizedRelationships(user, query.entityId);
    case 'smart_moments':
      requireScope(scopes, 'moments:read');
      return await getAuthorizedSmartMoments(user, query.topic);
`;
content = content.replace(
  "    case 'entity':",
  missingResourceTypesSnippet + "    case 'entity':"
);

// Add stub/implementations for new getters
const newGetters = `
async function getAuthorizedRelationships(user, entityId) {
  if (!entityId) throw new Error('entityId required');
  const { data, error } = await supabase
    .from('clipad_v3_entity_relationships')
    .select('*')
    .eq('company_id', user.company_id)
    .or(\`source_entity_id.eq.\${entityId},target_entity_id.eq.\${entityId}\`);
  if (error) throw new Error('Unauthorized or relationships not found');
  return data;
}

async function getAuthorizedSmartMoments(user, topic) {
  const { data, error } = await supabase
    .from('clipad_v3_smart_moments')
    .select('*')
    .eq('company_id', user.company_id)
    .ilike('topics', \`%\${topic}%\`)
    .limit(10);
  if (error) throw new Error('Unauthorized or moments not found');
  return data;
}
`;
content = content.replace(
  "export const mcpTools =",
  newGetters + "\nexport const mcpTools ="
);

// Update mcpTools mapping
const missingMcpMappings = `
  get_memory: async (args, token) => getAuthorizedContext({ rawToken: token, query: args.query, resourceType: 'memory' }),
  get_relationships: async (args, token) => getAuthorizedContext({ rawToken: token, query: { entityId: args.entityId }, resourceType: 'relationships' }),
  get_smart_moments: async (args, token) => getAuthorizedContext({ rawToken: token, query: { topic: args.topic }, resourceType: 'smart_moments' }),
`;
content = content.replace(
  "  get_entity: async (args, token) => getAuthorizedContext({ rawToken: token, query: { entityId: args.entityId }, resourceType: 'entity' })",
  "  get_entity: async (args, token) => getAuthorizedContext({ rawToken: token, query: { entityId: args.entityId }, resourceType: 'entity' }),\n" + missingMcpMappings
);

fs.writeFileSync(file, content, 'utf8');
console.log('Updated clipadConnectService.js with MCP mappings and Audit Logging');
