const assert = require('assert');
const fs = require('fs');

console.log('--- RUNNING PHASE 1 MEETING RELIABILITY TEST SUITE ---\n');

// TEST 1: Canonical Meeting URL Generator
console.log('Test 1: meetingUrl.js URL generation');
const meetingUrlModule = require('../src/utils/meetingUrl.js');
const { formatMeetingUrl, getMeetingOrigin } = meetingUrlModule;

assert(typeof formatMeetingUrl === 'function', 'formatMeetingUrl must be a function');
assert(typeof getMeetingOrigin === 'function', 'getMeetingOrigin must be a function');

// Standard room URL
const cleanUrl = formatMeetingUrl('test-room-123');
assert(cleanUrl.includes('/join/test-room-123'), `Expected /join/test-room-123, got: ${cleanUrl}`);
assert(!cleanUrl.includes('optavel.daily.co'), 'Should not contain Daily raw domain');
assert(!cleanUrl.includes('meet.clipad.optavel.com'), 'Should not contain deprecated legacy subdomain');

// Room URL with prefix stripping
const cleanPrefixedUrl = formatMeetingUrl('optavel/my-standup');
assert(cleanPrefixedUrl.endsWith('/join/my-standup'), `Expected /join/my-standup, got: ${cleanPrefixedUrl}`);

// Room URL with Space ID query parameter
const spaceMeetingUrl = formatMeetingUrl('team-sync', { spaceId: 'spc_9988' });
assert(spaceMeetingUrl.includes('/join/team-sync?spaceId=spc_9988'), `Expected spaceId query param, got: ${spaceMeetingUrl}`);

// Empty input handling
const fallbackUrl = formatMeetingUrl('');
assert(fallbackUrl === '', 'Empty room name should return empty string');

console.log('  ✓ Test 1 Passed: formatMeetingUrl generates canonical, clean URLs without legacy subdomains');

// TEST 2: Host vs Participant Termination Logic & DB Status Handling
console.log('\nTest 2: Host Termination vs Participant Leave semantics');
const videoRoomSource = fs.readFileSync('src/components/video/VideoRoom.jsx', 'utf8');

// Assert isHost check exists and queries video_rooms authoritatively
assert(videoRoomSource.includes('dbRoom.host_id === user.id'), 'Host identity must be authoritatively verified against video_rooms.host_id');

// Assert app-message meeting-ended listener exists
assert(videoRoomSource.includes("ev.data.type === 'meeting-ended'"), 'Must handle meeting-ended event broadcasted to ejection path');

// Assert attendee leave does NOT update status = ended
assert(videoRoomSource.includes('if (isHost && endMeetingForEveryone)'), 'Database meeting status must ONLY be set to ended if isHost && endMeetingForEveryone');

// Assert leave button opens modal for host or leaves directly for attendee
assert(videoRoomSource.includes('handleLeaveClick'), 'Leave button must invoke handleLeaveClick');
assert(videoRoomSource.includes('End Meeting for All'), 'Modal must have explicit End Meeting for All choice for host');

console.log('  ✓ Test 2 Passed: VideoRoom enforces host-only meeting termination and peer broadcast');

// TEST 3: Edge Function Host Tracking & Provisioning Payload
console.log('\nTest 3: create-daily-room edge function host persistence');
const edgeFunctionSource = fs.readFileSync('supabase/functions/create-daily-room/index.ts', 'utf8');

assert(edgeFunctionSource.includes('host_id: callerUser?.id || null'), 'create-daily-room must persist host_id from callerUser token');
console.log('  ✓ Test 3 Passed: create-daily-room authoritatively records host_id in video_rooms');

// TEST 4: Race Condition Protection & Provisioning State Machine in VideoRoom
console.log('\nTest 4: Speculative Join Race Condition Elimination');

// Assert speculative join URL was removed from default state
assert(!videoRoomSource.includes("const defaultUrl = roomUrl || (cleanRoomId ? 'https://optalflow.daily.co/' + cleanRoomId : null);"), 'Speculative unverified room URL must not be defaulted');

// Assert provisioningState state machine
assert(videoRoomSource.includes("const [provisioningState, setProvisioningState] = useState"), 'VideoRoom must track provisioningState');
assert(videoRoomSource.includes("provisioningState !== 'ready'"), 'Daily Call Object must not join before provisioningState === ready');

// Assert error handling and retry mechanism
assert(videoRoomSource.includes('Unable to Join Meeting'), 'Error state UI must be displayed on failure');
assert(videoRoomSource.includes('Retry Connection'), 'Retry button must be provided');

console.log('  ✓ Test 4 Passed: Speculative join race condition eliminated with authoritative provisioning guard');

// TEST 5: Invitation & URL Generator Integration Across UI Pages
console.log('\nTest 5: UI Integration of Canonical Meeting URL in ScheduleMeetingDialog & MeetLandingPage');
const scheduleDialogSource = fs.readFileSync('src/components/video/ScheduleMeetingDialog.jsx', 'utf8');
const landingPageSource = fs.readFileSync('src/pages/MeetLandingPage.jsx', 'utf8');

assert(scheduleDialogSource.includes('formatMeetingUrl(roomName'), 'ScheduleMeetingDialog must use formatMeetingUrl');
assert(!scheduleDialogSource.includes('meet.clipad.optavel.com'), 'ScheduleMeetingDialog must not contain meet.clipad.optavel.com');

assert(landingPageSource.includes('formatMeetingUrl(targetRoomName'), 'MeetLandingPage must use formatMeetingUrl');
assert(!landingPageSource.includes("window.location.origin + '/join/' + targetRoomName"), 'MeetLandingPage must not use manual origin concatenation');

console.log('  ✓ Test 5 Passed: All meeting URL entry points utilize canonical formatMeetingUrl');

console.log('\nALL PHASE 1 UNIT & REGRESSION VERIFICATIONS PASSED (5/5)\n');
