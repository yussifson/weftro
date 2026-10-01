// src/lib/intelligence/engines/logistics.js
// Logistics Intelligence Engine — delivery, fleet, routes, warehouses
import { generateInsight, groupByWeek, groupByDay } from '@/lib/intelligence/engine';
import { powerSync } from '@/api/PowerSyncConnector';

const VERTICAL = 'logistics';

// ────────────────────────────────────────────────────────
// Delivery Delay Prediction
// Flags shipments whose estimated_arrival is in the past
// or imminent while not yet delivered. Groups by status
// and origin/destination corridors.
// ────────────────────────────────────────────────────────
async function deliveryDelayPrediction(companyId) {
  const insights = [];
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const threeDaysOut = new Date(now);
  threeDaysOut.setDate(now.getDate() + 3);
  const threeDaysStr = threeDaysOut.toISOString().split('T')[0];

  const shipRes = await powerSync.execute(
    `SELECT tracking_number, origin, destination, status, estimated_arrival
     FROM univ_shipments
     WHERE company_id = ?`,
    [companyId]
  );
  const shipments = shipRes.rows._array;

  if (shipments.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'logistics_delivery_no_data',
      title: 'Delivery Intelligence Building',
      body: 'No shipment records found. Delay prediction will begin once shipment data is available.',
      severity: 'info',
    }];
  }

  // Active shipments (not delivered / not cancelled)
  const activeShipments = shipments.filter(s =>
    s.status && !['delivered', 'cancelled', 'completed'].includes(s.status.toLowerCase())
  );

  if (activeShipments.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'positive',
      insight_key: 'logistics_delivery_clear',
      title: 'All Shipments Delivered',
      body: `All ${shipments.length} shipments are completed. No active deliveries to monitor.`,
      severity: 'positive',
    }];
  }

  // Overdue: estimated_arrival is in the past
  const overdue = activeShipments.filter(s =>
    s.estimated_arrival && s.estimated_arrival < today
  );

  // At risk: arriving within 3 days and not yet in final-mile status
  const atRisk = activeShipments.filter(s =>
    s.estimated_arrival && s.estimated_arrival >= today && s.estimated_arrival <= threeDaysStr
    && s.status && !['out_for_delivery', 'out for delivery', 'in transit'].includes(s.status.toLowerCase())
  );

  // Corridor analysis (origin → destination)
  const corridors = {};
  for (const s of [...overdue, ...atRisk]) {
    const corridor = `${s.origin} → ${s.destination}`;
    if (!corridors[corridor]) corridors[corridor] = { overdue: 0, atRisk: 0 };
    if (overdue.includes(s)) corridors[corridor].overdue++;
    if (atRisk.includes(s)) corridors[corridor].atRisk++;
  }

  if (overdue.length === 0 && atRisk.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'positive',
      insight_key: 'logistics_delivery_ontrack',
      title: 'All Active Shipments On Track',
      body: `${activeShipments.length} active shipment${activeShipments.length > 1 ? 's are' : ' is'} within expected delivery windows. No delays detected.`,
      severity: 'positive',
      confidence: 0.8,
    }];
  }

  const aiBody = await generateInsight(
    `Analyze shipment delays and predict which deliveries need immediate intervention. Focus on overdue shipments and corridor patterns.`,
    {
      totalShipments: shipments.length,
      activeShipments: activeShipments.length,
      overdueCount: overdue.length,
      atRiskCount: atRisk.length,
      corridorBreakdown: corridors,
      overdueDetails: overdue.slice(0, 5).map(s => ({
        tracking: s.tracking_number,
        origin: s.origin,
        destination: s.destination,
        status: s.status,
        estimatedArrival: s.estimated_arrival,
      })),
    }
  );

  insights.push({
    vertical: VERTICAL,
    insight_type: 'prediction',
    insight_key: 'logistics_delivery_delays',
    title: overdue.length > 0
      ? `${overdue.length} Shipment${overdue.length > 1 ? 's' : ''} Overdue, ${atRisk.length} At Risk`
      : `${atRisk.length} Shipment${atRisk.length > 1 ? 's' : ''} At Risk of Delay`,
    body: aiBody,
    severity: overdue.length > 5 ? 'critical' : overdue.length > 0 ? 'warning' : 'info',
    confidence: 0.7,
    data_snapshot: {
      totalActive: activeShipments.length,
      overdueCount: overdue.length,
      atRiskCount: atRisk.length,
      corridors,
      overdueShipments: overdue.slice(0, 10).map(s => ({
        tracking: s.tracking_number,
        corridor: `${s.origin} → ${s.destination}`,
        status: s.status,
        estimatedArrival: s.estimated_arrival,
      })),
    },
    action_label: 'View Delayed Shipments',
    action_url: '/logistics/shipments?filter=delayed',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// Fleet Utilization
// Calculates what percentage of vehicles are actively in
// use vs. idle, under maintenance, or retired.
// ────────────────────────────────────────────────────────
async function fleetUtilization(companyId) {
  const insights = [];

  const fleetRes = await powerSync.execute(
    `SELECT vehicle_id, vehicle_type, status, last_maintenance
     FROM univ_fleet
     WHERE company_id = ?`,
    [companyId]
  );
  const vehicles = fleetRes.rows._array;

  if (vehicles.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'logistics_fleet_no_data',
      title: 'Fleet Intelligence Building',
      body: 'No fleet vehicles found. Utilization analysis will begin once fleet data is available.',
      severity: 'info',
    }];
  }

  // Status breakdown
  const statusMap = {};
  for (const v of vehicles) {
    const status = (v.status || 'unknown').toLowerCase();
    if (!statusMap[status]) statusMap[status] = 0;
    statusMap[status]++;
  }

  const activeStatuses = ['active', 'in use', 'in_use', 'deployed', 'on_route', 'on route'];
  const maintenanceStatuses = ['maintenance', 'in_maintenance', 'repair', 'servicing'];

  const activeCount = vehicles.filter(v =>
    activeStatuses.includes((v.status || '').toLowerCase())
  ).length;
  const maintenanceCount = vehicles.filter(v =>
    maintenanceStatuses.includes((v.status || '').toLowerCase())
  ).length;
  const idleCount = vehicles.length - activeCount - maintenanceCount;

  const utilizationRate = (activeCount / vehicles.length) * 100;

  // Maintenance overdue check (>90 days since last maintenance)
  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 90);

  const maintenanceOverdue = vehicles.filter(v =>
    v.last_maintenance && new Date(v.last_maintenance) < ninetyDaysAgo
    && activeStatuses.includes((v.status || '').toLowerCase())
  );

  // Vehicle type breakdown
  const typeBreakdown = {};
  for (const v of vehicles) {
    const type = v.vehicle_type || 'Unknown';
    if (!typeBreakdown[type]) typeBreakdown[type] = { total: 0, active: 0 };
    typeBreakdown[type].total++;
    if (activeStatuses.includes((v.status || '').toLowerCase())) {
      typeBreakdown[type].active++;
    }
  }

  const aiBody = await generateInsight(
    `Analyze fleet utilization rate and identify optimization opportunities. Flag maintenance concerns.`,
    {
      totalVehicles: vehicles.length,
      activeCount,
      maintenanceCount,
      idleCount,
      utilizationRate: Math.round(utilizationRate * 10) / 10,
      maintenanceOverdueCount: maintenanceOverdue.length,
      typeBreakdown,
    }
  );

  const severity = utilizationRate < 50 ? 'warning'
    : maintenanceOverdue.length > 3 ? 'warning'
    : utilizationRate > 90 ? 'info'
    : 'positive';

  insights.push({
    vertical: VERTICAL,
    insight_type: 'summary',
    insight_key: 'logistics_fleet_utilization',
    title: `Fleet Utilization at ${Math.round(utilizationRate)}% — ${activeCount} of ${vehicles.length} Vehicles Active`,
    body: aiBody,
    severity,
    confidence: 0.8,
    data_snapshot: {
      totalVehicles: vehicles.length,
      activeCount,
      maintenanceCount,
      idleCount,
      utilizationRate: Math.round(utilizationRate * 10) / 10,
      maintenanceOverdue: maintenanceOverdue.length,
      typeBreakdown,
    },
    action_label: 'Manage Fleet',
    action_url: '/logistics/fleet',
  });

  // Separate maintenance overdue warning
  if (maintenanceOverdue.length > 0) {
    insights.push({
      vertical: VERTICAL,
      insight_type: 'risk',
      insight_key: 'logistics_fleet_maintenance_overdue',
      title: `${maintenanceOverdue.length} Vehicle${maintenanceOverdue.length > 1 ? 's' : ''} Overdue for Maintenance`,
      body: `${maintenanceOverdue.length} active vehicle${maintenanceOverdue.length > 1 ? 's have' : ' has'} not had maintenance in over 90 days. This increases breakdown risk and may affect delivery reliability.`,
      severity: maintenanceOverdue.length > 5 ? 'critical' : 'warning',
      confidence: 0.85,
      data_snapshot: {
        overdueVehicles: maintenanceOverdue.slice(0, 10).map(v => ({
          vehicleId: v.vehicle_id,
          type: v.vehicle_type,
          lastMaintenance: v.last_maintenance,
        })),
      },
      action_label: 'Schedule Maintenance',
      action_url: '/logistics/fleet?filter=maintenance-due',
    });
  }

  return insights;
}

