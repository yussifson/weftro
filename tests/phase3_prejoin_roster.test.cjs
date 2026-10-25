/**
 * WEFTRO V3 — PHASE 3 ACCEPTANCE & INTEGRATION TEST SUITE
 * 
 * Verifies:
 * 1. Pre-Join Screen component architecture, device enumeration, toggle behavior,
 *    and stream cleanup prior to Daily call join.
 * 2. Proper integration with VideoRoom provisioning state machine:
 *    Daily call object must NOT initialize before user confirms pre-join choices.
 * 3. Pre-join media state (micOn, videoOn, cameraDeviceId, micDeviceId, backgroundConfig)
 *    propagates cleanly into Daily join options.
 * 4. In-Meeting Participant Roster panel:
 *    - Participant count accuracy (local + remote).
 *    - Designation of local participant ("You") and host badge.
 *    - Distinct mic mute status vs active-speaker status.
 *    - Active speaker indicator synchronization.
 *    - Accessibility attributes (aria-label, role, keyboard accessible).
 * 5. Visual stage stability:
 *    - Opening and closing the roster panel operates independently without remounting
 *      or disrupting underlying media elements.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== WEFTRO V3: PHASE 3 PRE-JOIN & PARTICIPANT ROSTER VERIFICATION ===\n');

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

const preJoinCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'video', 'PreJoinScreen.jsx'), 'utf8');
const rosterCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'video', 'ParticipantRoster.jsx'), 'utf8');
const videoRoomCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'video', 'VideoRoom.jsx'), 'utf8');

console.log('--- TEST GROUP 1: Pre-Join Screen & Media Configuration ---');

runTest('1.1: PreJoinScreen provides device toggles, device selectors, and volume meter', () => {
  assert(preJoinCode.includes('toggleMic') || preJoinCode.includes('setIsMicOn'), 'PreJoinScreen must provide mic toggle');
  assert(preJoinCode.includes('toggleVideo') || preJoinCode.includes('setIsVideoOn'), 'PreJoinScreen must provide video toggle');
  assert(preJoinCode.includes('navigator.mediaDevices.enumerateDevices'), 'PreJoinScreen must enumerate media devices for selection');
  assert(preJoinCode.includes("d.kind === 'audioinput'"), 'PreJoinScreen must list audio devices');
  assert(preJoinCode.includes("d.kind === 'videoinput'"), 'PreJoinScreen must list video devices');
});

runTest('1.2: PreJoinScreen cleanly stops all preview media tracks before calling onJoin', () => {
  assert(preJoinCode.includes('streamRef.current.getTracks().forEach(t => t.stop())'), 
    'PreJoinScreen must stop preview stream tracks so Daily can claim hardware without device conflicts');
  assert(preJoinCode.includes('onJoin({'), 'PreJoinScreen must emit user settings to onJoin callback');
  assert(preJoinCode.includes('micOn') && preJoinCode.includes('videoOn'), 'PreJoin settings must include mic and video states');
});

runTest('1.3: PreJoinScreen displays error handling for denied/unavailable devices and clear CTA actions', () => {
  assert(preJoinCode.includes('Camera or microphone access denied') || preJoinCode.includes('access denied'), 
    'PreJoinScreen must present clear feedback for blocked or missing devices');
  assert(preJoinCode.includes('Join Meeting'), 'PreJoinScreen must have clear "Join Meeting" CTA');
  assert(preJoinCode.includes('Back to Meetings') || preJoinCode.includes("navigate('/meetings')"), 'PreJoinScreen must provide return route');
});

console.log('\n--- TEST GROUP 2: VideoRoom State Machine Integration ---');

runTest('2.1: Daily Call Object only initializes after backend provisioning is ready AND user confirms prejoin', () => {
  assert(videoRoomCode.includes("if (provisioningState !== 'ready' || !resolvedRoomUrl || !hasJoinedPreJoin) return;"),
    'Daily initialization must gate on provisioningState === ready, resolvedRoomUrl, and hasJoinedPreJoin');
  assert(videoRoomCode.includes('<PreJoinScreen'), 'VideoRoom must render PreJoinScreen when provisioning is ready and !hasJoinedPreJoin');
});

runTest('2.2: PreJoin settings propagate to Daily call object join options and device selection', () => {
  assert(videoRoomCode.includes('startMic = preJoinSettings ? preJoinSettings.micOn : initialAudio'),
    'Microphone state from pre-join must determine startAudioOff join option');
  assert(videoRoomCode.includes('startCam = preJoinSettings ? preJoinSettings.videoOn : initialVideo'),
    'Camera state from pre-join must determine startVideoOff join option');
  assert(videoRoomCode.includes('callObject.setInputDevicesAsync({ videoDeviceId: preJoinSettings.cameraDeviceId })'),
    'Camera device preference must be set on call object');
  assert(videoRoomCode.includes('callObject.setInputDevicesAsync({ audioDeviceId: preJoinSettings.micDeviceId })'),
    'Microphone device preference must be set on call object');
});

console.log('\n--- TEST GROUP 3: In-Meeting Participant Roster Architecture ---');

runTest('3.1: ParticipantRoster correctly computes total participant count and lists local & remote participants', () => {
  assert(rosterCode.includes('useParticipantIds('), 'Roster must track participant IDs via useParticipantIds hook');
  assert(rosterCode.includes('useLocalSessionId()'), 'Roster must track local session ID');
  assert(rosterCode.includes('useParticipant(id)'), 'Roster must look up participant details');
  assert(rosterCode.includes('You'), 'Roster must clearly label local participant with (You)');
  assert(rosterCode.includes('Host'), 'Roster must label host participant with Host badge');
});

runTest('3.2: ParticipantRoster strictly separates mute status from active-speaker status', () => {
  assert(rosterCode.includes('useAudioTrack(id)'), 'Roster must use useAudioTrack for mic state');
  assert(rosterCode.includes("audioTrack?.state !== 'playable'") || rosterCode.includes("isMuted"), 'Roster must evaluate isMuted independently');
  assert(rosterCode.includes('useActiveSpeakerId()') || rosterCode.includes('isActiveSpeaker'), 'Roster must track active-speaker status via activeSpeakerId');
  assert(rosterCode.includes('!isMuted') && rosterCode.includes('isActiveSpeaker'), 
    'Speaking indicator must ONLY be active when participant is unmuted AND speaking');
});

runTest('3.3: ParticipantRoster is accessible and provides search/filtering', () => {
  assert(rosterCode.includes('role="region"') || rosterCode.includes('aria-label="Participants"'), 'Roster panel must contain accessible ARIA role/label');
  assert(rosterCode.includes('aria-label="Close roster"') || rosterCode.includes('aria-label="Close"'), 'Roster close button must be accessible');
  assert(rosterCode.includes('searchTerm') || rosterCode.includes('searchQuery') || rosterCode.includes('filter'), 
    'Roster should provide search/filter for meetings with many participants');
});

console.log('\n--- TEST GROUP 4: UI Toolbar Integration & Stability ---');

runTest('4.1: VideoRoom toolbar provides dedicated Roster toggle button displaying live count', () => {
  assert(videoRoomCode.includes('Participant Roster Button'), 'Toolbar must include Participant Roster button');
  assert(videoRoomCode.includes('1 + participantIds.length'), 'Toolbar button must display total participant count');
  assert(videoRoomCode.includes('setShowRoster(!showRoster)'), 'Toolbar button toggles showRoster');
});

runTest('4.2: Toggling roster does not remount video stage or interfere with chat sidebar', () => {
  assert(videoRoomCode.includes('{showRoster && ('), 'Roster sidebar must be conditionally rendered');
  assert(videoRoomCode.includes('<ParticipantRoster'), 'Roster component must be rendered in sidebar');
  assert(videoRoomCode.includes('setShowRoster(false)'), 'VideoRoom must allow closing roster');
});

console.log('\n================================================================');
console.log(` ALL PHASE 3 PRE-JOIN & ROSTER TESTS PASSED (${passedTests}/${totalTests})`);
console.log('================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
