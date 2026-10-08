const fs = require('fs');
const file = 'src/lib/clipadConnectService.js';
let c = fs.readFileSync(file, 'utf8');

if (!c.includes('clipadIntelligenceGovernanceService')) {
  c = c.replace(
    "import { isV3FeatureEnabled, V3_FLAGS } from './clipadV3Flags';",
    "import { isV3FeatureEnabled, V3_FLAGS } from './clipadV3Flags';\nimport { resolveIntelligenceContext, filterAuthorizedMemories, filterAuthorizedMoments } from './clipadIntelligenceGovernanceService';"
  );
}

// Intercept searchAuthorizedMemory
const memReplace = `async function searchAuthorizedMemory(user, query) {
  const govCtx = await resolveIntelligenceContext(user);
  const { data, error } = await supabase
    .from('clipad_v3_organizational_memory')
    .select('*')
    .eq('company_id', user.company_id)
    .ilike('content', \`%\${query}%\`)
    .limit(20);

  if (error) throw error;
  
  // Apply Phase 8 Intelligence Governance Layer
  const authorizedData = filterAuthorizedMemories(data, govCtx);
  
  // Provenance formatting
  return authorizedData.map(mem => ({`;

c = c.replace(
  /async function searchAuthorizedMemory\(user, query\) \{[\s\S]*?\/\/ Provenance formatting\r?\n\s*return data\.map\(mem => \(\{/,
  memReplace
);

// Intercept getAuthorizedSmartMoments
const momentReplace = `async function getAuthorizedSmartMoments(user, topic) {
  const govCtx = await resolveIntelligenceContext(user);
  const { data, error } = await supabase
    .from('clipad_v3_smart_moments')
    .select('*')
    .eq('company_id', user.company_id)
    .ilike('topics', \`%\${topic}%\`)
    .limit(20);
    
  if (error) throw new Error('Unauthorized or moments not found');
  return filterAuthorizedMoments(data, govCtx);
}`;

c = c.replace(
  /async function getAuthorizedSmartMoments\(user, topic\) \{[\s\S]*?return data;\r?\n\}/,
  momentReplace
);

fs.writeFileSync(file, c);
console.log('Governance applied to ConnectService');
