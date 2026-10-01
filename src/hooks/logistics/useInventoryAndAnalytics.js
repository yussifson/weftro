import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompanyId } from '../useCompanyId';

/**
 * Hook for recording inventory movements (inbound/outbound sync)
 */
export function useRecordInventoryMovement() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async ({
      warehouseId,
      shipmentId,
      movementType, // inbound, outbound, adjustment, return
      sku,
      quantityChange,
      notes = ''
    }) => {
      const movement = {
        company_id: companyId,
        warehouse_id: warehouseId,
        shipment_id: shipmentId,
        movement_type: movementType,
        sku,
        quantity_change: quantityChange,
        timestamp: new Date().toISOString(),
        notes,
        recorded_by: companyId
      };

      const saved = await base44.entities.inventory_movements.create(movement);

      // Update warehouse inventory (decrement for outbound)
      if (movementType === 'outbound') {
        const warehouse = await base44.entities.LegalCase.filter({
          id: warehouseId,
          case_type: 'warehouse'
        });

        if (warehouse.length > 0) {
          const whData = typeof warehouse[0].notes === 'string'
            ? JSON.parse(warehouse[0].notes)
            : warehouse[0].notes;

          const newUsedCapacity = (parseInt(whData.usedCapacity) || 0) + quantityChange;
          await base44.entities.LegalCase.update(warehouseId, {
            notes: JSON.stringify({
              ...whData,
              usedCapacity: newUsedCapacity.toString()
            })
          });
        }
      }

      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse_capacity'] });
    }
  });
}

/**
 * Hook for fetching warehouse inventory levels
 */
export function useWarehouseInventory(warehouseId) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['warehouse_inventory', warehouseId],
    queryFn: async () => {
      if (!warehouseId) return null;

      const warehouse = await base44.entities.LegalCase.filter({
        id: warehouseId,
        case_type: 'warehouse'
      });

      if (warehouse.length === 0) return null;

      const whData = typeof warehouse[0].notes === 'string'
        ? JSON.parse(warehouse[0].notes)
        : warehouse[0].notes;

      const capacity = parseInt(whData.capacity) || 0;
      const used = parseInt(whData.usedCapacity) || 0;
      const available = capacity - used;
      const utilization = capacity > 0 ? (used / capacity) * 100 : 0;

      // Fetch recent movements
      const movements = await base44.entities.inventory_movements.filter({
        warehouse_id: warehouseId
      });

      return {
        id: warehouseId,
        name: whData.warehouseName,
        location: whData.location,
        totalCapacity: capacity,
        usedCapacity: used,
        availableCapacity: available,
        utilizationPercent: utilization,
        recentMovements: movements
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 10)
      };
    },
    enabled: !!warehouseId
  });
}

/**
 * Hook for driver performance metrics
 */
export function useDriverMetrics(driverId, dateRange = 'month') {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['driver_metrics', driverId, dateRange],
    queryFn: async () => {
      if (!driverId) return null;

      // Fetch driver metrics record
      const metrics = await base44.entities.driver_metrics.filter({
        driver_id: driverId
      });

      if (metrics.length === 0) return getDefaultDriverMetrics();

      const latest = metrics.sort((a, b) => 
        new Date(b.metric_date) - new Date(a.metric_date)
      )[0];

      return {
        driverId,
        totalDeliveries: latest.total_deliveries || 0,
        successfulDeliveries: latest.successful_deliveries || 0,
        failedDeliveries: latest.failed_deliveries || 0,
        onTimeDeliveries: latest.on_time_deliveries || 0,
        slaBreaches: latest.sla_breaches || 0,
        avgDeliveryTime: latest.avg_delivery_time_minutes || 0,
        totalDistance: latest.total_distance_km || 0,
        fuelEfficiency: latest.fuel_efficiency_km_per_liter || 0,
        safetyIncidents: latest.safety_incidents || 0,
        customerRating: latest.customer_rating || 3.5,
        efficiencyScore: latest.efficiency_score || 0,
        successRate: latest.total_deliveries > 0 
          ? (latest.successful_deliveries / latest.total_deliveries) * 100 
          : 0,
        onTimeRate: latest.total_deliveries > 0
          ? (latest.on_time_deliveries / latest.total_deliveries) * 100
          : 0
      };
    },
    enabled: !!driverId
  });
}

/**
 * Hook for fleet performance metrics
 */
export function useFleetMetrics(vehicleId, dateRange = 'month') {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['fleet_metrics', vehicleId, dateRange],
    queryFn: async () => {
      if (!vehicleId) return null;

      const metrics = await base44.entities.fleet_metrics.filter({
        vehicle_id: vehicleId
      });

      if (metrics.length === 0) return getDefaultFleetMetrics();

      const latest = metrics.sort((a, b) => 
        new Date(b.metric_date) - new Date(a.metric_date)
      )[0];

      return {
        vehicleId,
        totalTrips: latest.total_trips || 0,
        totalDistance: latest.total_distance_km || 0,
        totalFuelConsumed: latest.total_fuel_consumed || 0,
        maintenanceHours: latest.maintenance_hours || 0,
        operationalEfficiency: latest.operational_efficiency || 0,
        utilizationRate: latest.utilization_rate || 0,
        vehicleConditionScore: latest.vehicle_condition_score || 0
      };
    },
    enabled: !!vehicleId
  });
}

