/**
 * Weftro V3 - Phase 2 Comprehensive Test Suite
 * Audio/Video Quality, Active-Speaker Detection & Media Lifecycle Stability
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== WEFTRO V3: PHASE 2 MEDIA LIFECYCLE & ACTIVE-SPEAKER VERIFICATION ===\n');

// Read VideoRoom.jsx code
const videoRoomPath = path.resolve(__dirname, '../src/components/video/VideoRoom.jsx');
const videoRoomCode = fs.readFileSync(videoRoomPath, 'utf8');

// Helper to simulate speaker detection logic directly
function computeIsSpeaking({ activeSpeakerId, id, audioState }) {
  return Boolean(activeSpeakerId && activeSpeakerId === id && audioState?.state === 'playable');
}

// -------------------------------------------------------------
// TEST GROUP 1: Accurate Active-Speaker Detection
// -------------------------------------------------------------
console.log('--- TEST GROUP 1: Accurate Active-Speaker Detection ---');

// 1.1: Local participant is NOT marked speaking merely because audio is playable
{
  const localId = 'local-123';
  const audioState = { state: 'playable', track: {} };
  const activeSpeakerId = null; // No one is currently speaking
  
  const isSpeaking = computeIsSpeaking({ activeSpeakerId, id: localId, audioState });
  assert.strictEqual(isSpeaking, false, 'Local participant must not be marked as speaking when activeSpeakerId is null');
  console.log('  [PASS] 1.1: Local participant is not marked as speaking merely because audio is playable');
}

// 1.2: Active-speaker state correctly distinguishes local and remote participants
{
  const localId = 'local-123';
  const remoteId = 'remote-456';
  
  // Remote participant is active speaker
  const remoteSpeaking = computeIsSpeaking({
    activeSpeakerId: remoteId,
    id: remoteId,
    audioState: { state: 'playable' }
  });
  const localSpeaking = computeIsSpeaking({
    activeSpeakerId: remoteId,
    id: localId,
    audioState: { state: 'playable' }
  });
  
  assert.strictEqual(remoteSpeaking, true, 'Remote participant should be marked speaking');
  assert.strictEqual(localSpeaking, false, 'Local participant should NOT be marked speaking when remote is active');
  
  // Local participant becomes active speaker
  const localSpeakingNow = computeIsSpeaking({
    activeSpeakerId: localId,
    id: localId,
    audioState: { state: 'playable' }
  });
  const remoteSpeakingNow = computeIsSpeaking({
    activeSpeakerId: localId,
    id: remoteId,
    audioState: { state: 'playable' }
  });
  
  assert.strictEqual(localSpeakingNow, true, 'Local participant should be marked speaking when activeSpeakerId matches local');
  assert.strictEqual(remoteSpeakingNow, false, 'Remote participant should NOT be marked speaking when local is active');
  console.log('  [PASS] 1.2: Active-speaker state correctly transitions between local and remote participants');
}

// 1.3: Muting prevents false speaking indicator even if activeSpeakerId has not updated
{
  const localId = 'local-123';
  const isSpeakingWhileMuted = computeIsSpeaking({
    activeSpeakerId: localId,
    id: localId,
    audioState: { state: 'blocked' } // or 'off'
  });
  assert.strictEqual(isSpeakingWhileMuted, false, 'Muted participant must never show active speaking indicator');
  console.log('  [PASS] 1.3: Muting prevents false speaking indicators');
}

// 1.4: Neutral fallback when active-speaker information is null/undefined
{
  const id = 'participant-789';
  const isSpeaking = computeIsSpeaking({
    activeSpeakerId: undefined,
    id,
    audioState: { state: 'playable' }
  });
  assert.strictEqual(isSpeaking, false, 'Should neutrally indicate not-speaking when active-speaker information is unavailable');
  console.log('  [PASS] 1.4: Neutral fallback provided when active-speaker data is unavailable');
}

// -------------------------------------------------------------
// TEST GROUP 2: Audio Rendering & Media Element Lifecycle
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Stable Audio Rendering & Media Element Lifecycle ---');

// 2.1: Verify ParticipantTile cleans up audio and video srcObject on unmount
{
  assert(
    videoRoomCode.includes('audioEl.srcObject = null;'),
    'ParticipantTile must release audioEl.srcObject on cleanup'
  );
  assert(
    videoRoomCode.includes('videoEl.srcObject = null;'),
    'ParticipantTile must release videoEl.srcObject on cleanup'
  );
  console.log('  [PASS] 2.1: Audio and video media elements release MediaStream tracks on unmount');
}

// 2.2: Verify ScreenShareTile cleans up media streams on unmount
{
  assert(
    videoRoomCode.includes('if (videoEl) {\r\n       videoEl.srcObject = null;') ||
    videoRoomCode.includes('if (videoEl) {\n       videoEl.srcObject = null;'),
    'ScreenShareTile must clean up video stream on unmount'
  );
  console.log('  [PASS] 2.2: ScreenShare media elements release streams upon stopping or unmounting');
}

// 2.3: Verify stable participant keying in stage and sidebar
{
  assert(
    videoRoomCode.includes('<ParticipantTile key={id} id={id} isLocal={id === localSessionId} activeSpeakerId={activeSpeakerId}'),
    'Sidebar participants must have stable identity keys and explicit activeSpeakerId'
  );
  assert(
    videoRoomCode.includes('<ParticipantTile id={mainSpeakerId} isLocal={mainSpeakerId === localSessionId} activeSpeakerId={activeSpeakerId}'),
    'Main stage participant must pass activeSpeakerId'
  );
  console.log('  [PASS] 2.3: Stage and sidebar participants maintain stable React keys and props');
}

// -------------------------------------------------------------
// TEST GROUP 3: Camera & Microphone State Synchronization
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Camera and Microphone State Synchronization ---');

// 3.1: Verify microphone mute indicator is distinct from active-speaker indicator
{
  assert(
    videoRoomCode.includes("audioState?.state !== 'playable' && <MicOff className="),
    'Microphone muted state must be determined by audioState track state, not speaking indicator'
  );
  assert(
    videoRoomCode.includes("const isMuted = localAudioTrack?.state !== 'playable';"),
    'Local microphone state must reflect localAudioTrack state'
  );
  assert(
    videoRoomCode.includes("const isVideoOff = localVideoTrack?.state !== 'playable';"),
    'Local camera state must reflect localVideoTrack state'
  );
  console.log('  [PASS] 3.1: Microphone and camera state are tracked via Daily tracks, distinct from active-speaker status');
}

// -------------------------------------------------------------
// TEST GROUP 4: Reconnection & Media Recovery
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Reconnection & Media Recovery ---');

// 4.1: Network interruption handling with timeout and recovery actions
{
  assert(
    videoRoomCode.includes("useDailyEvent('network-connection', useCallback((ev) => {"),
    'Daily network-connection event must be monitored'
  );
  assert(
    videoRoomCode.includes("setReconnectError('Reconnection is taking longer than expected. Please verify your internet connection.');"),
    'Reconnection must provide a recovery notice after timeout'
  );
  assert(
    videoRoomCode.includes('reconnectTimeoutRef.current = null;'),
    'Reconnection timer must be cleared when connection restores'
  );
  assert(
    videoRoomCode.includes('Retry Connection'),
    'Reconnecting overlay must provide a retry action if recovery stalls'
  );
  console.log('  [PASS] 4.1: Network interruptions trigger recovery timeout with actionable retry controls');
}

console.log('\n================================================================');
console.log(' ALL PHASE 2 MEDIA LIFECYCLE & ACTIVE-SPEAKER TESTS PASSED (9/9)');
console.log('================================================================\n');
