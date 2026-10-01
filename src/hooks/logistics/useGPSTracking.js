import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompanyId } from '../useCompanyId';
import { useEffect, useRef } from 'react';

/**
 * Hook for real-time GPS tracking of shipments/vehicles
 * Automatically updates location and calculates metrics
 */
export function useGPSTracking(shipmentId, pollIntervalMs = 5000) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['gps_tracking', shipmentId],
    queryFn: async () => {
      if (!shipmentId) return null;
      
      const tracking = await base44.entities.gps_tracking.filter({
        shipment_id: shipmentId
      });

      if (tracking.length === 0) return null;

      // Get latest location
      const latest = tracking.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      )[0];

      return {
        id: latest.id,
        latitude: latest.latitude,
        longitude: latest.longitude,
        speed: latest.speed_kmh,
        heading: latest.heading,
        timestamp: latest.timestamp,
        accuracy: latest.accuracy_meters,
        battery: latest.battery_level,
        altitude: latest.altitude
      };
    },
    enabled: !!shipmentId,
    refetchInterval: pollIntervalMs,
    staleTime: Math.min(pollIntervalMs - 1000, 3000)
  });
}

/**
 * Hook for live driver location tracking with WebSocket support
 */
export function useDriverTracking(driverId) {
  const companyId = useCompanyId();
  const ws = useRef(null);

  return useQuery({
    queryKey: ['driver_tracking', driverId],
    queryFn: async () => {
      if (!driverId) return null;

      // Initial location fetch
      const tracking = await base44.entities.gps_tracking.filter({
        driver_id: driverId
      });

      if (tracking.length === 0) return null;

      const latest = tracking.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      )[0];

      return {
        id: latest.id,
        latitude: latest.latitude,
        longitude: latest.longitude,
        speed: latest.speed_kmh,
        heading: latest.heading,
        timestamp: latest.timestamp,
        accuracy: latest.accuracy_meters
      };
    },
    enabled: !!driverId,
    refetchInterval: 5000
  });
}

/**
 * Hook for recording GPS location from device (mobile)
 */
export function useRecordGPSLocation() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async ({ 
      shipmentId, 
      driverId, 
      vehicleId, 
      latitude, 
      longitude, 
      speed = 0,
      heading = 0,
      altitude = 0,
      accuracy = 0,
      batteryLevel = null
    }) => {
      const record = {
        company_id: companyId,
        shipment_id: shipmentId,
        driver_id: driverId,
        vehicle_id: vehicleId,
        latitude,
        longitude,
        speed_kmh: speed,
        heading,
        altitude,
        accuracy_meters: accuracy,
        battery_level: batteryLevel,
        source: 'mobile',
        timestamp: new Date().toISOString()
      };

      // Save to database
      const saved = await base44.entities.gps_tracking.create(record);
      return saved;
    },
    onSuccess: (data) => {
      // Invalidate tracking queries
      queryClient.invalidateQueries({ queryKey: ['gps_tracking'] });
      queryClient.invalidateQueries({ queryKey: ['driver_tracking'] });
    }
  });
}

/**
 * Hook for tracking historical location trail (last N points)
 */
export function useLocationTrail(shipmentId, hoursBack = 1) {
  const companyId = useCompanyId();
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  return useQuery({
    queryKey: ['location_trail', shipmentId, hoursBack],
    queryFn: async () => {
      if (!shipmentId) return [];

      const tracking = await base44.entities.gps_tracking.filter({
        shipment_id: shipmentId
      });

      return tracking
        .filter(t => new Date(t.timestamp) >= cutoffTime)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map(t => ({
          latitude: t.latitude,
          longitude: t.longitude,
          timestamp: t.timestamp,
          speed: t.speed_kmh
        }));
    },
    enabled: !!shipmentId,
    refetchInterval: 10000
  });
}

/**
 * Hook for calculating live ETA based on current location and route
 */
export function useLiveETA(shipmentId, destinationLat, destinationLon) {
  const currentLocation = useGPSTracking(shipmentId);

  return useQuery({
    queryKey: ['live_eta', shipmentId],
    queryFn: async () => {
      if (!currentLocation.data) return null;

      const { latitude, longitude, speed } = currentLocation.data;
      
      // Calculate distance to destination
      const distance = calculateDistance(
        { latitude, longitude },
        { latitude: destinationLat, longitude: destinationLon }
      );

      // Estimate time based on current speed
      const speedKmh = Math.max(speed || 30, 30); // Min 30 km/h assumption
      const etaHours = distance / speedKmh;
      const etaMinutes = Math.round(etaHours * 60);
      const estimatedArrival = new Date(
        Date.now() + etaMinutes * 60 * 1000
      );

      return {
        distanceRemaining: distance,
        etaMinutes,
        estimatedArrival,
        currentSpeed: speed,
        reliability: 'medium' // Can be improved with traffic data
      };
    },
    enabled: !!currentLocation.data,
    refetchInterval: 10000
  });
}

/**
 * Haversine formula for distance calculation
 */
function calculateDistance(location1, location2) {
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
