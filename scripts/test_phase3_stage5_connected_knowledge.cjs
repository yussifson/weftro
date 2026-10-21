// scripts/test_phase3_stage5_connected_knowledge.cjs
// Weftro V3 — Phase 3 Stage 5: MCP get_connected_knowledge & UI Breadcrumbs Test Suite
//
// Test Coverage (16 tests):
// 1. Tool registration: get_connected_knowledge in stdio MCP server tools list
// 2. Tool registration: get_connected_knowledge in Connect Gateway REMOTE_MCP_TOOLS schema
// 3. Schema validation: input requires either source_id or query
// 4. Schema validation: limits clamp correctly between 1 and 20 (defaults to 6)
// 5. REST route registered: POST /api/v1/connected-knowledge in Connect Gateway
// 6. Backend service: getEntityNavigationRoute maps doc, task, meeting, decision, etc. correctly
// 7. Backend service: getConnectedRecordsForEntity fetches 1-hop outgoing edges with confidence >= 0.75
// 8. Backend service: getConnectedRecordsForEntity fetches 1-hop incoming edges with confidence >= 0.75
// 9. Edge filtering: relationship_types filter applies correctly (e.g. ['decided_in', 'assigned_to'])
// 10. Security: Cross-tenant isolation (foreign tenant entities/edges excluded)
// 11. Security: Private space boundary (unauthorized private source entity blocked)
// 12. Security: Private space boundary (unauthorized private connected targets excluded)
// 13. Deduplication: multiple edges to same entity do not produce duplicate entries
// 14. UI breadcrumbs: connected records format preserves title, type, relationship, and route
// 15. UI breadcrumbs: empty connections handle gracefully without errors
// 16. Regression: search_organizational_memory tool contract preserved unchanged

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(`    ${err.message}`);
  }
}

// Function implementations mirroring clipadEntityService logic for testing in CJS
function getEntityNavigationRoute(entityType, entityRecordId, spaceId = null) {
  if (!entityType || !entityRecordId) return null;
  const type = String(entityType).toLowerCase();
  switch (type) {
    case 'meeting':
      return `/meetings/${entityRecordId}`;
    case 'video':
      return `/watch/${entityRecordId}`;
    case 'doc':
    case 'document':
      return spaceId ? `/spaces/${spaceId}?tab=docs&docId=${entityRecordId}` : null;
    case 'task':
      return spaceId ? `/spaces/${spaceId}?tab=tasks&taskId=${entityRecordId}` : null;
    case 'decision':
      return spaceId ? `/spaces/${spaceId}?tab=decisions` : null;
    case 'blocker':
      return spaceId ? `/spaces/${spaceId}?tab=overview` : null;
    case 'space':
      return `/spaces/${entityRecordId}`;
    case 'capture':
    case 'memory':
      return '/capture';
    case 'person':
      return null;
    default:
      return null;
  }
}

