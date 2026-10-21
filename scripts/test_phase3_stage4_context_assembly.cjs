// scripts/test_phase3_stage4_context_assembly.cjs
// Weftro V3 — Phase 3 Stage 4: Organizational Context Assembly & Evidence-Aware RAG Test Suite
//
// Tests:
// 1. Direct evidence prioritization over weakly related records
// 2. Relevant related evidence clarifies direct answers without overclaiming causation
// 3. Duplicate evidence removal while preserving meaningful contradictions (e.g. status changes)
// 4. Empty/unavailable related evidence handles gracefully without breaking assembly
// 5. Evidence selection remains predictable under context budget
// 6. Evidence-aware reasoning: relationship != proof of completion or approval
// 7. Unsupported claims produce honest abstention/limitation
// 8. Conflicting sources detected and represented accurately
// 9. Old vs new records handled according to timestamps, not unsupported assumptions
// 10. Direct [#1] and related [#R1] citations remain distinct and correctly mapped
// 11. Context budget enforcement: total <= 18,000 chars, related <= 4,000 chars
// 12. Security: Cross-tenant records excluded
// 13. Security: Unauthorized private-space records excluded
// 14. Inaccessible related targets cannot enter prompt or leak metadata
// 15. Scanned/image-only PDF safeguards remain intact in mixed evidence

const assert = require('assert');
const fs = require('fs');

console.log('================================================================');
console.log(' WEFTRO V3 — PHASE 3 STAGE 4: CONTEXT ASSEMBLY & RAG TEST SUITE');
console.log('================================================================\n');

// Load exported functions from clipadRAGSynthesisService and clipadContextService
function loadModuleExports(filePath, exportNames) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const filtered = lines
    .filter(l => !l.startsWith('import '))
    .map(l => l.replace(/^export\s+/, ''));
  const cjs = filtered.join('\n') + `\nmodule.exports = { ${exportNames.join(', ')} };\n`;
  const tempPath = filePath.replace('.js', '.temp_test.cjs');
  fs.writeFileSync(tempPath, cjs, 'utf8');
  const mod = require(tempPath);
  fs.unlinkSync(tempPath);
  return mod;
}

const ragMod = loadModuleExports('c:/Users/USER/OneDrive/Documents/clipad/src/lib/clipadRAGSynthesisService.js', [
  'formatEvidencePack',
  'isUnextractableContent',
  'prioritizeAndDeduplicateEvidence',
  'detectEvidenceConflicts',
  'computeEvidenceScore',
  'buildSystemPrompt',
  'buildInsufficientEvidenceMessage',
  'buildUnextractableOnlyMessage',
  'MAX_TOTAL_EVIDENCE_CHARS',
  'MAX_RELATED_CONTEXT_CHARS',
  'SYNTHESIS_STATUS',
]);

const ctxMod = loadModuleExports('c:/Users/USER/OneDrive/Documents/clipad/src/lib/clipadContextService.js', [
  'assembleOrganizationalContext',
  'CONTEXT_BUDGETS',
]);

// ── TEST 1: Direct Evidence Prioritization Over Related Evidence ──
console.log('--- Test 1: Direct Evidence Prioritization ---');
const testItems1 = [
  { id: 'rel_1', title: 'Related Doc', isRelatedEvidence: true, rrf_score: 0.9, relationship: { confidence: 0.85 } },
  { id: 'dir_1', title: 'Direct Doc', isRelatedEvidence: false, rrf_score: 0.4, confidence: 1.0 },
];
const prioritized1 = ragMod.prioritizeAndDeduplicateEvidence(testItems1);
assert.strictEqual(prioritized1[0].id, 'dir_1', 'Direct evidence must be ordered before related evidence');
assert.strictEqual(prioritized1[1].id, 'rel_1');
console.log('[PASS] Test 1: Direct evidence is prioritized over related evidence.');

