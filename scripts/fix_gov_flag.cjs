const fs = require('fs');
const file = 'src/lib/clipadIntelligenceGovernanceService.js';
let c = fs.readFileSync(file, 'utf8');

if (!c.includes('isV3FeatureEnabled')) {
  c = c.replace(
    "import { supabase } from '@/api/supabaseClient';",
    "import { supabase } from '@/api/supabaseClient';\nimport { isV3FeatureEnabled, V3_FLAGS } from './clipadV3Flags';"
  );
}

// Add the flag check to resolveIntelligenceContext
const flagCheck = `
export async function resolveIntelligenceContext(user) {
  if (!user) throw new Error('Unauthenticated user cannot resolve intelligence context');

  // Check Feature Flag
  const isEnabled = isV3FeatureEnabled(V3_FLAGS.ROLE_AWARE_INTELLIGENCE_ENABLED, user);
  if (!isEnabled) {
    // Backward compatibility mode
    return {
      userId: user.id,
      companyId: user.company_id || user.user_metadata?.company_id,
      role: 'admin', // Full access
      isAdmin: true,
      accessibleSpaces: [],
      managedSpaces: [],
      allowedMemoryScopes: ['PERSONAL', 'TEAM', 'ORGANIZATION', 'PRIVATE', 'RESTRICTED'],
      allowedKnowledgeScopes: ['public', 'team', 'organizational'],
      allowedMomentScopes: ['ORGANIZATION', 'TEAM', 'PERSONAL'],
      allowedContextScopes: ['GLOBAL', 'SPACE', 'USER'],
      allowedActions: ['READ', 'WRITE', 'DELETE'],
      isGovernanceBypassed: true
    };
  }
`;

c = c.replace(/export async function resolveIntelligenceContext\(user\) \{[\s\n]*if \(\!user\) throw new Error\('Unauthenticated user cannot resolve intelligence context'\);/, flagCheck);

// Also modify the filters to bypass if isGovernanceBypassed is true
c = c.replace(/export function filterAuthorizedMemories\(memories = \[\], governanceContext\) \{[\s\n]*const \{ userId, isAdmin, accessibleSpaces \} = governanceContext;/, 
`export function filterAuthorizedMemories(memories = [], governanceContext) {
  if (governanceContext.isGovernanceBypassed) return memories;
  const { userId, isAdmin, accessibleSpaces } = governanceContext;`);

c = c.replace(/export function filterAuthorizedGraph\(graph = \{ nodes: \[\], edges: \[\] \}, governanceContext\) \{[\s\n]*const \{ userId, accessibleSpaces \} = governanceContext;/, 
`export function filterAuthorizedGraph(graph = { nodes: [], edges: [] }, governanceContext) {
  if (governanceContext.isGovernanceBypassed) return graph;
  const { userId, accessibleSpaces } = governanceContext;`);

c = c.replace(/export function filterAuthorizedMoments\(moments = \[\], governanceContext\) \{[\s\n]*const \{ userId, isAdmin, accessibleSpaces \} = governanceContext;/, 
`export function filterAuthorizedMoments(moments = [], governanceContext) {
  if (governanceContext.isGovernanceBypassed) return moments;
  const { userId, isAdmin, accessibleSpaces } = governanceContext;`);

fs.writeFileSync(file, c);
console.log('Feature flag added to Governance Service');