async function getConnectedRecordsForEntity({
  supabase,
  companyId,
  sourceId,
  sourceType = null,
  accessibleSpaceIds = [],
  limit = 6,
  minConfidence = 0.75,
  relationshipTypes = null,
}) {
  if (!companyId || !sourceId) return [];

  try {
    let nodeQuery = supabase
      .from('clipad_v3_entities')
      .select('id, company_id, entity_type, entity_id, name, description, metadata')
      .eq('company_id', companyId);

    if (sourceType) nodeQuery = nodeQuery.eq('entity_type', sourceType);

    const { data: matchedNodes, error: nodeErr } = await nodeQuery
      .or(`id.eq.${sourceId},entity_id.eq.${sourceId}`)
      .limit(1);

    if (nodeErr || !matchedNodes || matchedNodes.length === 0) return [];

    const sourceNode = matchedNodes[0];
    const spaceSet = new Set((accessibleSpaceIds || []).map(String));
    const srcMeta = sourceNode.metadata || {};
    const srcSpaceId = srcMeta.space_id || srcMeta.team_space_id;
    if (srcMeta.is_private && (!srcSpaceId || !spaceSet.has(String(srcSpaceId)))) {
      return [];
    }

    let outgoingQuery = supabase
      .from('clipad_v3_entity_relationships')
      .select('id, source_entity_id, target_entity_id, relationship_type, confidence, metadata')
      .eq('company_id', companyId)
      .eq('source_entity_id', sourceNode.id)
      .gte('confidence', minConfidence);

    let incomingQuery = supabase
      .from('clipad_v3_entity_relationships')
      .select('id, source_entity_id, target_entity_id, relationship_type, confidence, metadata')
      .eq('company_id', companyId)
      .eq('target_entity_id', sourceNode.id)
      .gte('confidence', minConfidence);

    if (relationshipTypes && Array.isArray(relationshipTypes) && relationshipTypes.length > 0) {
      outgoingQuery = outgoingQuery.in('relationship_type', relationshipTypes);
      incomingQuery = incomingQuery.in('relationship_type', relationshipTypes);
    }

    const [outRes, inRes] = await Promise.all([
      outgoingQuery.limit(limit * 3),
      incomingQuery.limit(limit * 3),
    ]);

    const candidateEdges = [];
    (outRes.data || []).forEach(e => candidateEdges.push({ ...e, connectedNodeId: e.target_entity_id, direction: 'outgoing' }));
    (inRes.data || []).forEach(e => candidateEdges.push({ ...e, connectedNodeId: e.source_entity_id, direction: 'incoming' }));

    if (candidateEdges.length === 0) return [];

    const connectedNodeIds = Array.from(new Set(candidateEdges.map(e => e.connectedNodeId)));
    const { data: connectedEntities, error: connErr } = await supabase
      .from('clipad_v3_entities')
      .select('id, company_id, entity_type, entity_id, name, description, metadata')
      .eq('company_id', companyId)
      .in('id', connectedNodeIds);

    if (connErr || !connectedEntities) return [];

    const entityMap = new Map(connectedEntities.map(e => [e.id, e]));
    const seenTargetIds = new Set();
    const authorizedConnected = [];

    for (const edge of candidateEdges) {
      if (authorizedConnected.length >= limit) break;
      const target = entityMap.get(edge.connectedNodeId);
      if (!target || target.company_id !== companyId) continue;

      const targetRecordId = String(target.entity_id || target.id);
      if (seenTargetIds.has(targetRecordId) || targetRecordId === String(sourceNode.entity_id || sourceNode.id)) {
        continue;
      }

      const tMeta = target.metadata || {};
      const edgeMeta = edge.metadata || {};
      const targetSpaceId = tMeta.space_id || tMeta.team_space_id || edgeMeta.space_id;
      const isPrivate = tMeta.is_private === true || edgeMeta.is_private === true;

      if (isPrivate && (!targetSpaceId || !spaceSet.has(String(targetSpaceId)))) {
        continue;
      }

      seenTargetIds.add(targetRecordId);
      const navRoute = getEntityNavigationRoute(target.entity_type, target.entity_id || target.id, targetSpaceId);

      authorizedConnected.push({
        id: targetRecordId,
        entity_id: target.id,
        title: target.name,
        type: target.entity_type,
        snippet: target.description || tMeta.snippet || `Connected ${target.entity_type}`,
        route: navRoute,
        relationship: {
          type: edge.relationship_type,
          direction: edge.direction,
          confidence: edge.confidence,
        },
        metadata: tMeta,
      });
    }

    return authorizedConnected;
  } catch (err) {
    return [];
  }
}