// ── TEST 2: Relevant Related Evidence Clarifies Direct Answers ──
console.log('--- Test 2: Related Evidence Clarification ---');
const testEvidence2 = [
  { id: 'dec_1', title: 'Approved SSO Rollout', snippet: 'Agreed to adopt Okta SAML 2.0 for enterprise customers.', isRelatedEvidence: false, type: 'decision' },
  { id: 'meet_1', title: 'Architecture Meeting', snippet: 'Team discussed identity federation standards.', isRelatedEvidence: true, type: 'meeting', relationship: { type: 'decided_in', seedTitle: 'Approved SSO Rollout' } }
];
const pack2 = ragMod.formatEvidencePack(testEvidence2);
assert.strictEqual(pack2.directCount, 1);
assert.strictEqual(pack2.relatedItemsCount, 1);
assert(pack2.evidenceText.includes('RELATED ORGANIZATIONAL CONTEXT'));
assert(pack2.citationMap.some(c => c.index === '1' && c.id === 'dec_1'));
assert(pack2.citationMap.some(c => c.index === 'R1' && c.id === 'meet_1'));
console.log('[PASS] Test 2: Relevant related evidence formatted cleanly into distinct clarification section.');

// ── TEST 3: Duplicate Evidence Removal With Contradiction Preservation ──
console.log('--- Test 3: Deduplication with Contradiction Preservation ---');
const testDups = [
  { id: 'doc_orig', title: 'Spec doc', snippet: 'The database cluster requires 3 replicas in us-east-1 region.', status: 'approved' },
  { id: 'doc_dup', title: 'Spec doc copy', snippet: 'The database cluster requires 3 replicas in us-east-1 region.', status: 'approved' },
  { id: 'doc_conflict', title: 'Spec doc rev', snippet: 'The database cluster requires 3 replicas in us-east-1 region.', status: 'deprecated' },
];
const deduped3 = ragMod.prioritizeAndDeduplicateEvidence(testDups);
// Should prune doc_orig (duplicate of doc_dup with same content and status), keeping exactly 2 distinct status versions
assert.strictEqual(deduped3.length, 2, 'Should prune verbatim duplicate with identical status but preserve contradictory status');
const ids = deduped3.map(d => d.id);
assert(ids.includes('doc_conflict'));
assert(ids.includes('doc_dup') || ids.includes('doc_orig'));
console.log('[PASS] Test 3: Verbatim duplicate pruned while meaningful status contradiction is preserved.');

// ── TEST 4: Empty Related Evidence Graceful Handling ──
console.log('--- Test 4: Empty Related Evidence Handling ---');
const emptyRelatedEvidence = [
  { id: 'doc_only', title: 'Solo Doc', snippet: 'Standard project memo.', isRelatedEvidence: false }
];
const pack4 = ragMod.formatEvidencePack(emptyRelatedEvidence);
assert.strictEqual(pack4.usableCount, 1);
assert.strictEqual(pack4.relatedItemsCount, 0);
assert(!pack4.evidenceText.includes('RELATED ORGANIZATIONAL CONTEXT'));
console.log('[PASS] Test 4: Empty related evidence produces valid context without empty placeholder errors.');

// ── TEST 5: Deterministic Budget Enforcement Under Oversized Input ──
console.log('--- Test 5: Budget Enforcement on Oversized Evidence ---');
const oversizedInput = [
  { id: 'd1', title: 'Direct Doc 1', snippet: 'X'.repeat(3000), isRelatedEvidence: false },
  { id: 'r1', title: 'Related Doc 1', snippet: 'Y'.repeat(3000), isRelatedEvidence: true },
  { id: 'r2', title: 'Related Doc 2', snippet: 'Z'.repeat(3000), isRelatedEvidence: true },
];
const pack5 = ragMod.formatEvidencePack(oversizedInput);
assert(pack5.relatedEvidenceText.length <= 4000, `Related evidence chars (${pack5.relatedEvidenceText.length}) must be <= 4000`);
assert(pack5.evidenceText.length <= 18000, `Total evidence chars (${pack5.evidenceText.length}) must be <= 18000`);
assert(pack5.citationMap.some(c => c.isTruncated === true), 'Oversized item must have isTruncated flag set');
console.log(`[PASS] Test 5: Budget constraints strictly enforced (Related: ${pack5.relatedEvidenceText.length} <= 4000, Total: ${pack5.evidenceText.length} <= 18000).`);

// ── TEST 6: Evidence-Aware Reasoning: Non-Causation System Prompt ──
console.log('--- Test 6: Evidence-Aware Non-Causation System Prompt ---');
const systemPrompt = ragMod.buildSystemPrompt();
assert(systemPrompt.includes('A documented relationship or link NEVER proves that an underlying claim is true'));
assert(systemPrompt.includes('A task linked to a decision does NOT prove that the decision was implemented'));
assert(systemPrompt.includes('A task assigned to an employee does NOT prove that the employee finished or approved it'));
assert(systemPrompt.includes('An attendee at a meeting does NOT prove that they agreed to or approved every decision reached'));
console.log('[PASS] Test 6: System prompt enforces non-causation and non-assumption rules.');

