const fs = require('fs');
const file = 'src/lib/clipadContextService.js';
let c = fs.readFileSync(file, 'utf8');

if (!c.includes('clipadIntelligenceGovernanceService')) {
  c = c.replace(
    "import { findConnectedKnowledge } from '@/lib/clipadGraphService';",
    "import { findConnectedKnowledge } from '@/lib/clipadGraphService';\nimport { resolveIntelligenceContext, filterAuthorizedMemories, filterAuthorizedMoments, filterAuthorizedGraph } from './clipadIntelligenceGovernanceService';"
  );
}

// In getGraphAwareContext, we inject governance
// Find where it returns { contextText, memories, smartMoments, entities, sources }
const applyGov = `
    // --- Phase 8: Apply Intelligence Governance Layer ---
    const govCtx = await resolveIntelligenceContext({ id: userId, company_id: companyId, role: userRole });
    const authMemories = filterAuthorizedMemories(memories, govCtx);
    const authMoments = filterAuthorizedMoments(smartMoments, govCtx);
    const authEntities = filterAuthorizedGraph({ nodes: entities, edges: [] }, govCtx).nodes;
    
    // Minimal data minimization for AI Context Payload
    const contextText = [
      authMemories.map(m => m.content).join('\\n'),
      authMoments.map(m => m.description).join('\\n')
    ].join('\\n\\n');

    return {
      contextText,
      memories: authMemories,
      smartMoments: authMoments,
      entities: authEntities,
      sources: []
    };
  } catch (error) {`;

c = c.replace(
  /    return \{\r?\n      contextText: \[[\s\S]*?\} catch \(error\) \{/,
  applyGov
);

// If the regex failed because it couldn't find the catch block, let's just do a simpler replace.
if (c === fs.readFileSync(file, 'utf8')) {
  console.log("Regex 1 failed, trying fallback.");
  const applyGovFallback = `
    // --- Phase 8: Apply Intelligence Governance Layer ---
    const govCtx = await resolveIntelligenceContext({ id: userId, company_id: companyId, role: userRole });
    const authMemories = filterAuthorizedMemories(memories, govCtx);
    const authMoments = filterAuthorizedMoments(smartMoments, govCtx);
    const authEntities = filterAuthorizedGraph({ nodes: entities, edges: [] }, govCtx).nodes;
    
    const contextText = [
      authMemories.map(m => \`- \$\{m.title || 'Memory'\}: \$\{m.content\}\`).join('\\n'),
      authMoments.map(m => \`- [Moment] \$\{m.title\}: \$\{m.description\}\`).join('\\n')
    ].join('\\n\\n');

    return {
      contextText,
      memories: authMemories,
      smartMoments: authMoments,
      entities: authEntities,
      sources: []
    };
}
`;
  c = c.replace(
    /    const contextText = \[[\s\S]*?return \{[\s\S]*?sources: \[\]\r?\n    \};\r?\n\}/,
    applyGovFallback
  );
}

fs.writeFileSync(file, c);
console.log('Governance applied to ContextService');
