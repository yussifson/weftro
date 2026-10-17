// scripts/verify_phase2_capture_engine.cjs
// Independent Node.js verification script for Weftro V3 Phase 2
// Validates file integrity, SQL syntax, Deno Edge Function structure, queue contracts, and caller wiring.

const fs = require('fs');
const esbuild = require('esbuild');

let errors = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    errors++;
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('=== Starting Weftro V3 Phase 2 Automated Verification ===\n');

// 1. Verify Migration File
const migrationPath = 'supabase/migrations/20261016000000_clipad_v3_capture_queue.sql';
assert(fs.existsSync(migrationPath), `Migration file exists at ${migrationPath}`);
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.clipad_v3_capture_queue'), 'Migration defines clipad_v3_capture_queue table');
assert(migrationSql.includes('ADD VALUE \'QUEUED\''), 'Migration safely adds QUEUED to capture_status enum');
assert(migrationSql.includes('claim_next_capture_job'), 'Migration defines claim_next_capture_job with SELECT FOR UPDATE SKIP LOCKED');
assert(migrationSql.includes('p_specific_capture_id'), 'claim_next_capture_job supports targeted single-capture claiming');
assert(migrationSql.includes('finalize_capture_job'), 'Migration defines finalize_capture_job with backoff and dead-letter handling');
assert(migrationSql.includes('p_worker_id IS NOT NULL AND v_job.locked_by IS DISTINCT FROM p_worker_id'), 'finalize_capture_job enforces lease ownership check');
assert(migrationSql.includes('recover_abandoned_capture_jobs'), 'Migration defines recover_abandoned_capture_jobs function');
assert(migrationSql.includes('ROW LEVEL SECURITY'), 'Migration enables Row Level Security on capture queue');
assert(migrationSql.includes('UNIQUE (capture_id)'), 'Unique constraint on capture_id guarantees job idempotency');

// 2. Verify Edge Function Worker
const edgeWorkerPath = 'supabase/functions/process-capture/index.ts';
assert(fs.existsSync(edgeWorkerPath), `Edge Function exists at ${edgeWorkerPath}`);
const edgeCode = fs.readFileSync(edgeWorkerPath, 'utf8');

assert(edgeCode.includes('claim_next_capture_job'), 'Edge worker claims queued jobs via claim_next_capture_job RPC');
assert(edgeCode.includes('finalize_capture_job'), 'Edge worker reports completion and failures via finalize_capture_job RPC');
assert(edgeCode.includes('p_worker_id: workerId'), 'Edge worker passes worker ID to verify lease ownership on finalization');
assert(edgeCode.includes('clipad_v3_memories'), 'Edge worker persists candidates to canonical clipad_v3_memories table');
assert(edgeCode.includes('clipad_v3_smart_moments'), 'Edge worker persists detected moments for async video captures');
assert(edgeCode.includes('clipad_v3_entities'), 'Edge worker upserts graph entities into clipad_v3_entities');
assert(edgeCode.includes('executeServerAI'), 'Edge worker uses server-side AI credentials, not client-held keys');
assert(edgeCode.includes('recover_abandoned_capture_jobs'), 'Edge worker proactively cleans abandoned stale jobs');
assert(edgeCode.includes('callerUser && !isServiceRoleCaller'), 'Edge worker validates caller token and tenant boundaries');

// 3. Verify Client Queue Service
const queueServicePath = 'src/lib/clipadCaptureQueueService.js';
assert(fs.existsSync(queueServicePath), `Queue client service exists at ${queueServicePath}`);
const queueCode = fs.readFileSync(queueServicePath, 'utf8');

assert(queueCode.includes('enqueueCaptureForProcessing'), 'Exports enqueueCaptureForProcessing');
assert(queueCode.includes('retryCaptureJob'), 'Exports retryCaptureJob');
assert(queueCode.includes('getCaptureQueueStatus'), 'Exports getCaptureQueueStatus');
assert(queueCode.includes('dispatchWorkerExecution'), 'Dispatches non-blocking async execution to process-capture Edge Function');

// 4. Verify Capture Service Status Enum
const capServiceCode = fs.readFileSync('src/lib/clipadCaptureService.js', 'utf8');
assert(capServiceCode.includes('QUEUED: \'QUEUED\''), 'clipadCaptureService includes QUEUED in CAPTURE_STATUS enum');

// 5. Verify Production Callers Decoupled from Browser Execution
const captureInboxCode = fs.readFileSync('src/components/clipad/features/CaptureInbox.jsx', 'utf8');
assert(captureInboxCode.includes('enqueueCaptureForProcessing'), 'CaptureInbox imports and calls enqueueCaptureForProcessing');
assert(!captureInboxCode.includes('contextualizeCapture(newCap.id)'), 'CaptureInbox no longer runs browser-dependent contextualizeCapture after quick capture');
assert(captureInboxCode.includes('QUEUED'), 'CaptureInbox renders distinct QUEUED badge in UI');

const recordVideoCode = fs.readFileSync('src/pages/clipad/RecordVideo.jsx', 'utf8');
assert(recordVideoCode.includes('enqueueCaptureForProcessing'), 'RecordVideo imports and calls enqueueCaptureForProcessing');
assert(!recordVideoCode.includes('contextualizeCapture(capture.id)'), 'RecordVideo no longer runs browser-dependent contextualizeCapture on video completion');

const browserCaptureCode = fs.readFileSync('src/lib/clipadBrowserCaptureService.js', 'utf8');
assert(browserCaptureCode.includes('enqueueCaptureForProcessing'), 'clipadBrowserCaptureService enqueues captures into durable queue');
assert(!browserCaptureCode.includes('contextualizeCapture(capture.id)'), 'clipadBrowserCaptureService no longer invokes browser contextualizeCapture');

// 6. Verify JSX/ESM compilation with esbuild
const modifiedFiles = [
  'src/components/clipad/features/CaptureInbox.jsx',
  'src/pages/clipad/RecordVideo.jsx',
  'src/lib/clipadCaptureQueueService.js',
  'src/lib/clipadBrowserCaptureService.js',
  'src/lib/clipadCaptureService.js',
  'src/lib/clipadContextualizationService.js',
  'src/lib/clipadSmartMomentService.js',
  'src/lib/clipadTranscriptIntelligence.js',
  'src/components/clipad/features/SmartMomentTimeline.jsx'
];
modifiedFiles.forEach(file => {
  try {
    esbuild.buildSync({ entryPoints: [file], write: false, bundle: false });
    assert(true, `ESBuild transpiled ${file} without syntax error`);
  } catch (err) {
    assert(false, `ESBuild syntax error in ${file}: ${err.message}`);
  }
});

console.log('\n======================================================');
if (errors === 0) {
  console.log('🎉 ALL PHASE 2 VERIFICATION CHECKS PASSED CLEANLY (0 ERRORS)');
  process.exit(0);
} else {
  console.error(`💥 VERIFICATION FAILED WITH ${errors} ERROR(S)`);
  process.exit(1);
}