// ── TEST 7: Unsupported Claims Abstention ──
console.log('--- Test 7: Unsupported Claims Honest Abstention ---');
const emptyPack = ragMod.formatEvidencePack([]);
assert.strictEqual(emptyPack.usableCount, 0);
const abstentionMsg = ragMod.buildInsufficientEvidenceMessage('Quantum entanglement deployment');
assert(abstentionMsg.includes('I don\'t have enough information in the organizational knowledge base'));
console.log('[PASS] Test 7: Honest abstention returned when evidence is insufficient.');

// ── TEST 8: Conflicting Sources Detection ──
console.log('--- Test 8: Conflicting Sources Detection ---');
const conflictingItems = [
  { id: 'rec_a', title: 'API Gateway Deployment', status: 'IN_PROGRESS', updated_at: '2026-09-01T00:00:00Z' },
  { id: 'rec_b', title: 'API Gateway Deployment', status: 'COMPLETED', updated_at: '2026-10-15T00:00:00Z' },
];
const detectedConflicts = ragMod.detectEvidenceConflicts(conflictingItems);
assert.strictEqual(detectedConflicts.length, 1);
assert(detectedConflicts[0].description.includes('IN_PROGRESS'));
assert(detectedConflicts[0].description.includes('COMPLETED'));
console.log('[PASS] Test 8: Status discrepancy between records detected and formatted.');

// ── TEST 9: Temporal / Freshness Handling ──
console.log('--- Test 9: Temporal Score & Freshness Handling ---');
const oldRecord = { id: 'old', title: 'Old Spec', created_at: '2025-01-01T00:00:00Z', isRelatedEvidence: false, rrf_score: 0.5 };
const newRecord = { id: 'new', title: 'New Spec', created_at: new Date().toISOString(), isRelatedEvidence: false, rrf_score: 0.5 };
const scoreOld = ragMod.computeEvidenceScore(oldRecord);
const scoreNew = ragMod.computeEvidenceScore(newRecord);
assert(scoreNew > scoreOld, `New record score (${scoreNew}) must be higher than old record score (${scoreOld})`);
console.log(`[PASS] Test 9: Freshness scoring awards higher priority to recent records (${scoreNew} > ${scoreOld}).`);

// ── TEST 10: Citation Integrity & Provenance Mapping ──
console.log('--- Test 10: Citation Provenance Integrity ---');
const evidenceItems10 = [
  { id: 'dir_a', title: 'Policy A', isRelatedEvidence: false, snippet: 'Direct policy content.' },
  { id: 'rel_b', title: 'Addendum B', isRelatedEvidence: true, snippet: 'Related addendum content.' },
];
const pack10 = ragMod.formatEvidencePack(evidenceItems10);
const citeA = pack10.citationMap.find(c => c.id === 'dir_a');
const citeB = pack10.citationMap.find(c => c.id === 'rel_b');
assert.strictEqual(citeA.index, '1');
assert.strictEqual(citeB.index, 'R1');
assert.strictEqual(citeA.isRelatedEvidence, false);
assert.strictEqual(citeB.isRelatedEvidence, true);
console.log('[PASS] Test 10: Direct [#1] and Related [#R1] citations mapped with complete provenance.');

// ── TEST 11: assembleOrganizationalContext Security & Budgets ──
console.log('--- Test 11: assembleOrganizationalContext Multi-Category Assembly ---');
const assembled = ctxMod.assembleOrganizationalContext({
  companyId: 'comp_1',
  accessibleSpaceIds: ['space_pub'],
  directEvidence: [
    { id: 'dir_1', company_id: 'comp_1', title: 'Direct Doc', snippet: 'Direct facts.', space_id: 'space_pub' }
  ],
  relatedEvidence: [
    { id: 'rel_1', company_id: 'comp_1', title: 'Related Doc', snippet: 'Connected notes.', space_id: 'space_pub', relationship: { type: 'supports' } }
  ],
  organizationalEntities: [
    { id: 'ent_1', company_id: 'comp_1', name: 'Engineering Team', entity_type: 'team', space_id: 'space_pub' }
  ],
});
assert.strictEqual(assembled.directCount, 1);
assert.strictEqual(assembled.relatedCount, 1);
assert.strictEqual(assembled.orgEntitiesCount, 1);
assert(assembled.contextText.includes('=== DIRECT EVIDENCE'));
assert(assembled.contextText.includes('=== RELATED ORGANIZATIONAL CONTEXT'));
assert(assembled.contextText.includes('=== ORGANIZATIONAL CONTEXT (ENTITIES & TEAMS)'));
console.log('[PASS] Test 11: assembleOrganizationalContext structured 4-category context generated successfully.');

