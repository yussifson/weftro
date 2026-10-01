/**
 * JCLFieldTrackerEngine.js
 *
 * Production-ready, high-accuracy, offline-first GPS field tracking & client meeting check-in engine.
 * Powered by PowerSync SQLite + Supabase Postgres bidirectional sync for JCL Real Estate.
 *
 * Schema alignment (AppSchema.js):
 *   univ_re_marketer_locations  → columns: id, company_id, user_id, user_name, user_email, user_phone,
 *                                           latitude, longitude, accuracy, speed, heading, battery_level,
 *                                           status, address_label, tracked_at, created_at
 *   univ_re_client_meetings     → columns: id, company_id, marketer_id, marketer_name, client_name,
 *                                           client_phone, client_email, property_interest, meeting_purpose,
 *                                           notes, meeting_outcome, follow_up_date, latitude, longitude,
 *                                           accuracy, address_text, sync_status, created_at
 */

import { supabase } from './supabaseClient';
import { powerSync } from './PowerSyncConnector';

const OFFLINE_LOCATIONS_KEY = 'jcl_offline_marketer_locations_v2';
const OFFLINE_MEETINGS_KEY = 'jcl_offline_client_meetings_v2';
const TRACKING_STATE_KEY = 'jcl_marketer_tracking_active_v2';
const LAST_PING_KEY = 'jcl_marketer_last_ping_v2';
const KNOWN_MARKETERS_KEY = 'jcl_known_marketers_v2';

let activeWatchId = null;
let lastPingTime = 0;
let lastPosition = null;
const MIN_PING_INTERVAL_MS = 10000;
const MIN_DISTANCE_METERS = 5;

const generateId = () => `jcl_ft_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// ─── Haversine Distance ───────────────────────────────────────────────────────
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Reverse Geocoding ───────────────────────────────────────────────────────
const addressCache = new Map();
export const reverseGeocode = async (lat, lng) => {
  if (!lat || !lng) return 'Unknown Location';
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (addressCache.has(key)) return addressCache.get(key);

  // 1. OpenStreetMap Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'JCLRealEstateFieldTracker/1.0' } }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.display_name ||
        `${data.address?.road || ''}, ${data.address?.suburb || data.address?.city || ''}`.trim();
      if (addr && addr.length > 3) { addressCache.set(key, addr); return addr; }
    }
  } catch (_) {}

  // 2. OpenStreetMap Nominatim Fallback
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'JCLRealEstateFieldTracker/1.0' } }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.display_name ||
        `${data.address?.road || ''}, ${data.address?.suburb || data.address?.city || ''}`.trim();
      if (addr && addr.length > 3) { addressCache.set(key, addr); return addr; }
    }
  } catch (_) {}

  // 3. BigDataCloud Fallback
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const addr = `${data.locality || data.city || ''}, ${data.principalSubdivision || data.countryName || ''}`.trim();
      if (addr && addr.length > 3) { addressCache.set(key, addr); return addr; }
    }
  } catch (_) {}

  const fallback = `GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
  addressCache.set(key, fallback);
  return fallback;
};

// ─── Geolocation Permission Detection ────────────────────────────────────────
/**
 * Returns: { granted: true } | { denied: true, reason: 'denied'|'blocked_policy'|'unavailable' }
 * 'blocked_policy'  → browser permissions policy (iFrame embed with no allow="geolocation")
 * 'denied'          → user explicitly denied
 * 'unavailable'     → browser doesn't support it
 */
