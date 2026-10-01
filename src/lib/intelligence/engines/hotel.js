// src/lib/intelligence/engines/hotel.js
// Hotel Intelligence Engine — occupancy, satisfaction, RevPAR, housekeeping
import { generateInsight, groupByWeek, groupByDay } from '@/lib/intelligence/engine';
import { powerSync } from '@/api/PowerSyncConnector';

const VERTICAL = 'hotel';

// ────────────────────────────────────────────────────────
// Occupancy Prediction
// Calculates current and near-term occupancy rate from
// rooms and active reservations. Flags low or overbooking.
// ────────────────────────────────────────────────────────
async function occupancyPrediction(companyId) {
  const insights = [];
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const sevenDaysOut = new Date(now);
  sevenDaysOut.setDate(now.getDate() + 7);
  const sevenDaysStr = sevenDaysOut.toISOString().split('T')[0];

  // Total rooms
  const roomRes = await powerSync.execute(
    `SELECT id, room_number, type, floor, price_per_night, status
     FROM univ_rooms
     WHERE company_id = ?`,
    [companyId]
  );
  const rooms = roomRes.rows._array;

  if (rooms.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'hotel_occupancy_no_data',
      title: 'Occupancy Intelligence Building',
      body: 'No rooms found in the system. Occupancy analysis will begin once room data is available.',
      severity: 'info',
    }];
  }

  const totalRooms = rooms.length;

  // Current occupancy: reservations overlapping today
  const currentRes = await powerSync.execute(
    `SELECT r.guest_name, r.room_id, r.check_in, r.check_out, r.status
     FROM univ_reservations r
     WHERE r.company_id = ? AND r.check_in <= ? AND r.check_out >= ? AND r.status != 'cancelled'`,
    [companyId, today, today]
  );
  const currentReservations = currentRes.rows._array;
  const currentOccupancy = (currentReservations.length / totalRooms) * 100;

  // Next 7 days: count reservations per day
  const upcomingRes = await powerSync.execute(
    `SELECT guest_name, room_id, check_in, check_out, status
     FROM univ_reservations
     WHERE company_id = ? AND check_out >= ? AND check_in <= ? AND status != 'cancelled'`,
    [companyId, today, sevenDaysStr]
  );
  const upcomingReservations = upcomingRes.rows._array;

  // Calculate daily occupancy forecast
  const dailyForecast = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dayStr = d.toISOString().split('T')[0];
    const occupied = upcomingReservations.filter(r =>
      r.check_in <= dayStr && r.check_out >= dayStr
    ).length;
    dailyForecast.push({
      date: dayStr,
      occupied,
      occupancyRate: Math.round((occupied / totalRooms) * 1000) / 10,
    });
  }

  // Room type breakdown
  const roomTypes = {};
  for (const room of rooms) {
    const type = room.type || 'Standard';
    if (!roomTypes[type]) roomTypes[type] = { total: 0, occupied: 0 };
    roomTypes[type].total++;
  }
  for (const res of currentReservations) {
    const room = rooms.find(r => r.id === res.room_id);
    if (room) {
      const type = room.type || 'Standard';
      if (roomTypes[type]) roomTypes[type].occupied++;
    }
  }

  const avgForecast = dailyForecast.reduce((s, d) => s + d.occupancyRate, 0) / dailyForecast.length;
  const lowDays = dailyForecast.filter(d => d.occupancyRate < 40);

  const aiBody = await generateInsight(
    `Analyze hotel occupancy. Current occupancy is ${Math.round(currentOccupancy)}%. Provide 7-day outlook and revenue optimization suggestions.`,
    {
      totalRooms,
      currentOccupied: currentReservations.length,
      currentOccupancyPercent: Math.round(currentOccupancy * 10) / 10,
      sevenDayForecast: dailyForecast,
      averageForecast: Math.round(avgForecast * 10) / 10,
      roomTypeBreakdown: roomTypes,
    }
  );

  const severity = currentOccupancy > 95 ? 'warning'
    : currentOccupancy < 40 ? 'warning'
    : avgForecast < 40 ? 'warning'
    : 'positive';

  insights.push({
    vertical: VERTICAL,
    insight_type: 'prediction',
    insight_key: 'hotel_occupancy_forecast',
    title: `Occupancy at ${Math.round(currentOccupancy)}% Today — ${Math.round(avgForecast)}% Avg Next 7 Days`,
    body: aiBody,
    severity,
    confidence: 0.75,
    data_snapshot: {
      totalRooms,
      currentOccupied: currentReservations.length,
      currentOccupancyPercent: Math.round(currentOccupancy * 10) / 10,
      forecast: dailyForecast,
      roomTypes,
    },
    action_label: 'View Reservations',
    action_url: '/hotel/reservations',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// Guest Satisfaction Analysis
// Examines open/unresolved guest requests to surface
// service quality issues before they become complaints.
// ────────────────────────────────────────────────────────
async function guestSatisfactionAnalysis(companyId) {
  const insights = [];

  const reqRes = await powerSync.execute(
    `SELECT room, type, detail, status
     FROM univ_hotel_guest_requests
     WHERE company_id = ?`,
    [companyId]
  );
  const requests = reqRes.rows._array;

  if (requests.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'positive',
      insight_key: 'hotel_satisfaction_clean',
      title: 'No Guest Requests Pending',
      body: 'No guest requests recorded. Either all requests have been handled or the system has no data yet.',
      severity: 'positive',
    }];
  }

  const unresolved = requests.filter(r =>
    r.status && !['completed', 'resolved', 'done', 'closed'].includes(r.status.toLowerCase())
  );

  // Group by type
  const byType = {};
  for (const r of requests) {
    const type = r.type || 'Other';
    if (!byType[type]) byType[type] = { total: 0, unresolved: 0 };
    byType[type].total++;
    if (unresolved.includes(r)) byType[type].unresolved++;
  }

  // Group unresolved by room
  const byRoom = {};
  for (const r of unresolved) {
    const room = r.room || 'Unknown';
    if (!byRoom[room]) byRoom[room] = [];
    byRoom[room].push({ type: r.type, detail: r.detail, status: r.status });
  }

  const unresolvedRate = requests.length > 0
    ? (unresolved.length / requests.length) * 100
    : 0;

  if (unresolved.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'positive',
      insight_key: 'hotel_satisfaction_resolved',
      title: 'All Guest Requests Resolved',
      body: `All ${requests.length} guest requests have been resolved. Great service responsiveness.`,
      severity: 'positive',
      confidence: 0.85,
      data_snapshot: { totalRequests: requests.length, typeBreakdown: byType },
    }];
  }

  const multiRequestRooms = Object.entries(byRoom)
    .filter(([_, reqs]) => reqs.length >= 2)
    .map(([room, reqs]) => ({ room, pendingCount: reqs.length }));

  const aiBody = await generateInsight(
    `Analyze unresolved guest requests and identify service quality risks. Focus on patterns and priority actions.`,
    {
      totalRequests: requests.length,
      unresolvedCount: unresolved.length,
      unresolvedRate: Math.round(unresolvedRate * 10) / 10,
      typeBreakdown: byType,
      roomsWithMultipleRequests: multiRequestRooms,
      sampleUnresolved: unresolved.slice(0, 5).map(r => ({
        room: r.room,
        type: r.type,
        detail: r.detail,
        status: r.status,
      })),
    }
  );

  insights.push({
    vertical: VERTICAL,
    insight_type: 'risk',
    insight_key: 'hotel_satisfaction_risk',
    title: `${unresolved.length} Unresolved Guest Request${unresolved.length > 1 ? 's' : ''} — ${Math.round(unresolvedRate)}% Open`,
    body: aiBody,
    severity: unresolved.length > 10 || unresolvedRate > 50 ? 'critical' : 'warning',
    confidence: 0.8,
    data_snapshot: {
      totalRequests: requests.length,
      unresolvedCount: unresolved.length,
      unresolvedRate: Math.round(unresolvedRate * 10) / 10,
      typeBreakdown: byType,
      roomsWithMultipleRequests: multiRequestRooms,
    },
    action_label: 'View Guest Requests',
    action_url: '/hotel/guest-requests',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// Revenue per Available Room (RevPAR) Optimization
// RevPAR = Total Room Revenue / Total Available Rooms
// Analyses pricing efficiency across room types.
// ────────────────────────────────────────────────────────
async function revParOptimization(companyId) {
  const insights = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // All rooms with pricing
  const roomRes = await powerSync.execute(
    `SELECT id, room_number, type, price_per_night, status
     FROM univ_rooms
     WHERE company_id = ?`,
    [companyId]
  );
  const rooms = roomRes.rows._array;

  if (rooms.length === 0) return [];

  // Reservations in last 30 days (for revenue calc)
  const resRes = await powerSync.execute(
    `SELECT r.room_id, r.check_in, r.check_out, r.status
     FROM univ_reservations r
     WHERE r.company_id = ? AND r.check_out >= ? AND r.status != 'cancelled'`,
    [companyId, thirtyDaysAgo.toISOString().split('T')[0]]
  );
  const reservations = resRes.rows._array;

  // Build a room lookup
  const roomMap = {};
  for (const room of rooms) {
    roomMap[room.id] = room;
  }

  // Calculate revenue and occupied nights per room type
  const typeMetrics = {};
  const totalAvailableNights = rooms.length * 30;
  let totalRevenue = 0;
  let totalOccupiedNights = 0;

  for (const res of reservations) {
    const room = roomMap[res.room_id];
    if (!room) continue;
    const type = room.type || 'Standard';
    const pricePerNight = Number(room.price_per_night || 0);

    // Calculate nights in the 30-day window
    const checkIn = new Date(Math.max(new Date(res.check_in), thirtyDaysAgo));
    const checkOut = new Date(Math.min(new Date(res.check_out), now));
    const nights = Math.max(0, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));

    if (!typeMetrics[type]) {
      const roomsOfType = rooms.filter(r => (r.type || 'Standard') === type);
      typeMetrics[type] = {
        roomCount: roomsOfType.length,
        availableNights: roomsOfType.length * 30,
        occupiedNights: 0,
        revenue: 0,
        avgPrice: roomsOfType.reduce((s, r) => s + Number(r.price_per_night || 0), 0) / roomsOfType.length,
      };
    }

    const nightRevenue = nights * pricePerNight;
    typeMetrics[type].occupiedNights += nights;
    typeMetrics[type].revenue += nightRevenue;
    totalRevenue += nightRevenue;
    totalOccupiedNights += nights;
  }

  // Calculate RevPAR
  const overallRevPAR = totalAvailableNights > 0
    ? totalRevenue / totalAvailableNights
    : 0;

  const typeRevPAR = {};
  for (const [type, metrics] of Object.entries(typeMetrics)) {
    typeRevPAR[type] = {
      ...metrics,
      revPAR: metrics.availableNights > 0 ? metrics.revenue / metrics.availableNights : 0,
      occupancyRate: metrics.availableNights > 0
        ? Math.round((metrics.occupiedNights / metrics.availableNights) * 1000) / 10
        : 0,
    };
  }

  if (totalRevenue === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'hotel_revpar_no_revenue',
      title: 'RevPAR Analysis Needs Reservation Data',
      body: `${rooms.length} rooms are configured but no completed reservations found in the last 30 days for revenue calculation.`,
      severity: 'info',
    }];
  }

  const aiBody = await generateInsight(
    `Analyze RevPAR performance by room type. Suggest pricing and occupancy optimization strategies.`,
    {
      overallRevPAR: Math.round(overallRevPAR * 100) / 100,
      totalRooms: rooms.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOccupiedNights,
      totalAvailableNights,
      overallOccupancy: Math.round((totalOccupiedNights / totalAvailableNights) * 1000) / 10,
      byType: typeRevPAR,
    }
  );

  insights.push({
    vertical: VERTICAL,
    insight_type: 'recommendation',
    insight_key: 'hotel_revpar',
    title: `RevPAR $${overallRevPAR.toFixed(2)} — $${totalRevenue.toFixed(2)} Revenue from ${rooms.length} Rooms`,
    body: aiBody,
    severity: overallRevPAR < (rooms.reduce((s, r) => s + Number(r.price_per_night || 0), 0) / rooms.length * 0.3)
      ? 'warning' : 'info',
    confidence: 0.75,
    data_snapshot: {
      overallRevPAR: Math.round(overallRevPAR * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalRooms: rooms.length,
      byType: typeRevPAR,
    },
    action_label: 'Adjust Room Pricing',
    action_url: '/hotel/rooms',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// Housekeeping Efficiency
// Flags overdue or unfinished housekeeping tasks and
// identifies bottleneck staff or priority issues.
// ────────────────────────────────────────────────────────
async function housekeepingEfficiency(companyId) {
  const insights = [];

  const taskRes = await powerSync.execute(
    `SELECT room_number, task, assigned_to, priority, status
     FROM univ_hotel_housekeeping
     WHERE company_id = ?`,
    [companyId]
  );
  const tasks = taskRes.rows._array;

  if (tasks.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'hotel_housekeeping_no_data',
      title: 'Housekeeping Intelligence Building',
      body: 'No housekeeping tasks found. Efficiency analysis will begin once task data is available.',
      severity: 'info',
    }];
  }

  const pending = tasks.filter(t =>
    t.status && !['completed', 'done', 'closed'].includes(t.status.toLowerCase())
  );
  const completed = tasks.filter(t =>
    t.status && ['completed', 'done', 'closed'].includes(t.status.toLowerCase())
  );

  // High-priority pending tasks are the most urgent
  const highPriorityPending = pending.filter(t =>
    t.priority && ['high', 'urgent', 'critical'].includes(t.priority.toLowerCase())
  );

  // Workload per staff member
  const staffWorkload = {};
  for (const t of tasks) {
    const staff = t.assigned_to || 'Unassigned';
    if (!staffWorkload[staff]) staffWorkload[staff] = { total: 0, pending: 0, completed: 0 };
    staffWorkload[staff].total++;
    if (pending.includes(t)) staffWorkload[staff].pending++;
    if (completed.includes(t)) staffWorkload[staff].completed++;
  }

  // Tasks per room (rooms with multiple pending tasks)
  const roomBacklog = {};
  for (const t of pending) {
    const room = t.room_number || 'Unknown';
    if (!roomBacklog[room]) roomBacklog[room] = 0;
    roomBacklog[room]++;
  }
  const roomsWithBacklog = Object.entries(roomBacklog)
    .filter(([_, count]) => count >= 2)
    .map(([room, count]) => ({ room, pendingTasks: count }))
    .sort((a, b) => b.pendingTasks - a.pendingTasks);

  const completionRate = tasks.length > 0
    ? (completed.length / tasks.length) * 100
    : 0;

  if (pending.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'positive',
      insight_key: 'hotel_housekeeping_clear',
      title: 'All Housekeeping Tasks Completed',
      body: `All ${tasks.length} housekeeping tasks are completed. Housekeeping team is fully caught up.`,
      severity: 'positive',
      confidence: 0.9,
    }];
  }

  const aiBody = await generateInsight(
    `Analyze housekeeping efficiency. Focus on overdue tasks, staff workload balance, and room turnaround.`,
    {
      totalTasks: tasks.length,
      pendingCount: pending.length,
      completedCount: completed.length,
      completionRate: Math.round(completionRate * 10) / 10,
      highPriorityPending: highPriorityPending.length,
      staffWorkload,
      roomsWithBacklog,
    }
  );

  insights.push({
    vertical: VERTICAL,
    insight_type: highPriorityPending.length > 0 ? 'risk' : 'pattern',
    insight_key: 'hotel_housekeeping_efficiency',
    title: `${pending.length} Housekeeping Task${pending.length > 1 ? 's' : ''} Pending — ${Math.round(completionRate)}% Completion Rate`,
    body: aiBody,
    severity: highPriorityPending.length > 3 ? 'critical'
      : highPriorityPending.length > 0 ? 'warning'
      : 'info',
    confidence: 0.8,
    data_snapshot: {
      totalTasks: tasks.length,
      pendingCount: pending.length,
      completionRate: Math.round(completionRate * 10) / 10,
      highPriorityPending: highPriorityPending.length,
      staffWorkload,
      roomsWithBacklog,
    },
    action_label: 'View Housekeeping',
    action_url: '/hotel/housekeeping',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// Main Export
// ────────────────────────────────────────────────────────
export default async function hotelEngine(companyId) {
  const results = await Promise.allSettled([
    occupancyPrediction(companyId),
    guestSatisfactionAnalysis(companyId),
    revParOptimization(companyId),
    housekeepingEfficiency(companyId),
  ]);

  const insights = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      insights.push(...result.value);
    }
  }

  return insights;
}