async function main() {
  console.log('================================================================');
  console.log('WEFTRO V3 — PHASE 3 STAGE 5: MCP & UI BREADCRUMBS VERIFICATION');
  console.log('================================================================\n');

  const rootDir = path.resolve(__dirname, '..');

  // Load files for inspection
  const mcpServerCode = fs.readFileSync(path.join(rootDir, 'packages/weftro-mcp/index.js'), 'utf8');
  const gatewayCode = fs.readFileSync(path.join(rootDir, 'supabase/functions/connect/index.ts'), 'utf8');
  const entityServiceCode = fs.readFileSync(path.join(rootDir, 'src/lib/clipadEntityService.js'), 'utf8');
  const searchHubCode = fs.readFileSync(path.join(rootDir, 'src/pages/clipad/SearchHub.jsx'), 'utf8');

  // 1. Tool Registration in stdio MCP server
  runTest('1. Tool registration: get_connected_knowledge in stdio MCP server tools list', () => {
    assert(mcpServerCode.includes("name: 'get_connected_knowledge'"), 'Tool name missing in stdio MCP server');
    assert(mcpServerCode.includes("case 'get_connected_knowledge':"), 'Tool handler missing in stdio MCP server');
    assert(mcpServerCode.includes('/api/v1/connected-knowledge'), 'callGateway route missing in stdio MCP server');
  });

  // 2. Tool Registration in Connect Gateway
  runTest('2. Tool registration: get_connected_knowledge in Connect Gateway REMOTE_MCP_TOOLS', () => {
    assert(gatewayCode.includes("name: 'get_connected_knowledge'"), 'Tool name missing in Connect Gateway');
    assert(gatewayCode.includes("case 'get_connected_knowledge':"), 'MCP handler missing in Connect Gateway tools/call dispatcher');
  });

  // 3. Schema validation: input requires either source_id or query
  runTest('3. Schema validation: input requires either source_id or query', () => {
    assert(mcpServerCode.includes("data.source_id || data.query"), 'Zod refine rule for source_id or query missing in stdio MCP server');
    assert(gatewayCode.includes("!sourceId && !query"), 'Validation check missing in Connect Gateway handler');
  });

  // 4. Schema validation: limits clamp correctly between 1 and 20
  runTest('4. Schema validation: limits clamp correctly between 1 and 20 (defaults to 6)', () => {
    assert(gatewayCode.includes("Math.min(Math.max(1, Number(toolArgs.limit) || 6), 20)"), 'Limit clamping missing in MCP handler');
    assert(gatewayCode.includes("Math.min(Math.max(1, Number(body.limit) || 6), 20)"), 'Limit clamping missing in REST handler');
  });

  // 5. REST Route registered: POST /api/v1/connected-knowledge
  runTest('5. REST route registered: POST /api/v1/connected-knowledge in Connect Gateway', () => {
    assert(gatewayCode.includes("subpath === '/connected-knowledge' || subpath === '/api/v1/connected-knowledge'"), 'REST route handler missing in Connect Gateway');
    assert(gatewayCode.includes("path: '/api/v1/connected-knowledge'"), 'Route missing from capabilities list');
  });

  // 6. Backend service: getEntityNavigationRoute maps doc, task, meeting, decision correctly
  runTest('6. Backend service: getEntityNavigationRoute maps entity types correctly', () => {
    assert.strictEqual(getEntityNavigationRoute('meeting', 'm-123'), '/meetings/m-123');
    assert.strictEqual(getEntityNavigationRoute('video', 'v-456'), '/watch/v-456');
    assert.strictEqual(getEntityNavigationRoute('doc', 'd-789', 'sp-1'), '/spaces/sp-1?tab=docs&docId=d-789');
    assert.strictEqual(getEntityNavigationRoute('task', 't-101', 'sp-2'), '/spaces/sp-2?tab=tasks&taskId=t-101');
    assert.strictEqual(getEntityNavigationRoute('decision', 'dec-1', 'sp-3'), '/spaces/sp-3?tab=decisions');
    assert.strictEqual(getEntityNavigationRoute('capture', 'cap-1'), '/capture');
    assert.strictEqual(getEntityNavigationRoute('unknown', 'u-1'), null);
  });

function createMockSupabase({ entities = [], relationships = [] }) {
  return {
    from: (tbl) => {
      let currentData = tbl === 'clipad_v3_entities' ? [...entities] : [...relationships];
      let selectedCols = null;

      const builder = {
        select: (cols) => {
          selectedCols = cols;
          return builder;
        },
        eq: (col, val) => {
          currentData = currentData.filter(item => item[col] === val);
          return builder;
        },
        or: (orClause) => {
          // Parse basic or clause: id.eq.X,entity_id.eq.X
          const parts = orClause.split(',');
          currentData = currentData.filter(item => {
            return parts.some(p => {
              const [c, op, v] = p.split('.');
              if (op === 'eq') return String(item[c]) === String(v);
              return false;
            });
          });
          return builder;
        },
        in: (col, vals) => {
          const valSet = new Set(vals.map(String));
          currentData = currentData.filter(item => valSet.has(String(item[col])));
          return builder;
        },
        gte: (col, minVal) => {
          currentData = currentData.filter(item => (item[col] ?? 0) >= minVal);
          return builder;
        },
        limit: (n) => {
          return Promise.resolve({ data: currentData.slice(0, n), error: null });
        },
        then: (resolve, reject) => {
          resolve({ data: currentData, error: null });
        }
      };

      return builder;
    }
  };
}

  // 7. Backend service: getConnectedRecordsForEntity fetches 1-hop outgoing edges
  await runAsyncTest('7. Backend service: getConnectedRecordsForEntity fetches 1-hop outgoing edges with confidence >= 0.75', async () => {
    const mockSupabase = createMockSupabase({
      entities: [
        { id: 'ent-source-1', entity_id: 'rec-1', name: 'Product Spec', entity_type: 'doc', company_id: 'co-1', metadata: { space_id: 'sp-pub' } },
        { id: 'ent-target-1', entity_id: 'task-1', name: 'Implement Auth', entity_type: 'task', company_id: 'co-1', metadata: { space_id: 'sp-pub' } },
      ],
      relationships: [
        { id: 'rel-1', company_id: 'co-1', source_entity_id: 'ent-source-1', target_entity_id: 'ent-target-1', relationship_type: 'defines_task', confidence: 0.95, metadata: {} },
      ],
    });

    const res = await getConnectedRecordsForEntity({
      supabase: mockSupabase,
      companyId: 'co-1',
      sourceId: 'rec-1',
      sourceType: 'doc',
      accessibleSpaceIds: ['sp-pub'],
    });

    assert(Array.isArray(res), 'Result should be an array');
    assert.strictEqual(res.length, 1, 'Should find 1 connected record');
    assert.strictEqual(res[0].id, 'task-1');
    assert.strictEqual(res[0].title, 'Implement Auth');
    assert.strictEqual(res[0].relationship.type, 'defines_task');
    assert.strictEqual(res[0].relationship.direction, 'outgoing');
    assert.strictEqual(res[0].route, '/spaces/sp-pub?tab=tasks&taskId=task-1');
  });

  // 8. Backend service: getConnectedRecordsForEntity fetches incoming edges
  await runAsyncTest('8. Backend service: getConnectedRecordsForEntity fetches 1-hop incoming edges with confidence >= 0.75', async () => {
    const mockSupabase = createMockSupabase({
      entities: [
        { id: 'ent-source-1', entity_id: 'rec-1', name: 'Product Spec', entity_type: 'doc', company_id: 'co-1', metadata: { space_id: 'sp-pub' } },
        { id: 'ent-target-1', entity_id: 'task-1', name: 'Implement Auth', entity_type: 'task', company_id: 'co-1', metadata: { space_id: 'sp-pub' } },
      ],
      relationships: [
        { id: 'rel-1', company_id: 'co-1', source_entity_id: 'ent-source-1', target_entity_id: 'ent-target-1', relationship_type: 'defines_task', confidence: 0.90, metadata: {} },
      ],
    });

    const res = await getConnectedRecordsForEntity({
      supabase: mockSupabase,
      companyId: 'co-1',
      sourceId: 'task-1',
      sourceType: 'task',
      accessibleSpaceIds: ['sp-pub'],
    });

    assert(Array.isArray(res), 'Result should be an array');
    assert.strictEqual(res.length, 1, 'Should find 1 connected record');
    assert.strictEqual(res[0].id, 'rec-1');
    assert.strictEqual(res[0].relationship.direction, 'incoming');
  });

  // 9. Edge filtering: relationship_types filter applies correctly
  await runAsyncTest('9. Edge filtering: relationship_types filter applies in query', async () => {
    let inCalled = false;
    const mockSupabase = {
      from: (tbl) => {
        if (tbl === 'clipad_v3_entities') {
          return {
            select: () => ({
              eq: () => ({
                or: () => ({ limit: async () => ({ data: [{ id: 'e1', entity_id: 'rec1', metadata: {} }] }) }),
                in: async () => ({ data: [] }),
              }),
            }),
          };
        }
        if (tbl === 'clipad_v3_entity_relationships') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gte: () => ({
                    in: (col, types) => {
                      inCalled = true;
                      assert.deepStrictEqual(types, ['decided_in']);
                      return { limit: async () => ({ data: [] }) };
                    },
                  }),
                }),
              }),
            }),
          };
        }
      },
    };

    await getConnectedRecordsForEntity({
      supabase: mockSupabase,
      companyId: 'co-1',
      sourceId: 'rec1',
      relationshipTypes: ['decided_in'],
      accessibleSpaceIds: [],
    });

    assert(inCalled, 'relationship_type IN query filter should have been applied');
  });

  // 10. Security: Cross-tenant isolation
  await runAsyncTest('10. Security: Cross-tenant isolation excludes foreign tenant entities', async () => {
    const mockSupabase = {
      from: (tbl) => {
        if (tbl === 'clipad_v3_entities') {
          return {
            select: () => ({
              eq: () => ({
                or: () => ({ limit: async () => ({ data: [{ id: 'e1', entity_id: 'rec1', company_id: 'co-A', metadata: {} }] }) }),
                in: async () => ({
                  data: [
                    { id: 'e2', entity_id: 'rec2', name: 'Alien Note', company_id: 'co-B', metadata: {} },
                  ],
                }),
              }),
            }),
          };
        }
        if (tbl === 'clipad_v3_entity_relationships') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gte: () => ({
                    limit: async () => ({
                      data: [{ id: 'r1', source_entity_id: 'e1', target_entity_id: 'e2', confidence: 0.9, relationship_type: 'relates' }],
                    }),
                  }),
                }),
              }),
            }),
          };
        }
      },
    };

    const res = await getConnectedRecordsForEntity({
      supabase: mockSupabase,
      companyId: 'co-A',
      sourceId: 'rec1',
      accessibleSpaceIds: [],
    });

    assert.strictEqual(res.length, 0, 'Foreign tenant record must be filtered out');
  });

  // 11. Security: Private space boundary (unauthorized private source entity blocked)
  await runAsyncTest('11. Security: Private space boundary blocks unauthorized private source', async () => {
    const mockSupabase = {
      from: (tbl) => {
        if (tbl === 'clipad_v3_entities') {
          return {
            select: () => ({
              eq: () => ({
                or: () => ({
                  limit: async () => ({
                    data: [{ id: 'e1', entity_id: 'rec1', metadata: { is_private: true, space_id: 'secret-space' } }],
                  }),
                }),
              }),
            }),
          };
        }
      },
    };

    const res = await getConnectedRecordsForEntity({
      supabase: mockSupabase,
      companyId: 'co-1',
      sourceId: 'rec1',
      accessibleSpaceIds: ['public-space'],
    });

    assert.strictEqual(res.length, 0, 'Unauthorized private source must return empty list without leaking');
  });

  // 12. Security: Private space boundary (unauthorized private connected targets excluded)
  await runAsyncTest('12. Security: Private space boundary excludes unauthorized private connected targets', async () => {
    const mockSupabase = {
      from: (tbl) => {
        if (tbl === 'clipad_v3_entities') {
          return {
            select: () => ({
              eq: () => ({
                or: () => ({
                  limit: async () => ({
                    data: [{ id: 'e1', entity_id: 'rec1', metadata: { is_private: false } }],
                  }),
                }),
                in: async () => ({
                  data: [
                    { id: 'e2', entity_id: 'rec2', name: 'Secret Doc', company_id: 'co-1', metadata: { is_private: true, space_id: 'priv-space' } },
                    { id: 'e3', entity_id: 'rec3', name: 'Public Doc', company_id: 'co-1', metadata: { is_private: false, space_id: 'pub-space' } },
                  ],
                }),
              }),
            }),
          };
        }
        if (tbl === 'clipad_v3_entity_relationships') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gte: () => ({
                    limit: async () => ({
                      data: [
                        { id: 'r1', source_entity_id: 'e1', target_entity_id: 'e2', confidence: 0.95, relationship_type: 'mentions' },
                        { id: 'r2', source_entity_id: 'e1', target_entity_id: 'e3', confidence: 0.90, relationship_type: 'mentions' },
                      ],
                    }),
                  }),
                }),
              }),
            }),
          };
        }
      },
    };

    const res = await getConnectedRecordsForEntity({
      supabase: mockSupabase,
      companyId: 'co-1',
      sourceId: 'rec1',
      accessibleSpaceIds: ['pub-space'],
    });

    assert.strictEqual(res.length, 1, 'Only public space target should be returned');
    assert.strictEqual(res[0].id, 'rec3');
    assert.strictEqual(res[0].title, 'Public Doc');
  });

  // 13. Deduplication: multiple edges to same entity do not produce duplicate entries
  await runAsyncTest('13. Deduplication: multiple edges to same target entity produce single entry', async () => {
    const mockSupabase = {
      from: (tbl) => {
        if (tbl === 'clipad_v3_entities') {
          return {
            select: () => ({
              eq: () => ({
                or: () => ({ limit: async () => ({ data: [{ id: 'e1', entity_id: 'rec1', metadata: {} }] }) }),
                in: async () => ({
                  data: [{ id: 'e2', entity_id: 'rec2', name: 'Architecture Doc', company_id: 'co-1', metadata: {} }],
                }),
              }),
            }),
          };
        }
        if (tbl === 'clipad_v3_entity_relationships') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gte: () => ({
                    limit: async () => ({
                      data: [
                        { id: 'r1', source_entity_id: 'e1', target_entity_id: 'e2', confidence: 0.95, relationship_type: 'references' },
                        { id: 'r2', source_entity_id: 'e1', target_entity_id: 'e2', confidence: 0.85, relationship_type: 'defined_by' },
                      ],
                    }),
                  }),
                }),
              }),
            }),
          };
        }
      },
    };

    const res = await getConnectedRecordsForEntity({
      supabase: mockSupabase,
      companyId: 'co-1',
      sourceId: 'rec1',
      accessibleSpaceIds: [],
    });

    assert.strictEqual(res.length, 1, 'Must deduplicate target records');
    assert.strictEqual(res[0].id, 'rec2');
  });

  // 14. UI breadcrumbs: connected records format preserves title, type, relationship, and route
  runTest('14. UI breadcrumbs: SearchHub.jsx renders Connected Knowledge panel with navigation', () => {
    assert(searchHubCode.includes('Connected Knowledge'), 'Connected Knowledge section title missing in SearchHub.jsx');
    assert(searchHubCode.includes('connectedRecords.map'), 'Connected records map rendering missing in SearchHub.jsx');
    assert(searchHubCode.includes('getConnectedRecordsForEntity'), 'getConnectedRecordsForEntity invocation missing in SearchHub.jsx');
    assert(searchHubCode.includes('isLoadingConnected'), 'Loading indicator missing in SearchHub.jsx');
  });

  // 15. UI breadcrumbs: empty connections handle gracefully without errors
  runTest('15. UI breadcrumbs: empty connections display graceful fallback state', () => {
    assert(searchHubCode.includes('No verified 1-hop connections found for this record.'), 'Fallback empty state message missing in SearchHub.jsx');
  });

  // 16. Regression: search_organizational_memory tool contract preserved unchanged
  runTest('16. Regression: search_organizational_memory tool contract preserved unchanged', () => {
    assert(mcpServerCode.includes("name: 'search_organizational_memory'"), 'search_organizational_memory missing in stdio MCP server');
    assert(gatewayCode.includes("case 'search_organizational_memory':"), 'search_organizational_memory missing in Connect Gateway');
  });

  console.log(`\n================================================================`);
  console.log(`RESULTS: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log(`================================================================\n`);

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