// ── TEST 12: Security: Cross-Tenant Isolation ──
console.log('--- Test 12: Cross-Tenant Exclusion in Context Assembly ---');
const crossTenantAssembled = ctxMod.assembleOrganizationalContext({
  companyId: 'comp_1',
  accessibleSpaceIds: ['space_pub'],
  directEvidence: [
    { id: 'tenant_leak', company_id: 'comp_evil', title: 'Foreign Data', snippet: 'Cross tenant data' }
  ],
  relatedEvidence: [
    { id: 'tenant_leak_rel', company_id: 'comp_evil', title: 'Foreign Related', snippet: 'Cross tenant related' }
  ],
  organizationalEntities: [
    { id: 'ent_leak', company_id: 'comp_evil', name: 'Foreign Team', entity_type: 'team' }
  ]
});
assert.strictEqual(crossTenantAssembled.directCount, 0, 'Cross-tenant direct evidence must be excluded');
assert.strictEqual(crossTenantAssembled.relatedCount, 0, 'Cross-tenant related evidence must be excluded');
assert.strictEqual(crossTenantAssembled.orgEntitiesCount, 0, 'Cross-tenant entity must be excluded');
console.log('[PASS] Test 12: Cross-tenant data strictly blocked at all assembly boundaries.');

// ── TEST 13: Security: Private Space Protection ──
console.log('--- Test 13: Private Space Protection for Non-Members ---');
const privateSpaceAssembled = ctxMod.assembleOrganizationalContext({
  companyId: 'comp_1',
  accessibleSpaceIds: ['space_pub'], // User only belongs to space_pub
  directEvidence: [
    { id: 'priv_1', company_id: 'comp_1', title: 'Secret Doc', is_private: true, space_id: 'space_secret', snippet: 'Confidential' }
  ],
  relatedEvidence: [
    { id: 'priv_2', company_id: 'comp_1', title: 'Secret Rel', is_private: true, space_id: 'space_secret', snippet: 'Confidential' }
  ],
});
assert.strictEqual(privateSpaceAssembled.directCount, 0, 'Private space direct record must be hidden from non-member');
assert.strictEqual(privateSpaceAssembled.relatedCount, 0, 'Private space related record must be hidden from non-member');
console.log('[PASS] Test 13: Private space boundary strictly protected.');

// ── TEST 14: Zero Metadata Leakage for Inaccessible Targets ──
console.log('--- Test 14: Zero Metadata Leakage for Inaccessible Targets ---');
assert(!privateSpaceAssembled.contextText.includes('Secret Doc'));
assert(!privateSpaceAssembled.contextText.includes('Secret Rel'));
assert(!privateSpaceAssembled.contextText.includes('space_secret'));
assert.strictEqual(privateSpaceAssembled.citationMap.length, 0);
console.log('[PASS] Test 14: Zero metadata, titles, or space IDs of inaccessible records leak into context.');

// ── TEST 15: Scanned / Image-Only PDF Safeguard in Mixed Evidence ──
console.log('--- Test 15: Scanned/Image PDF Safeguard in Mixed Evidence ---');
const mixedEvidence = [
  { id: 'good_doc', title: 'Usable Memo', snippet: 'Valid extractable content for analysis.', isRelatedEvidence: false },
  { id: 'bad_scan', title: 'Scanned Contract', snippet: 'PDF parsed successfully but contained only vector graphics or rasterized image scans.', isRelatedEvidence: false }
];
const mixedPack = ragMod.formatEvidencePack(mixedEvidence);
assert.strictEqual(mixedPack.usableCount, 1);
assert.strictEqual(mixedPack.unextractableItems.length, 1);
assert.strictEqual(mixedPack.unextractableItems[0].id, 'bad_scan');
assert(!mixedPack.evidenceText.includes('vector graphics'), 'Edge function extraction error must not leak as fact');
console.log('[PASS] Test 15: Scanned PDF quarantined; usable evidence preserved without metadata leakage.');

console.log('\n================================================================');
console.log(' ALL 15/15 PHASE 3 STAGE 4 TESTS PASSED');
console.log('================================================================\n');