// ────────────────────────────────────────────────────────
// Route Optimization
// Identifies the longest and most time-consuming routes
// and suggests optimization opportunities.
// ────────────────────────────────────────────────────────
async function routeOptimization(companyId) {
  const insights = [];

  const routeRes = await powerSync.execute(
    `SELECT route_name, origin, destination, distance, estimated_time
     FROM univ_routes
     WHERE company_id = ?
     ORDER BY distance DESC`,
    [companyId]
  );
  const routes = routeRes.rows._array;

  if (routes.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'logistics_routes_no_data',
      title: 'Route Intelligence Building',
      body: 'No route data found. Optimization analysis will begin once routes are configured.',
      severity: 'info',
    }];
  }

  // Calculate averages
  const totalDistance = routes.reduce((s, r) => s + Number(r.distance || 0), 0);
  const totalTime = routes.reduce((s, r) => s + Number(r.estimated_time || 0), 0);
  const avgDistance = totalDistance / routes.length;
  const avgTime = totalTime / routes.length;

  // Flag routes significantly above average (>1.5x avg distance or time)
  const longRoutes = routes.filter(r =>
    Number(r.distance || 0) > avgDistance * 1.5 || Number(r.estimated_time || 0) > avgTime * 1.5
  );

  // Efficiency metric: distance per unit time
  const routeEfficiency = routes.map(r => {
    const dist = Number(r.distance || 0);
    const time = Number(r.estimated_time || 0);
    return {
      name: r.route_name,
      origin: r.origin,
      destination: r.destination,
      distance: dist,
      estimatedTime: time,
      speedRatio: time > 0 ? dist / time : 0,
    };
  });

  // Duplicate corridors (same origin-destination served by multiple routes)
  const corridorMap = {};
  for (const r of routes) {
    const key = [r.origin, r.destination].sort().join('↔');
    if (!corridorMap[key]) corridorMap[key] = [];
    corridorMap[key].push(r.route_name);
  }
  const duplicateCorridors = Object.entries(corridorMap)
    .filter(([_, names]) => names.length > 1)
    .map(([corridor, names]) => ({ corridor, routeCount: names.length, routes: names }));

  if (longRoutes.length === 0 && duplicateCorridors.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'positive',
      insight_key: 'logistics_routes_optimized',
      title: 'Routes Well-Optimized',
      body: `All ${routes.length} routes are within normal distance and time parameters. Average distance: ${Math.round(avgDistance)} units, average time: ${Math.round(avgTime)} units.`,
      severity: 'positive',
      confidence: 0.7,
    }];
  }

  const aiBody = await generateInsight(
    `Analyze route efficiency and suggest optimization opportunities. Focus on outlier routes and potential consolidation.`,
    {
      totalRoutes: routes.length,
      averageDistance: Math.round(avgDistance * 10) / 10,
      averageTime: Math.round(avgTime * 10) / 10,
      longRoutes: longRoutes.map(r => ({
        name: r.route_name,
        origin: r.origin,
        destination: r.destination,
        distance: Number(r.distance),
        estimatedTime: Number(r.estimated_time),
      })),
      duplicateCorridors,
    }
  );

  insights.push({
    vertical: VERTICAL,
    insight_type: 'recommendation',
    insight_key: 'logistics_route_optimization',
    title: `${longRoutes.length} Route${longRoutes.length !== 1 ? 's' : ''} Above Average Distance — Optimization Available`,
    body: aiBody,
    severity: longRoutes.length > 5 ? 'warning' : 'info',
    confidence: 0.65,
    data_snapshot: {
      totalRoutes: routes.length,
      avgDistance: Math.round(avgDistance * 10) / 10,
      avgTime: Math.round(avgTime * 10) / 10,
      longRoutes: longRoutes.slice(0, 10).map(r => ({
        name: r.route_name,
        distance: Number(r.distance),
        estimatedTime: Number(r.estimated_time),
      })),
      duplicateCorridors,
    },
    action_label: 'View Routes',
    action_url: '/logistics/routes',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// Warehouse Capacity Monitoring
// Flags warehouses approaching or exceeding capacity and
// identifies underutilized facilities for rebalancing.
// ────────────────────────────────────────────────────────
async function warehouseCapacity(companyId) {
  const insights = [];

  const whRes = await powerSync.execute(
    `SELECT warehouse_name, location, capacity, current_stock
     FROM univ_warehouses
     WHERE company_id = ?`,
    [companyId]
  );
  const warehouses = whRes.rows._array;

  if (warehouses.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'logistics_warehouse_no_data',
      title: 'Warehouse Intelligence Building',
      body: 'No warehouse data found. Capacity monitoring will begin once warehouse records are available.',
      severity: 'info',
    }];
  }

  // Calculate utilization for each warehouse
  const warehouseMetrics = warehouses.map(w => {
    const capacity = Number(w.capacity || 0);
    const stock = Number(w.current_stock || 0);
    const utilization = capacity > 0 ? (stock / capacity) * 100 : 0;
    return {
      name: w.warehouse_name,
      location: w.location,
      capacity,
      currentStock: stock,
      utilization: Math.round(utilization * 10) / 10,
    };
  });

  // Critical: >90% capacity
  const critical = warehouseMetrics.filter(w => w.utilization > 90);
  // Warning: >75% capacity
  const highUsage = warehouseMetrics.filter(w => w.utilization > 75 && w.utilization <= 90);
  // Underutilized: <25% capacity
  const underutilized = warehouseMetrics.filter(w => w.utilization < 25 && w.capacity > 0);

  const avgUtilization = warehouseMetrics.reduce((s, w) => s + w.utilization, 0) / warehouseMetrics.length;

  if (critical.length === 0 && highUsage.length === 0 && underutilized.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'positive',
      insight_key: 'logistics_warehouse_balanced',
      title: 'Warehouse Capacity Balanced',
      body: `All ${warehouses.length} warehouses are within optimal capacity range (25–75%). Average utilization: ${Math.round(avgUtilization)}%.`,
      severity: 'positive',
      confidence: 0.85,
    }];
  }

  const aiBody = await generateInsight(
    `Analyze warehouse capacity distribution. Flag overflow risks and suggest rebalancing strategies between facilities.`,
    {
      totalWarehouses: warehouses.length,
      averageUtilization: Math.round(avgUtilization * 10) / 10,
      criticalWarehouses: critical,
      highUsageWarehouses: highUsage,
      underutilizedWarehouses: underutilized,
    }
  );

  // Main capacity insight
  if (critical.length > 0) {
    insights.push({
      vertical: VERTICAL,
      insight_type: 'risk',
      insight_key: 'logistics_warehouse_critical',
      title: `${critical.length} Warehouse${critical.length > 1 ? 's' : ''} Near Full Capacity`,
      body: aiBody,
      severity: 'critical',
      confidence: 0.9,
      data_snapshot: {
        totalWarehouses: warehouses.length,
        avgUtilization: Math.round(avgUtilization * 10) / 10,
        criticalWarehouses: critical,
        highUsageWarehouses: highUsage,
      },
      action_label: 'Manage Warehouses',
      action_url: '/logistics/warehouses',
    });
  } else if (highUsage.length > 0) {
    insights.push({
      vertical: VERTICAL,
      insight_type: 'warning',
      insight_key: 'logistics_warehouse_high_usage',
      title: `${highUsage.length} Warehouse${highUsage.length > 1 ? 's' : ''} Above 75% Capacity`,
      body: aiBody,
      severity: 'warning',
      confidence: 0.8,
      data_snapshot: {
        totalWarehouses: warehouses.length,
        avgUtilization: Math.round(avgUtilization * 10) / 10,
        highUsageWarehouses: highUsage,
      },
      action_label: 'Manage Warehouses',
      action_url: '/logistics/warehouses',
    });
  }

  // Separate insight for underutilized warehouses (rebalancing opportunity)
  if (underutilized.length > 0 && (critical.length > 0 || highUsage.length > 0)) {
    const totalSpareCapacity = underutilized.reduce((s, w) => s + (w.capacity - w.currentStock), 0);
    insights.push({
      vertical: VERTICAL,
      insight_type: 'recommendation',
      insight_key: 'logistics_warehouse_rebalance',
      title: `Rebalancing Opportunity — ${underutilized.length} Underutilized Warehouse${underutilized.length > 1 ? 's' : ''}`,
      body: `${underutilized.length} warehouse${underutilized.length > 1 ? 's are' : ' is'} below 25% utilization with ${totalSpareCapacity} units of spare capacity. Consider redistributing stock from near-full facilities.`,
      severity: 'info',
      confidence: 0.75,
      data_snapshot: {
        underutilized,
        totalSpareCapacity,
      },
      action_label: 'Plan Rebalancing',
      action_url: '/logistics/warehouses',
    });
  }

  return insights;
}

// ────────────────────────────────────────────────────────
// Main Export
// ────────────────────────────────────────────────────────
export default async function logisticsEngine(companyId) {
  const results = await Promise.allSettled([
    deliveryDelayPrediction(companyId),
    fleetUtilization(companyId),
    routeOptimization(companyId),
    warehouseCapacity(companyId),
  ]);

  const insights = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      insights.push(...result.value);
    }
  }

  return insights;
}
