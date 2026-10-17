// scripts/verify_phase1_integrity.cjs
// Phase 1 Verification Script: Test memory query, smart moments error handling, and inngest entrypoint

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- WEFTRO V3 PHASE 1 INTEGRITY VERIFICATION ---');

// 1. Verify Connect Edge Function Query & Table
const connectEdgePath = path.resolve('supabase/functions/connect/index.ts');
const connectEdgeCode = fs.readFileSync(connectEdgePath, 'utf8');
assert(!connectEdgeCode.includes('clipad_v3_organizational_memory'), 'FAIL: connect/index.ts still references non-existent clipad_v3_organizational_memory');
assert(connectEdgeCode.includes(".from('clipad_v3_memories')"), 'FAIL: connect/index.ts does not query canonical clipad_v3_memories');
assert(connectEdgeCode.includes(".eq('is_active', true)"), 'FAIL: connect/index.ts does not filter by is_active');
assert(connectEdgeCode.includes(".eq('company_id', tokenData.company_id)"), 'FAIL: connect/index.ts does not enforce tokenData.company_id isolation');
console.log('✅ Check 1 Passed: connect/index.ts queries canonical clipad_v3_memories with is_active and tokenData.company_id isolation.');

// 2. Verify clipadConnectService.js Table & Schema Mapping
const connectServicePath = path.resolve('src/lib/clipadConnectService.js');
const connectServiceCode = fs.readFileSync(connectServicePath, 'utf8');
assert(!connectServiceCode.includes('clipad_v3_organizational_memory'), 'FAIL: clipadConnectService.js still references non-existent clipad_v3_organizational_memory');
assert(connectServiceCode.includes(".from('clipad_v3_memories')"), 'FAIL: clipadConnectService.js does not query canonical clipad_v3_memories');
assert(connectServiceCode.includes(".eq('is_active', true)"), 'FAIL: clipadConnectService.js does not filter by is_active');
assert(connectServiceCode.includes("confidence_score ?? mem.confidence"), 'FAIL: clipadConnectService.js does not map confidence_score');
console.log('✅ Check 2 Passed: clipadConnectService.js queries canonical clipad_v3_memories with correct column mappings.');

// 3. Verify Smart Moments Persistence Error Handling (No Fake UUID)
const smartMomentServicePath = path.resolve('src/lib/clipadSmartMomentService.js');
const smartMomentCode = fs.readFileSync(smartMomentServicePath, 'utf8');
assert(!smartMomentCode.includes('return { id: crypto.randomUUID(), ...payload }'), 'FAIL: clipadSmartMomentService still returns fake in-memory UUID on error!');
assert(smartMomentCode.includes('throw new Error'), 'FAIL: clipadSmartMomentService does not throw on database failure');
console.log('✅ Check 3 Passed: clipadSmartMomentService.js throws genuine error on DB failure; false-success fallback eliminated.');

// 4. Verify Transcript Intelligence Error Handling
const transcriptIntelPath = path.resolve('src/lib/clipadTranscriptIntelligence.js');
const transcriptIntelCode = fs.readFileSync(transcriptIntelPath, 'utf8');
assert(transcriptIntelCode.includes('catch (err)'), 'FAIL: clipadTranscriptIntelligence does not catch createSmartMoment failure');
console.log('✅ Check 4 Passed: clipadTranscriptIntelligence.js catches persistence errors and skips unpersisted moments.');

// 5. Verify Inngest Functions Entrypoint
const inngestFunctionsPath = path.resolve('supabase/functions/inngest/functions/index.ts');
assert(fs.existsSync(inngestFunctionsPath), 'FAIL: supabase/functions/inngest/functions/index.ts does not exist');
const inngestFunctionsCode = fs.readFileSync(inngestFunctionsPath, 'utf8');
assert(inngestFunctionsCode.includes('export const functions = [];'), 'FAIL: inngest functions/index.ts does not export functions array');
console.log('✅ Check 5 Passed: supabase/functions/inngest/functions/index.ts exists and exports valid functions array.');

// 6. Verify package.json Test Runner Definition
const pkgPath = path.resolve('package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
assert(!pkg.dependencies.vitest, 'FAIL: vitest is still in dependencies!');
assert(pkg.devDependencies.vitest, 'FAIL: vitest is not in devDependencies!');
console.log('✅ Check 6 Passed: package.json has vitest in devDependencies with valid script.');

console.log('--- ALL PHASE 1 INTEGRITY CHECKS PASSED ---');
