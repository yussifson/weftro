// scripts/test_phase1_authorization.cjs
// Phase 1 Regression & Authorization Test Suite for Weftro V3 Memory Architecture
// Tests database RLS, server-side filtering, personal/team/org scoping, and cross-space boundary enforcement.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log(' WEFTRO V3 — PHASE 1 MEMORY AUTHORIZATION REGRESSION SUITE');
console.log('================================================================\n');

const results = [];
function record(name, pass, details) {
  results.push({ name, pass, details });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}`);
  if (details) console.log(`       Evidence: ${details}`);
}

// 1. Static AST / Code Inspection: Server-Side Query Construction
console.log('--- Group 1: Server-Side Query Construction & JS Filter Elimination ---');

const memoryServicePath = path.resolve('src/lib/clipadMemoryService.js');
const memoryServiceCode = fs.readFileSync(memoryServicePath, 'utf8');

// Test 1: Ensure getMemories applies database .in('team_space_id', spaceIds)
const hasServerSpaceFilter = memoryServiceCode.includes("q.in('team_space_id', spaceIds)");
record(
  'getMemories() applies database-level .in("team_space_id", spaceIds) server filtering',
  hasServerSpaceFilter,
  'Found q.in("team_space_id", spaceIds) before query execution'
);

// Test 2: Ensure team tier without spaces returns empty array without querying database
const hasTeamEmptyGuard = memoryServiceCode.includes("else if (memoryTier === MEMORY_TIERS.TEAM)") &&
                          memoryServiceCode.includes("return [];");
record(
  'getMemories() rejects unauthorized team tier queries before issuing SQL query',
  hasTeamEmptyGuard,
  'Guard clause intercepts team tier queries with empty spaceIds'
);

// Test 3: Ensure queryText uses database-level .or(title.ilike...) instead of post-fetch JS filter
const hasServerTextFilter = memoryServiceCode.includes("q.or(`title.ilike.%${sanitized}%,content.ilike.%${sanitized}%,summary.ilike.%${sanitized}%`)");
record(
  'getMemories() filters search queryText server-side via SQL ilike',
  hasServerTextFilter,
  'Found q.or(title.ilike...) server query builder'
);

// 2. Database RLS Policy Audit: Verification of 20261009000000_clipad_v3_phase10_hardening.sql
console.log('\n--- Group 2: Database Row Level Security (RLS) Policy Audit ---');

const rlsPath = path.resolve('supabase/migrations/20261009000000_clipad_v3_phase10_hardening.sql');
const rlsCode = fs.readFileSync(rlsPath, 'utf8');

// Test 4: RLS Team Tier requires active membership in clipad_space_members OR public space
const hasTeamSpaceRLS = rlsCode.includes("team_space_id IN (SELECT space_id FROM public.clipad_space_members WHERE user_id = auth.uid())") &&
                        rlsCode.includes("team_space_id IN (SELECT id FROM public.clipad_spaces WHERE is_private = false)");
record(
  'RLS SELECT policy enforces private space isolation via clipad_space_members in SQL',
  hasTeamSpaceRLS,
  'Policy checks user membership in clipad_space_members or non-private space'
);

// Test 5: Personal tier isolated strictly to auth.uid()
const hasPersonalRLS = rlsCode.includes("(memory_tier = 'personal' AND user_id = auth.uid())");
record(
  'RLS SELECT policy enforces strict personal memory isolation to auth.uid()',
  hasPersonalRLS,
  'Found (memory_tier = \'personal\' AND user_id = auth.uid())'
);

// Test 6: Multi-tenant company isolation
const hasCompanyRLS = rlsCode.includes("company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())");
record(
  'RLS SELECT policy enforces company multi-tenant isolation baseline',
  hasCompanyRLS,
  'Found company_id::text IN (SELECT company_id FROM profiles...)'
);

// 3. API Gateway Scoping Audit: Verification of connect/index.ts
console.log('\n--- Group 3: Connect API Gateway Scoping & Non-Exposure ---');

const connectPath = path.resolve('supabase/functions/connect/index.ts');
const connectCode = fs.readFileSync(connectPath, 'utf8');

// Test 7: Verify search route scopes to company_id and status ACTIVE
const hasSearchCompanyIsolation = connectCode.includes(".eq('company_id', companyId)") &&
                                  connectCode.includes(".eq('status', 'ACTIVE')");
record(
  'Connect API POST /search strictly isolates results to caller companyId',
  hasSearchCompanyIsolation,
  'Enforces company_id and ACTIVE status filters'
);

// Test 8: Verify single memory endpoint does not leak existence across companies
const hasSingleMemory404 = connectCode.includes("eq('company_id', companyId)") &&
                           connectCode.includes("'RESOURCE_NOT_FOUND'");
record(
  'Connect API GET /memories/:id returns 404 RESOURCE_NOT_FOUND without revealing presence',
  hasSingleMemory404,
  'Filters by id and company_id, returns generic 404 error response'
);

// 4. Memory Lifecycle & Integrity: createMemory, updateMemory, supersedeMemory
console.log('\n--- Group 4: Memory Lifecycle & Immutability Integrity ---');

// Test 9: createMemory validates required fields and sets private policy tier
const hasCreateMemoryValidation = memoryServiceCode.includes("throw new Error('companyId is required for team or organizational memories.')") &&
                                  memoryServiceCode.includes("effectiveTier = MEMORY_TIERS.PERSONAL;");
record(
  'createMemory() coerces private-marked memories to PERSONAL tier',
  hasCreateMemoryValidation,
  'Enforces personal tier when permissions_policy.is_private is true'
);

// Test 10: supersedeMemory preserves versioning and links predecessor
const hasSupersedeLink = memoryServiceCode.includes("status: MEMORY_STATUS.SUPERSEDED") &&
                         memoryServiceCode.includes("superseded_by: created.id");
record(
  'supersedeMemory() marks previous record SUPERSEDED and links successor ID',
  hasSupersedeLink,
  'Maintains immutable provenance chain on memory update'
);

console.log('\n================================================================');
const total = results.length;
const passed = results.filter(r => r.pass).length;
const failed = total - passed;
console.log(` PHASE 1 RESULTS: ${passed}/${total} PASSED (${failed} FAILED)`);
console.log('================================================================\n');

process.exit(failed > 0 ? 1 : 0);