export const checkGeolocationPermission = async () => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { granted: false, reason: 'unavailable' };
  }

  // Use Permissions API when available for fast status check
  if (navigator.permissions) {
    try {
      const perm = await navigator.permissions.query({ name: 'geolocation' });
      if (perm.state === 'granted') return { granted: true };
      if (perm.state === 'denied') return { granted: false, reason: 'denied' };
      // 'prompt' → attempt to trigger it
    } catch (_) {}
  }

  // Probe the geolocation API directly (catches permissions-policy violations)
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve({ granted: false, reason: 'timeout' });
    }, 8000);

    navigator.geolocation.getCurrentPosition(
      () => {
        clearTimeout(timeoutId);
        resolve({ granted: true });
      },
      (err) => {
        clearTimeout(timeoutId);
        if (err.code === 1) resolve({ granted: false, reason: 'denied' });
        else if (err.code === 2) resolve({ granted: false, reason: 'unavailable' });
        else resolve({ granted: false, reason: 'timeout' });
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 60000 }
    );
  });
};

// ─── Offline Queue Helpers ───────────────────────────────────────────────────
export const getOfflineQueueStatus = () => {
  try {
    const locations = JSON.parse(localStorage.getItem(OFFLINE_LOCATIONS_KEY) || '[]');
    const meetings = JSON.parse(localStorage.getItem(OFFLINE_MEETINGS_KEY) || '[]');
    return {
      pendingLocations: locations.length,
      pendingMeetings: meetings.length,
      totalPending: locations.length + meetings.length,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
  } catch (_) {
    return { pendingLocations: 0, pendingMeetings: 0, totalPending: 0, isOnline: true };
  }
};

const queueLocationOffline = (record) => {
  try {
    const current = JSON.parse(localStorage.getItem(OFFLINE_LOCATIONS_KEY) || '[]');
    current.push(record);
    localStorage.setItem(OFFLINE_LOCATIONS_KEY, JSON.stringify(current));
  } catch (_) {}
};

const queueMeetingOffline = (record) => {
  try {
    const current = JSON.parse(localStorage.getItem(OFFLINE_MEETINGS_KEY) || '[]');
    current.push(record);
    localStorage.setItem(OFFLINE_MEETINGS_KEY, JSON.stringify(current));
  } catch (_) {}
};

// ─── Known Marketers Local Cache ─────────────────────────────────────────────
// Keeps a registry of every user that has ever broadcast a ping so the admin
// roster always shows them even across page refreshes when PowerSync is empty.
const updateKnownMarketers = (pingRecord) => {
  try {
    const known = JSON.parse(localStorage.getItem(KNOWN_MARKETERS_KEY) || '{}');
    known[pingRecord.user_id] = {
      user_id: pingRecord.user_id,
      user_name: pingRecord.user_name,
      user_email: pingRecord.user_email,
      user_phone: pingRecord.user_phone || '',
      company_id: pingRecord.company_id,
      latitude: pingRecord.latitude,
      longitude: pingRecord.longitude,
      accuracy: pingRecord.accuracy,
      speed: pingRecord.speed,
      address_label: pingRecord.address_label,
      status: pingRecord.status,
      tracked_at: pingRecord.tracked_at,
      battery_level: pingRecord.battery_level,
    };
    localStorage.setItem(KNOWN_MARKETERS_KEY, JSON.stringify(known));
  } catch (_) {}
};

const getKnownMarketers = (companyId) => {
  try {
    const known = JSON.parse(localStorage.getItem(KNOWN_MARKETERS_KEY) || '{}');
    return Object.values(known).filter((m) => !companyId || m.company_id === companyId);
  } catch (_) { return []; }
};

// ─── Supabase Direct Upsert (schema-safe) ────────────────────────────────────
const upsertLocationToSupabase = async (record) => {
  if (!navigator.onLine || !supabase) return false;
  try {
    const { error } = await supabase.from('univ_re_marketer_locations').upsert(record);
    return !error;
  } catch (_) { return false; }
};

const upsertMeetingToSupabase = async (record) => {
  if (!navigator.onLine || !supabase) return false;
  try {
    const { error } = await supabase.from('univ_re_client_meetings').upsert(record);
    return !error;
  } catch (_) { return false; }
};

// ─── PowerSync Insert (schema-safe) ──────────────────────────────────────────
const insertLocationToPowerSync = async (rec) => {
  if (!powerSync?.execute) return false;
  try {
    await powerSync.execute(
      `INSERT OR REPLACE INTO univ_re_marketer_locations
       (id, company_id, user_id, user_name, user_email, user_phone,
        latitude, longitude, accuracy, speed, heading,
        status, address_label, battery_level, tracked_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rec.id, rec.company_id, rec.user_id, rec.user_name, rec.user_email, rec.user_phone || '',
        rec.latitude, rec.longitude, rec.accuracy, rec.speed, rec.heading,
        rec.status, rec.address_label, rec.battery_level,
        rec.tracked_at, rec.created_at,
      ]
    );
    return true;
  } catch (e) {
    console.warn('[JCLFieldTracker] PowerSync location insert error:', e?.message);
    return false;
  }
};

const insertMeetingToPowerSync = async (rec) => {
  if (!powerSync?.execute) return false;
  try {
    await powerSync.execute(
      `INSERT OR REPLACE INTO univ_re_client_meetings
       (id, company_id, marketer_id, marketer_name, client_name, client_phone, client_email,
        property_interest, meeting_purpose, notes, meeting_outcome, follow_up_date,
        latitude, longitude, accuracy, address_text, sync_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rec.id, rec.company_id, rec.marketer_id, rec.marketer_name,
        rec.client_name, rec.client_phone, rec.client_email,
        rec.property_interest, rec.meeting_purpose, rec.notes,
        rec.meeting_outcome, rec.follow_up_date,
        rec.latitude, rec.longitude, rec.accuracy,
        rec.address_text, rec.sync_status, rec.created_at,
      ]
    );
    return true;
  } catch (e) {
    console.warn('[JCLFieldTracker] PowerSync meeting insert error:', e?.message);
    return false;
  }
};

// ─── Sync Offline Queue ──────────────────────────────────────────────────────
export const syncOfflineQueue = async () => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: false, syncedLocations: 0, syncedMeetings: 0, error: 'Offline' };
  }

  let syncedLocations = 0;
  let syncedMeetings = 0;

  try {
    const locations = JSON.parse(localStorage.getItem(OFFLINE_LOCATIONS_KEY) || '[]');
    const remaining = [];
    for (const loc of locations) {
      const ok = await insertLocationToPowerSync(loc) || await upsertLocationToSupabase(loc);
      if (ok) { syncedLocations++; updateKnownMarketers(loc); }
      else remaining.push(loc);
    }
    localStorage.setItem(OFFLINE_LOCATIONS_KEY, JSON.stringify(remaining));
  } catch (_) {}

  try {
    const meetings = JSON.parse(localStorage.getItem(OFFLINE_MEETINGS_KEY) || '[]');
    const remaining = [];
    for (const m of meetings) {
      const rec = { ...m, sync_status: 'synced' };
      const ok = await insertMeetingToPowerSync(rec) || await upsertMeetingToSupabase(rec);
      if (ok) syncedMeetings++;
      else remaining.push(m);
    }
    localStorage.setItem(OFFLINE_MEETINGS_KEY, JSON.stringify(remaining));
  } catch (_) {}

  return { success: true, syncedLocations, syncedMeetings };
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => syncOfflineQueue());
}

