import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompanyId } from '../useCompanyId';

/**
 * Hook for managing routes with optimization capabilities
 */
export function useRoutes(filters = {}) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['routes', companyId, filters],
    queryFn: async () => {
      if (!companyId) return [];
      const routes = await base44.entities.route.filter({
        company_id: companyId,
        ...filters
      });
      return routes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    enabled: !!companyId});
}

/**
 * Auto-assignment engine: intelligently assigns shipments to vehicles/drivers
 * considering capacity, location, availability, and efficiency metrics
 */
export function useAutoAssignment() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shipmentIds, optimizationStrategy = 'cost' }) => {
      if (!companyId) throw new Error('Company context missing');

      // Fetch shipments
      const shipments = await Promise.all(
        shipmentIds.map(id => 
          base44.entities.LegalCase.filter({
            company_id: companyId,
            case_type: 'shipment',
            id
          })
        )
      ).then(results => results.flat());

      // Fetch available vehicles
      const vehicles = await base44.entities.LegalCase.filter({
        company_id: companyId,
        case_type: 'vehicle'
      });

      // Fetch drivers
      const drivers = await base44.entities.LegalCase.filter({
        company_id: companyId,
        case_type: 'driver'
      });

      // Run optimization algorithm
      const assignments = optimizeAssignments(
        shipments,
        vehicles,
        drivers,
        optimizationStrategy
      );

      // Create routes from assignments
      const routes = [];
      for (const [vehicleId, assignedShipments] of Object.entries(assignments)) {
        const route = {
          id: crypto.randomUUID(),
          vehicle_id: vehicleId,
          shipment_ids: assignedShipments,
          route_status: 'planned',
          company_id: companyId,
          created_at: new Date().toISOString()
        };
        routes.push(route);
      }

      return routes;
    },
    onSuccess: (routes) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    }
  });
}

/**
 * Core optimization algorithm using nearest-neighbor with constraints
 */
function optimizeAssignments(shipments, vehicles, drivers, strategy) {
  const assignments = {};

  shipments.forEach(shipment => {
    const shipmentData = typeof shipment.notes === 'string' ? JSON.parse(shipment.notes) : shipment.notes;
    
    // Find best vehicle based on capacity and location
    let bestVehicle = null;
    let bestScore = Infinity;

    vehicles.forEach(vehicle => {
      const vehicleData = typeof vehicle.notes === 'string' ? JSON.parse(vehicle.notes) : vehicle.notes;
      if (vehicleData.status !== 'Available') return;

      let score = 0;

      // Factor 1: Capacity utilization (prefer vehicles with available capacity)
      const capacityUsed = vehicleData.currentLoad || 0;
      const capacity = parseFloat(vehicleData.capacity) || 1000;
      const remainingCapacity = capacity - capacityUsed;
      const shipmentWeight = parseFloat(shipmentData.weight) || 0;

      if (shipmentWeight > remainingCapacity) {
        score += 10000; // Penalty for overweight
      } else {
        score += (remainingCapacity - shipmentWeight) * 0.1; // Prefer fuller vehicles
      }

      // Factor 2: Distance from origin
      const distance = calculateDistance(
        vehicleData.currentLocation || shipmentData.origin,
        shipmentData.origin
      );
      score += distance * 0.5;

      // Factor 3: Efficiency metrics (prefer high-performing drivers)
      const driver = drivers.find(d => {
        const dd = typeof d.notes === 'string' ? JSON.parse(d.notes) : d.notes;
        return dd.id === vehicleData.currentDriver;
      });
      
      if (driver) {
        const driverData = typeof driver.notes === 'string' ? JSON.parse(driver.notes) : driver.notes;
        const driverRating = parseFloat(driverData.rating) || 3;
        score -= (driverRating * 100); // Higher rating = lower score (better)
      }

      if (strategy === 'speed') {
        score -= 500; // All vehicles equally good for speed optimization
      }

      if (score < bestScore) {
        bestScore = score;
        bestVehicle = vehicle.id;
      }
    });

    if (bestVehicle) {
      if (!assignments[bestVehicle]) {
        assignments[bestVehicle] = [];
      }
      assignments[bestVehicle].push(shipment.id);
    }
  });

  return assignments;
}

/**
 * Haversine formula for distance calculation
 */
function calculateDistance(location1, location2) {
  if (!location1 || !location2) return 0;

  const lat1 = parseFloat(location1.latitude || 0);
  const lon1 = parseFloat(location1.longitude || 0);
  const lat2 = parseFloat(location2.latitude || 0);
  const lon2 = parseFloat(location2.longitude || 0);

  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Mutation for updating route status and progress
 */
export function useMutateRoute() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async ({ routeId, updates }) => {
      // Update route in database
      const updated = await base44.entities.route.update(routeId, {
        ...updates,
        updated_at: new Date().toISOString()
      });
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    }
  });
}