/**
 * Hook for company-wide logistics analytics dashboard
 */
export function useLogisticsAnalytics(filters = {}) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['logistics_analytics', companyId, filters],
    queryFn: async () => {
      if (!companyId) return null;

      // Fetch all shipments
      const shipments = await base44.entities.LegalCase.filter({
        company_id: companyId,
        case_type: 'shipment'
      });

      // Calculate metrics
      const totalShipments = shipments.length;
      const delivered = shipments.filter(s => s.status === 'Delivered').length;
      const inTransit = shipments.filter(s => s.status === 'In Transit').length;
      const failed = shipments.filter(s => s.status === 'Failed').length;
      const pending = shipments.filter(s => s.status === 'Pending').length;

      const deliveryRate = totalShipments > 0 ? (delivered / totalShipments) * 100 : 0;

      // Fetch all drivers for performance average
      const drivers = await base44.entities.LegalCase.filter({
        company_id: companyId,
        case_type: 'driver'
      });

      const driverCount = drivers.length;

      // Fetch all vehicles
      const vehicles = await base44.entities.LegalCase.filter({
        company_id: companyId,
        case_type: 'vehicle'
      });

      const vehicleCount = vehicles.length;
      const availableVehicles = vehicles.filter(v => {
        const vData = typeof v.notes === 'string' ? JSON.parse(v.notes) : v.notes;
        return vData.status === 'Available';
      }).length;

      // Calculate weekly trends
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyTrends = days.map(day => ({ date: day, delivered: 0, failed: 0, pending: 0 }));

      shipments.forEach(s => {
        const sData = typeof s.notes === 'string' ? JSON.parse(s.notes) : s.notes;
        const dateStr = s.date || sData?.date || s.created_at;
        if (dateStr) {
          const dateObj = new Date(dateStr);
          if (!isNaN(dateObj.getTime())) {
            const dayIdx = dateObj.getDay();
            if (s.status === 'Delivered') weeklyTrends[dayIdx].delivered++;
            else if (s.status === 'Failed') weeklyTrends[dayIdx].failed++;
            else weeklyTrends[dayIdx].pending++;
          }
        }
      });

      return {
        totalShipments,
        deliveredShipments: delivered,
        inTransitShipments: inTransit,
        failedShipments: failed,
        pendingShipments: pending,
        deliveryRate,
        totalDrivers: driverCount,
        totalVehicles: vehicleCount,
        availableVehicles,
        vehicleUtilization: vehicleCount > 0 ? ((vehicleCount - availableVehicles) / vehicleCount) * 100 : 0,
        weeklyTrends
      };
    },
    enabled: !!companyId
  });
}

/**
 * Hook for calculating on-time delivery percentage
 */
export function useOnTimeDeliveryPercentage(daysBack = 30) {
  const companyId = useCompanyId();
  const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  return useQuery({
    queryKey: ['ontime_percentage', companyId, daysBack],
    queryFn: async () => {
      if (!companyId) return 0;

      const shipments = await base44.entities.LegalCase.filter({
        company_id: companyId,
        case_type: 'shipment'
      });

      let onTimeCount = 0;
      let totalDelivered = 0;

      shipments.forEach(s => {
        if (s.status === 'Delivered' && new Date(s.updated_at) >= cutoffDate) {
          totalDelivered++;
          const data = typeof s.notes === 'string' ? JSON.parse(s.notes) : s.notes;
          const estimatedDate = new Date(data.estimatedDelivery);
          const deliveredDate = new Date(s.updated_at);

          if (deliveredDate <= estimatedDate) {
            onTimeCount++;
          }
        }
      });

      return totalDelivered > 0 ? (onTimeCount / totalDelivered) * 100 : 0;
    },
    enabled: !!companyId
  });
}

// Default metrics objects
function getDefaultDriverMetrics() {
  return {
    driverId: null,
    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    onTimeDeliveries: 0,
    slaBreaches: 0,
    avgDeliveryTime: 0,
    totalDistance: 0,
    fuelEfficiency: 0,
    safetyIncidents: 0,
    customerRating: 3.5,
    efficiencyScore: 0,
    successRate: 0,
    onTimeRate: 0
  };
}

function getDefaultFleetMetrics() {
  return {
    vehicleId: null,
    totalTrips: 0,
    totalDistance: 0,
    totalFuelConsumed: 0,
    maintenanceHours: 0,
    operationalEfficiency: 0,
    utilizationRate: 0,
    vehicleConditionScore: 0
  };
}