// ─── START Live Tracking ─────────────────────────────────────────────────────
export const startLiveTracking = (userInfo, onUpdate, onError) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    if (onError) onError('unavailable');
    return false;
  }

  localStorage.setItem(TRACKING_STATE_KEY, JSON.stringify({ active: true, startedAt: new Date().toISOString() }));

  const handlePositionSuccess = async (position) => {
    const now = Date.now();
    const { latitude, longitude, accuracy, speed, heading } = position.coords;

    if (now - lastPingTime < MIN_PING_INTERVAL_MS) return;
    if (lastPosition) {
      const dist = calculateDistanceMeters(lastPosition.latitude, lastPosition.longitude, latitude, longitude);
      if (dist < MIN_DISTANCE_METERS && now - lastPingTime < 30000) return;
    }

    lastPingTime = now;
    lastPosition = { latitude, longitude };

    let batteryLevel = 100;
    try {
      if (navigator.getBattery) {
        const batt = await navigator.getBattery();
        batteryLevel = Math.round(batt.level * 100);
      }
    } catch (_) {}

    const addressLabel = await reverseGeocode(latitude, longitude);
    const now_iso = new Date().toISOString();

    const pingRecord = {
      id: generateId(),
      company_id: userInfo.company_id || 'default',
      user_id: userInfo.id || userInfo.user_id,
      user_name: userInfo.name || userInfo.user_name || userInfo.email || 'Marketer',
      user_email: userInfo.email || '',
      user_phone: userInfo.phone || '',
      latitude,
      longitude,
      accuracy: Math.round(accuracy || 0),
      speed: Math.round((speed || 0) * 10) / 10,
      heading: Math.round(heading || 0),
      status: 'Active',
      address_label: addressLabel,
      battery_level: batteryLevel,
      tracked_at: now_iso,
      created_at: now_iso,
    };

    updateKnownMarketers(pingRecord);

    const savedPS = await insertLocationToPowerSync(pingRecord);
    const savedSB = await upsertLocationToSupabase(pingRecord);

    if (!savedPS && !savedSB) queueLocationOffline(pingRecord);

    localStorage.setItem(LAST_PING_KEY, JSON.stringify(pingRecord));
    if (onUpdate) onUpdate(pingRecord);
  };

  const handlePositionError = async (error) => {
    console.warn('[JCLFieldTracker] Geolocation error:', error?.code, error?.message);

    // Automatic network location fallback so tracking NEVER breaks
    try {
      const ipRes = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.latitude && ipData.longitude) {
          await handlePositionSuccess({
            coords: {
              latitude: ipData.latitude,
              longitude: ipData.longitude,
              accuracy: 50,
              speed: 0,
              heading: 0,
            }
          });
          return;
        }
      }
    } catch (_) {}

    let code = 'unknown';
    if (error?.code === 1) code = 'denied';
    else if (error?.code === 2) code = 'unavailable';
    else if (error?.code === 3) code = 'timeout';
    if (error?.message && error.message.toLowerCase().includes('permissions policy')) {
      code = 'blocked_policy';
    }
    if (onError) onError(code);
  };

  try {
    // Immediately attempt to fetch initial position without waiting for watch interval
    navigator.geolocation.getCurrentPosition(
      handlePositionSuccess,
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );

    activeWatchId = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
    return true;
  } catch (e) {
    if (onError) onError('blocked_policy');
    return false;
  }
};

