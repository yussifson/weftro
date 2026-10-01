import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompanyId } from '../useCompanyId';

/**
 * Hook for capturing Proof of Delivery (POD)
 * Supports signature, photos, video, temperature, condition notes
 */
export function useCapturePOD() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async ({
      shipmentId,
      driverId,
      recipientName,
      recipientPhone,
      recipientEmail,
      signatureUrl,
      photoUrls = [],
      videoUrl,
      deliveryNotes,
      temperature,
      humidity,
      conditionNotes,
      isDamaged = false,
      damageDescription = null
    }) => {
      const pod = {
        company_id: companyId,
        shipment_id: shipmentId,
        driver_id: driverId,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        recipient_email: recipientEmail,
        signature_url: signatureUrl,
        pod_photos: photoUrls,
        pod_video_url: videoUrl,
        delivery_notes: deliveryNotes,
        temperature_celsius: temperature,
        humidity_percent: humidity,
        condition_notes: conditionNotes,
        is_damaged: isDamaged,
        damage_description: damageDescription,
        pod_timestamp: new Date().toISOString()
      };

      const saved = await base44.entities.pod_records.create(pod);

      // Update shipment status to Delivered
      const shipment = await base44.entities.LegalCase.filter({
        id: shipmentId
      });

      if (shipment.length > 0) {
        const shipmentData = typeof shipment[0].notes === 'string' 
          ? JSON.parse(shipment[0].notes) 
          : shipment[0].notes;

        await base44.entities.LegalCase.update(shipmentId, {
          status: isDamaged ? 'Delivered with Damage' : 'Delivered',
          notes: JSON.stringify({
            ...shipmentData,
            pod_id: saved.id
          })
        });
      }

      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['pod_records'] });
    }
  });
}

/**
 * Hook for fetching POD records for a shipment
 */
export function usePODRecord(shipmentId) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['pod_record', shipmentId],
    queryFn: async () => {
      if (!shipmentId) return null;

      const records = await base44.entities.pod_records.filter({
        shipment_id: shipmentId
      });

      return records.length > 0 ? records[0] : null;
    },
    enabled: !!shipmentId
  });
}

/**
 * Hook for delivery window management
 */
export function useDeliveryWindows(shipmentId) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['delivery_windows', shipmentId],
    queryFn: async () => {
      if (!shipmentId) return [];

      return await base44.entities.delivery_windows.filter({
        shipment_id: shipmentId
      });
    },
    enabled: !!shipmentId
  });
}

/**
 * Hook for setting delivery window preferences
 */
export function useSetDeliveryWindow() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async ({
      shipmentId,
      preferredDate,
      timeWindowStart,
      timeWindowEnd,
      customerTimezone = 'UTC',
      isFlexible = false,
      penaltyPerHour = 0
    }) => {
      const window = {
        company_id: companyId,
        shipment_id: shipmentId,
        preferred_date: preferredDate,
        time_window_start: timeWindowStart,
        time_window_end: timeWindowEnd,
        customer_timezone: customerTimezone,
        is_flexible: isFlexible,
        penalty_per_hour: penaltyPerHour,
        created_at: new Date().toISOString()
      };

      return await base44.entities.delivery_windows.create(window);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_windows'] });
    }
  });
}

/**
 * Hook for SLA tracking and enforcement
 */
export function useSLATracking(shipmentId) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['sla_tracking', shipmentId],
    queryFn: async () => {
      if (!shipmentId) return [];

      const slaRecords = await base44.entities.sla_tracking.filter({
        shipment_id: shipmentId
      });

      return slaRecords.map(sla => ({
        ...sla,
        isViolated: new Date(sla.expected_completion) < new Date()
      }));
    },
    enabled: !!shipmentId
  });
}

/**
 * Hook for creating and updating SLA records
 */
export function useMutateSLA() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async ({
      shipmentId,
      slaType,
      slaTarget,
      expectedCompletion,
      penaltyAmount = 0
    }) => {
      const sla = {
        company_id: companyId,
        shipment_id: shipmentId,
        sla_type: slaType, // delivery_time, delivery_window, temperature_range
        sla_target: slaTarget,
        expected_completion: expectedCompletion,
        is_breached: new Date(expectedCompletion) < new Date(),
        penalty_amount: penaltyAmount,
        created_at: new Date().toISOString()
      };

      return await base44.entities.sla_tracking.create(sla);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla_tracking'] });
    }
  });
}

/**
 * Hook for checking SLA compliance and calculating penalties
 */
export function useSLACompliance(shipmentId) {
  const slaRecords = useSLATracking(shipmentId);

  return useQuery({
    queryKey: ['sla_compliance', shipmentId],
    queryFn: async () => {
      if (!slaRecords.data || slaRecords.data.length === 0) {
        return {
          isCompliant: true,
          breaches: [],
          totalPenalty: 0
        };
      }

      const breaches = slaRecords.data.filter(sla => sla.is_breached);
      const totalPenalty = breaches.reduce((sum, b) => sum + (b.penalty_amount || 0), 0);

      return {
        isCompliant: breaches.length === 0,
        breaches,
        totalPenalty,
        breachPercentage: (breaches.length / slaRecords.data.length) * 100
      };
    },
    enabled: !!slaRecords.data
  });
}

/**
 * Hook for on-time delivery metrics
 */
export function useOnTimeDeliveryMetrics(shipmentIds = []) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['ontime_metrics', shipmentIds],
    queryFn: async () => {
      if (shipmentIds.length === 0) return null;

      const shipments = await Promise.all(
        shipmentIds.map(id => base44.entities.LegalCase.filter({ id }))
      );

      let onTimeCount = 0;
      let lateCount = 0;
      let totalDeliveries = 0;

      shipments.forEach(results => {
        if (results.length > 0) {
          const shipment = results[0];
          const shipmentData = typeof shipment.notes === 'string' 
            ? JSON.parse(shipment.notes) 
            : shipment.notes;

          if (shipment.status === 'Delivered') {
            totalDeliveries++;
            const estimatedDate = new Date(shipmentData.estimatedDelivery);
            const deliveredDate = new Date(shipment.updated_date || shipment.updated_at);
            
            if (deliveredDate <= estimatedDate) {
              onTimeCount++;
            } else {
              lateCount++;
            }
          }
        }
      });

      return {
        onTimeCount,
        lateCount,
        totalDeliveries,
        onTimePercentage: totalDeliveries > 0 ? (onTimeCount / totalDeliveries) * 100 : 0,
        latePercentage: totalDeliveries > 0 ? (lateCount / totalDeliveries) * 100 : 0
      };
    },
    enabled: shipmentIds.length > 0
  });
}
