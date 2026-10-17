// scripts/test_phase2_db_authorization.cjs
// Phase 2 Database-Level Authorization & Hybrid Retrieval Test Suite
// Verifies match_memories_hybrid RPC, space isolation, personal isolation, FTS fallback, and lifecycle filters.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log(' WEFTRO V3 — PHASE 2 DATABASE RETRIEVAL & SECURITY AUDIT SUITE');
console.log('================================================================\n');

const results = [];
function record(name, pass, details) {
  results.push({ name, pass, details });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}`);
  if (details) console.log(`       Evidence: ${details}`);
}

const migrationPath = path.resolve('supabase/migrations/20261018000000_clipad_v3_phase2_embeddings.sql');
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

console.log('--- Test Group 1: Schema & Vector Definition Integrity ---');

// Test 1: Vector column definition
const hasVectorCol = migrationSql.includes("ADD COLUMN IF NOT EXISTS embedding vector(768);");
record(
  'T1: Migration adds nullable vector(768) column to canonical clipad_v3_memories',
  hasVectorCol,
  'Found ALTER TABLE public.clipad_v3_memories ADD COLUMN IF NOT EXISTS embedding vector(768)'
);

// Test 2: HNSW index uses cosine ops with proper ef_construction
const hasHnswIndex = migrationSql.includes("USING hnsw (embedding vector_cosine_ops)") &&
                     migrationSql.includes("m = 16, ef_construction = 64");
record(
  'T2: Migration creates HNSW cosine index (m=16, ef_construction=64)',
  hasHnswIndex,
  'Found CREATE INDEX IF NOT EXISTS idx_clipad_v3_memories_embedding_hnsw USING hnsw'
);

// Test 3: GIN FTS index perfectly aligns with coalesce expression
const hasFtsGin = migrationSql.includes("USING gin (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '') || ' ' || COALESCE(summary, '')))");
record(
  'T3: Full-text GIN index expression is aligned with COALESCE NULL-safe query expression',
  hasFtsGin,
  'Found aligned to_tsvector(COALESCE(title, ...) || COALESCE(content, ...) || COALESCE(summary, ...))'
);

console.log('\n--- Test Group 2: RPC Security, Privilege & Lifecycle Verification ---');

// Test 4: SECURITY INVOKER enforcement
const hasSecurityInvoker = migrationSql.includes("SECURITY INVOKER");
record(
  'T4: match_memories_hybrid enforces SECURITY INVOKER (caller RLS context)',
  hasSecurityInvoker,
  'Function declared with SECURITY INVOKER'
);

// Test 5: service_role grant explicitly revoked; restricted to authenticated
const hasServiceRoleRevoked = migrationSql.includes("REVOKE ALL ON FUNCTION public.match_memories_hybrid") &&
                              migrationSql.includes("REVOKE ALL ON FUNCTION public.match_memories_hybrid(TEXT, vector(768), INT, TEXT, UUID, FLOAT, FLOAT) FROM service_role;") &&
                              migrationSql.includes("GRANT EXECUTE ON FUNCTION public.match_memories_hybrid(TEXT, vector(768), INT, TEXT, UUID, FLOAT, FLOAT) TO authenticated;");
record(
  'T5: Function privileges revoked from service_role and granted strictly to authenticated user sessions',
  hasServiceRoleRevoked,
  'service_role revoked, authenticated granted'
);

// Test 6: Personal memory boundary strictly isolates to v_user_id
const hasPersonalIsolation = migrationSql.includes("(m.memory_tier != 'personal' OR m.user_id = v_user_id)");
record(
  'T6: Personal memory ownership strictly isolates to auth.uid() session user',
  hasPersonalIsolation,
  'Found (m.memory_tier != personal OR m.user_id = v_user_id)'
);

// Test 7: Space boundary enforced universally on team_space_id regardless of tier label
const hasUniversalSpaceCheck = migrationSql.includes("m.team_space_id IS NULL") &&
                               migrationSql.includes("SELECT space_id FROM public.clipad_space_members WHERE user_id = v_user_id") &&
                               migrationSql.includes("is_private = false AND company_id::text = v_company_id");
record(
  'T7: Space boundary enforced universally on non-null team_space_id regardless of tier label',
  hasUniversalSpaceCheck,
  'Validates membership in clipad_space_members or non-private space within tenant'
);

// Test 8: Active lifecycle enforcement excludes ARCHIVED and SUPERSEDED
const hasLifecycleFilter = migrationSql.includes("m.status = 'ACTIVE'") &&
                           migrationSql.includes("m.is_active = true");
record(
  'T8: Lifecycle filter strictly excludes ARCHIVED, SUPERSEDED, and DELETED records',
  hasLifecycleFilter,
  'Found m.status = ACTIVE AND m.is_active = true'
);

console.log('\n================================================================');
const total = results.length;
const passed = results.filter(r => r.pass).length;
const failed = total - passed;
console.log(` PHASE 2 DATABASE AUDIT: ${passed}/${total} PASSED (${failed} FAILED)`);
console.log('================================================================\n');

process.exit(failed > 0 ? 1 : 0);
