/**
 * Meeting Telemetry and Diagnostics Service for Weftro V3
 * Lightweight, privacy-conscious diagnostics for operational reliability.
 *
 * Privacy Guarantees:
 * 1. Never logs or emits access tokens, meeting secrets, API keys, or raw authorization headers.
 * 2. Never records or captures audio/video payloads, chat contents, or personal notes.
 * 3. Uses structured, sanitized diagnostic metrics (durations, event types, room hash/id).
 * 4. Silently handles transport errors so telemetry failures NEVER degrade meeting calls.
 */

import { trackAnalyticsEvent } from '@/lib/analytics';

/**
 * Sanitizes room name to prevent leaking full query parameters or token-bearing URLs
 */
function sanitizeRoomIdentifier(roomIdentifier) {
  if (!roomIdentifier) return 'unknown';
  try {
    const raw = String(roomIdentifier)
      .replace(/^https?:\/\/[^/]+\//i, '')
      .split('?')[0];
    return raw.slice(0, 60);
  } catch (_) {
    return 'unknown';
  }
}

export const MeetingTelemetry = {
  /**
   * Connection lifecycle events
   */
  connectionStateChanged({ state, roomId, networkQuality, reconnectAttempt = 0 }) {
    try {
      trackAnalyticsEvent('meeting_connection_state_changed', {
        state, // 'connecting' | 'connected' | 'reconnecting' | 'recovered' | 'failed'
        roomId: sanitizeRoomIdentifier(roomId),
        networkQuality: networkQuality || 'unknown',
        reconnectAttempt: Number(reconnectAttempt) || 0,
        clientTimestamp: Date.now()
      });
    } catch (_) {}
  },

  /**
   * Device or media recovery events
   */
  mediaRecoveryAttempted({ type, status, errorType, roomId }) {
    try {
      trackAnalyticsEvent('meeting_media_recovery', {
        deviceType: type, // 'audio' | 'video' | 'screen'
        status, // 'started' | 'recovered' | 'failed'
        errorType: errorType ? String(errorType).slice(0, 50) : undefined,
        roomId: sanitizeRoomIdentifier(roomId),
        clientTimestamp: Date.now()
      });
    } catch (_) {}
  },

  /**
   * Participant operational transitions (count / role / presence only)
   */
  participantTransition({ action, isLocal, totalParticipants, roomId }) {
    try {
      trackAnalyticsEvent('meeting_participant_transition', {
        action, // 'joined' | 'left'
        isLocal: Boolean(isLocal),
        totalParticipants: Number(totalParticipants) || 1,
        roomId: sanitizeRoomIdentifier(roomId),
        clientTimestamp: Date.now()
      });
    } catch (_) {}
  },

  /**
   * Termination / failure diagnostics
   */
  sessionError({ context, errorMessage, roomId }) {
    try {
      trackAnalyticsEvent('meeting_session_error', {
        context, // 'provisioning' | 'join' | 'reconnection' | 'termination'
        errorSummary: errorMessage ? String(errorMessage).slice(0, 100) : 'unknown',
        roomId: sanitizeRoomIdentifier(roomId),
        clientTimestamp: Date.now()
      });
    } catch (_) {}
  }
};
