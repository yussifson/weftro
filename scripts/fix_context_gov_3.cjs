const fs = require('fs');
const file = 'src/lib/clipadContextService.js';
let c = fs.readFileSync(file, 'utf8');

const startIdx = c.indexOf('  const contextLines = [');
if (startIdx !== -1) {
  const prefix = c.substring(0, startIdx);
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

  const contextLines = [
    \`# RELEVANT CONTEXT\`
  ];

  if (authMemories.length > 0) {
    contextLines.push(\`\\nMEMORY NODES (\${authMemories.length})\`);
    authMemories.slice(0, 12).forEach(m => {
      contextLines.push(\`[[\${m.memory_type || 'FACT'}/\${m.memory_tier || 'organizational'}]] "\${m.title}": \${(m.content || m.summary || '').substring(0, 200)}\`);
    });
  }

  if (authMoments.length > 0) {
    contextLines.push(\`\\nSMART MOMENTS (\${authMoments.length})\`);
    authMoments.slice(0, 12).forEach(m => {
      const src = m.meeting_id ? \`Meeting:\${m.meeting_id}\` : 'Video';
      contextLines.push(\`[[\${m.moment_type}]] "\${m.title}" (\${Math.round((m.confidence || 0.9) * 100)}% confidence, from \${src}, \${new Date(m.created_at).toLocaleDateString()})\`);
    });
  }

  if (authEntities.length > 0) {
    contextLines.push(\`\\nCONNECTED ENTITIES (\${authEntities.length})\`);
    authEntities.slice(0, 8).forEach(e => {
      contextLines.push(\`[[\${e.entity_type?.toUpperCase()}]] \${e.name}\${e.description ? ': ' + e.description.substring(0, 120) : ''}\`);
    });
  }

  // Build source provenance list
  const sources = [
    ...authMoments.map(m => ({ id: m.id, type: 'smart_moment', label: m.title, subType: m.moment_type })),
    ...authMemories.map(m => ({ id: m.id, type: 'memory', label: m.title, subType: m.memory_type })),
  ].slice(0, 20);

  return {
    contextText: contextLines.join('\\n'),
    memories: authMemories,
    smartMoments: authMoments,
    entities: authEntities,
    sources,
  };
}
`;
  c = prefix + replacement;
  fs.writeFileSync(file, c);
  console.log('Fixed clipadContextService.js using indexOf');
} else {
  console.log('Could not find startIdx');
}
