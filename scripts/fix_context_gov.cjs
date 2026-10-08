const fs = require('fs');
const file = 'src/lib/clipadContextService.js';
let c = fs.readFileSync(file, 'utf8');

const regex = /  const contextLines = \[\];[\s\S]*?  \};[\s\n]*\}/m;

const replacement = `  // --- Phase 8: Apply Intelligence Governance Layer ---
  let authMemories = allMemories;
  let authMoments = allMoments;
  let authEntities = graphKnowledge.entities || [];

  if (userId) {
    const govCtx = await resolveIntelligenceContext({ id: userId, company_id: companyId, role: userRole });
    authMemories = filterAuthorizedMemories(allMemories, govCtx);
    authMoments = filterAuthorizedMoments(allMoments, govCtx);
    authEntities = filterAuthorizedGraph({ nodes: authEntities, edges: [] }, govCtx).nodes;
  }
  
  const contextLines = [];
  if (authMemories.length > 0) {
    contextLines.push('## RELEVANT ORGANIZATIONAL MEMORY ##');
    authMemories.forEach((mem, idx) => {
      contextLines.push(\`[Memory \${idx + 1}] (\${mem.tier}) \${mem.title || 'Untitled'}\`);
      contextLines.push(mem.content);
      contextLines.push('');
    });
  }

  if (authMoments.length > 0) {
    contextLines.push('## SMART MOMENTS (MEETINGS & DECISIONS) ##');
    authMoments.forEach((mom, idx) => {
      contextLines.push(\`[Moment \${idx + 1}] [\${mom.moment_type}] \${mom.title}\`);
      contextLines.push(mom.description);
      contextLines.push('');
    });
  }

  if (authEntities.length > 0) {
    contextLines.push('## KNOWLEDGE GRAPH ENTITIES ##');
    authEntities.forEach((ent, idx) => {
      contextLines.push(\`[Entity \${idx + 1}] \${ent.name} (\${ent.type})\`);
      if (ent.description) contextLines.push(ent.description);
      contextLines.push('');
    });
  }

  return {
    contextText: contextLines.join('\\n').trim(),
    memories: authMemories,
    smartMoments: authMoments,
    entities: authEntities,
    sources,
  };
}`;

if (regex.test(c)) {
  c = c.replace(regex, replacement);
  fs.writeFileSync(file, c);
  console.log('Fixed clipadContextService.js');
} else {
  console.log('Regex failed');
}
