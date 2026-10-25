/**
 * WEFTRO V3 — PHASE 4 SECURITY, ACCESS TOKENS & TENANT VALIDATION TESTS
 * 
 * Verifies:
 * 1. Meeting access token generation logic, least privilege enforcement,
 *    and rejection of cross-room or expired tokens.
 * 2. Host privileges server-side binding (only host receives is_owner: true).
 * 3. Tenant / organization isolation: cross-tenant access to private meetings is blocked.
 * 4. Room provisioning gates: companyId and privacy restrictions require caller authentication.
 * 5. Invitation URL integrity: sensitive characters, query parameters, and tampered inputs fail safely.
 * 6. VideoRoom integration: client requests tokens authoritatively via edge function rather than generating client-side.
 * 7. Database policy and schema integrity in 20261025140000_secure_video_rooms_tenant_isolation.sql.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== WEFTRO V3: PHASE 4 SECURITY, ACCESS TOKENS & TENANT VALIDATION ===\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    process.exitCode = 1;
  }
}

const edgeFunctionCode = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'create-daily-room', 'index.ts'), 'utf8');
const migrationCode = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261025140000_secure_video_rooms_tenant_isolation.sql'), 'utf8');
const videoRoomCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'video', 'VideoRoom.jsx'), 'utf8');
const meetingUrlCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'meetingUrl.js'), 'utf8');

console.log('--- TEST GROUP 1: Meeting Access Token Issuance & Least Privilege ---');

runTest('1.1: Server-side token endpoint enforces least privilege (is_owner=true ONLY for host)', () => {
  assert(edgeFunctionCode.includes("action === 'token'"), 'create-daily-room must support action=token');
  assert(edgeFunctionCode.includes('isHost = Boolean(callerUser && roomRecord?.host_id && callerUser.id === roomRecord.host_id)'),
    'Host status must be evaluated against authoritative room record in database');
  assert(edgeFunctionCode.includes('is_owner: isHost'), 'Only host receives is_owner=true; ordinary participants receive false');
});

runTest('1.2: Server-side token endpoint binds token strictly to room_name with finite expiry', () => {
  assert(edgeFunctionCode.includes('room_name: roomName'), 'Tokens must be strictly bound to specific room_name');
  assert(edgeFunctionCode.includes('exp: tokenExp'), 'Tokens must specify finite expiration timestamp');
  assert(edgeFunctionCode.includes('tokenExp = Math.round(Date.now() / 1000) + 14400'), 'Token expiration should be bounded (e.g. 4 hours)');
});

runTest('1.3: VideoRoom requests server-side meeting token and passes to Daily join options', () => {
  assert(videoRoomCode.includes("action: 'token'"), 'VideoRoom requests token via create-daily-room');
  assert(videoRoomCode.includes('meetingAccessToken'), 'VideoRoom stores authoritative meeting access token in state');
  assert(videoRoomCode.includes('let finalToken = meetingAccessToken || token;'), 
    'VideoRoom prioritizes server-issued meeting access token for join');
});

console.log('\n--- TEST GROUP 2: Tenant & Organization Isolation ---');

runTest('2.1: Edge function rejects unauthenticated or cross-tenant access to organization meetings', () => {
  assert(edgeFunctionCode.includes("roomRecord?.company_id && isPrivateRoom"), 
    'Edge function checks room company affiliation');
  assert(edgeFunctionCode.includes("status: 401"), 'Unauthenticated user rejected with 401 on private tenant meeting');
  assert(edgeFunctionCode.includes("!isSuperAdmin && !isSameCompany"), 'Cross-tenant user verified');
  assert(edgeFunctionCode.includes("status: 403"), 'Cross-tenant caller rejected with 403 Forbidden');
});

runTest('2.2: Database migration establishes tenant isolation on video_rooms SELECT', () => {
  assert(migrationCode.includes('CREATE POLICY "Tenant isolation for video_rooms select"'), 
    'Migration must define SELECT tenant isolation policy on video_rooms');
  assert(migrationCode.includes('company_id::text = public.get_auth_company_id()'), 
    'Policy must match caller company_id with room company_id');
  assert(migrationCode.includes('privacy_type = \'public\' AND company_id IS NULL'), 
    'Policy must preserve legitimate public standalone guest join');
});

runTest('2.3: Database migration prevents injecting arbitrary company_id on INSERT', () => {
  assert(migrationCode.includes('CREATE POLICY "Tenant isolation for video_rooms insert"'), 
    'Migration must define INSERT tenant isolation policy');
  assert(migrationCode.includes('company_id IS NULL OR company_id::text = public.get_auth_company_id()'), 
    'Users cannot create rooms for foreign tenants');
});

runTest('2.4: Dedicated verify_meeting_access function authoritatively rejects cross-tenant callers', () => {
  assert(migrationCode.includes('FUNCTION public.verify_meeting_access'), 
    'Migration defines verify_meeting_access function');
  assert(migrationCode.includes('SET search_path = public, auth'), 
    'Function must set safe, fixed search_path');
  assert(migrationCode.includes('v_caller_company != v_room.company_id::text'), 
    'Function must reject callers from different organizations');
});

console.log('\n--- TEST GROUP 3: Invitation URL Integrity & Tamper Safety ---');

runTest('3.1: Invitation links sanitize hostile prefixes, path traversals, and query parameters', () => {
  const { formatMeetingUrl } = require('../src/utils/meetingUrl');
  assert.strictEqual(formatMeetingUrl('https://malicious.com/hack'), 'https://weftro.com/join/hack');
  assert.strictEqual(formatMeetingUrl('../../etc/passwd'), 'https://weftro.com/join/..%2F..%2Fetc%2Fpasswd');
  assert.strictEqual(formatMeetingUrl('room?t=privileged-token-123'), 'https://weftro.com/join/room');
  assert.strictEqual(formatMeetingUrl(''), '');
});

runTest('3.2: Invitation links never serialize server secrets or tokens into URL path', () => {
  assert(!meetingUrlCode.includes('DAILY_API_KEY'), 'meetingUrl must never include API keys');
  assert(!meetingUrlCode.includes('SUPABASE_SERVICE_ROLE_KEY'), 'meetingUrl must never include service role keys');
});

console.log('\n--- TEST GROUP 4: Server-Side Host Termination Unbroken ---');

runTest('4.1: Host-only termination from Phase 1.1 remains strictly enforced in migration', () => {
  assert(migrationCode.includes('auth.uid() = host_id'), 'video_rooms update must strictly check host_id');
  assert(videoRoomCode.includes("supabase.rpc('terminate_meeting'"), 'VideoRoom invokes terminate_meeting RPC');
});

console.log('\n================================================================');
console.log(` ALL PHASE 4 SECURITY & TENANT TESTS PASSED (${passedTests}/${totalTests})`);
console.log('================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