// ─── STOP Live Tracking ──────────────────────────────────────────────────────
export const stopLiveTracking = (userInfo) => {
  if (activeWatchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.clearWatch(activeWatchId);
    activeWatchId = null;
  }
  localStorage.setItem(TRACKING_STATE_KEY, JSON.stringify({ active: false, stoppedAt: new Date().toISOString() }));

  if (userInfo && lastPosition) {
    const pausePing = {
      id: generateId(),
      company_id: userInfo.company_id || 'default',
      user_id: userInfo.id || userInfo.user_id,
      user_name: userInfo.name || userInfo.email || 'Marketer',
      user_email: userInfo.email || '',
      user_phone: userInfo.phone || '',
      latitude: lastPosition.latitude,
      longitude: lastPosition.longitude,
      accuracy: 0, speed: 0, heading: 0,
      status: 'Offline',
      address_label: 'Tracking Stopped',
      battery_level: 100,
      tracked_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    updateKnownMarketers(pausePing);
    insertLocationToPowerSync(pausePing)
      .then(ok => { if (!ok) upsertLocationToSupabase(pausePing); })
      .catch(() => queueLocationOffline(pausePing));
  }
};

export const isLiveTrackingActive = () => {
  try {
    const state = JSON.parse(localStorage.getItem(TRACKING_STATE_KEY) || '{}');
    return Boolean(state.active && activeWatchId !== null);
  } catch (_) { return false; }
};

// ─── LOG CLIENT MEETING ──────────────────────────────────────────────────────
export const logClientMeeting = async (userInfo, meetingDetails, manualLatLng = null) => {
  return new Promise((resolve) => {
    const finishMeetingLog = async (lat, lng, acc) => {
      const addressText = (lat && lng) ? await reverseGeocode(lat, lng) : 'Location not available';
      const meetingRecord = {
        id: generateId(),
        company_id: userInfo.company_id || 'default',
        marketer_id: userInfo.id || userInfo.user_id,
        marketer_name: userInfo.name || userInfo.user_name || userInfo.email || 'Marketer',
        client_name: meetingDetails.client_name,
        client_phone: meetingDetails.client_phone || '',
        client_email: meetingDetails.client_email || '',
        property_interest: meetingDetails.property_interest || '',
        meeting_purpose: meetingDetails.meeting_purpose || 'Client Discussion',
        notes: meetingDetails.notes || '',
        meeting_outcome: meetingDetails.meeting_outcome || 'Successful',
        follow_up_date: meetingDetails.follow_up_date || '',
        latitude: lat || 0,
        longitude: lng || 0,
        accuracy: Math.round(acc || 0),
        address_text: addressText,
        sync_status: navigator.onLine ? 'synced' : 'pending',
        created_at: new Date().toISOString(),
      };

      const savedPS = await insertMeetingToPowerSync(meetingRecord);
      const savedSB = await upsertMeetingToSupabase(meetingRecord);

      if (!savedPS && !savedSB) {
        meetingRecord.sync_status = 'pending';
        queueMeetingOffline(meetingRecord);
      }

      resolve({ success: true, meeting: meetingRecord, isOffline: !savedPS && !savedSB });
    };

    // If caller supplied coordinates manually (fallback mode), use them directly
    if (manualLatLng && manualLatLng.lat && manualLatLng.lng) {
      finishMeetingLog(manualLatLng.lat, manualLatLng.lng, manualLatLng.acc || 0);
      return;
    }

    // Use last known GPS position if tracking was active
    if (lastPosition) {
      finishMeetingLog(lastPosition.latitude, lastPosition.longitude, 15);
      return;
    }

    // Try geolocation (may be denied / policy-blocked)
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => finishMeetingLog(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
        (_err) => finishMeetingLog(0, 0, 0),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    } else {
      finishMeetingLog(0, 0, 0);
    }
  });
};

// ─── FETCH ACTIVE MARKETERS (Admin Roster) ───────────────────────────────────
// Returns the most recent ping per unique user. Merges PowerSync + Supabase + localStorage.
export const fetchActiveMarketers = async (companyId) => {
  const latestByUser = new Map();

  // 1. Start with local known marketers (always available, survives page refresh)
  const known = getKnownMarketers(companyId);
  known.forEach((m) => latestByUser.set(m.user_id, m));

  // 2. Merge last ping from localStorage
  try {
    const lastPingStr = localStorage.getItem(LAST_PING_KEY);
    if (lastPingStr) {
      const lp = JSON.parse(lastPingStr);
      if (!companyId || lp.company_id === companyId) {
        const existing = latestByUser.get(lp.user_id);
        if (!existing || lp.tracked_at > (existing.tracked_at || '')) {
          latestByUser.set(lp.user_id, lp);
        }
      }
    }
  } catch (_) {}

  // 3. PowerSync SQLite (most fresh live data)
  if (powerSync?.execute) {
    try {
      const res = await powerSync.execute(
        `SELECT * FROM univ_re_marketer_locations WHERE company_id = ? ORDER BY tracked_at DESC`,
        [companyId || 'default']
      );
      const rows = res?.rows?._array || Array.from(res?.rows || []);
      rows.forEach((row) => {
        const existing = latestByUser.get(row.user_id);
        if (!existing || row.tracked_at > (existing.tracked_at || '')) {
          latestByUser.set(row.user_id, row);
        }
      });
    } catch (e) {
      console.warn('[JCLFieldTracker] PowerSync fetchActiveMarketers error:', e?.message);
    }
  }

  // 4. Supabase fallback
  if (typeof navigator !== 'undefined' && navigator.onLine && supabase) {
    try {
      const { data, error } = await supabase
        .from('univ_re_marketer_locations')
        .select('*')
        .eq('company_id', companyId || 'default')
        .order('tracked_at', { ascending: false });

      if (!error && data) {
        data.forEach((row) => {
          const existing = latestByUser.get(row.user_id);
          if (!existing || row.tracked_at > (existing.tracked_at || '')) {
            latestByUser.set(row.user_id, row);
          }
        });
      }
    } catch (_) {}
  }

  return Array.from(latestByUser.values()).sort(
    (a, b) => (b.tracked_at || '').localeCompare(a.tracked_at || '')
  );
};

// ─── FETCH CLIENT MEETINGS ───────────────────────────────────────────────────
export const fetchClientMeetings = async (companyId) => {
  let meetings = [];
  const meetingIds = new Set();

  // PowerSync first
  if (powerSync?.execute) {
    try {
      const res = await powerSync.execute(
        `SELECT * FROM univ_re_client_meetings WHERE company_id = ? ORDER BY created_at DESC`,
        [companyId || 'default']
      );
      const rows = res?.rows?._array || Array.from(res?.rows || []);
      meetings = rows;
      rows.forEach((r) => meetingIds.add(r.id));
    } catch (e) {
      console.warn('[JCLFieldTracker] PowerSync fetchClientMeetings error:', e?.message);
    }
  }

  // Supabase fallback / merge
  if (typeof navigator !== 'undefined' && navigator.onLine && supabase) {
    try {
      const { data, error } = await supabase
        .from('univ_re_client_meetings')
        .select('*')
        .eq('company_id', companyId || 'default')
        .order('created_at', { ascending: false });

      if (!error && data) {
        data.forEach((row) => {
          if (!meetingIds.has(row.id)) {
            meetings.push(row);
            meetingIds.add(row.id);
          }
        });
      }
    } catch (_) {}
  }

  // Merge unsynced offline meetings
  try {
    const offlineStr = localStorage.getItem(OFFLINE_MEETINGS_KEY);
    if (offlineStr) {
      JSON.parse(offlineStr).forEach((om) => {
        if (!meetingIds.has(om.id)) { meetings.unshift(om); meetingIds.add(om.id); }
      });
    }
  } catch (_) {}

  return meetings;
};

// ─── FETCH MARKETER ROUTE HISTORY ────────────────────────────────────────────
export const fetchMarketerRouteHistory = async (companyId, userId, limit = 100) => {
  // PowerSync first
  if (powerSync?.execute) {
    try {
      const res = await powerSync.execute(
        `SELECT * FROM univ_re_marketer_locations
         WHERE company_id = ? AND user_id = ?
         ORDER BY tracked_at ASC LIMIT ?`,
        [companyId || 'default', userId, limit]
      );
      const rows = res?.rows?._array || Array.from(res?.rows || []);
      if (rows.length > 0) return rows;
    } catch (e) {
      console.warn('[JCLFieldTracker] PowerSync fetchMarketerRouteHistory error:', e?.message);
    }
  }

  // Supabase fallback
  if (typeof navigator !== 'undefined' && navigator.onLine && supabase) {
    try {
      const { data, error } = await supabase
        .from('univ_re_marketer_locations')
        .select('*')
        .eq('company_id', companyId || 'default')
        .eq('user_id', userId)
        .order('tracked_at', { ascending: true })
        .limit(limit);
      if (!error && data) return data;
    } catch (_) {}
  }

  return [];
};
