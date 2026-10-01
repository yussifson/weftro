import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompanyId } from '../useCompanyId';

/**
 * Hook for reporting incidents (damage, accidents, theft, etc.)
 */
export function useReportIncident() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async ({
      shipmentId,
      vehicleId,
      driverId,
      incidentType, // damage, accident, weather, theft, other
      severity, // critical, high, medium, low
      description,
      incidentLocation,
      incidentTimestamp,
      evidencePhotoUrls = [],
      evidenceVideoUrl,
      insuranceClaimId = null
    }) => {
      const incident = {
        company_id: companyId,
        shipment_id: shipmentId,
        vehicle_id: vehicleId,
        driver_id: driverId,
        incident_type: incidentType,
        severity,
        description,
        incident_location: incidentLocation,
        incident_timestamp: incidentTimestamp,
        reported_by: companyId,
        reported_at: new Date().toISOString(),
        evidence_photos: evidencePhotoUrls,
        evidence_video_url: evidenceVideoUrl,
        insurance_claim_id: insuranceClaimId,
        status: 'open'
      };

      const saved = await base44.entities.incident_reports.create(incident);

      // If critical incident, update shipment status
      if (severity === 'critical') {
        const shipment = await base44.entities.LegalCase.filter({
          company_id: companyId,
          id: typeof shipmentId === 'string' ? shipmentId : shipmentId?.id
        });

        if (shipment.length > 0) {
          const shipmentData = typeof shipment[0].notes === 'string'
            ? JSON.parse(shipment[0].notes)
            : shipment[0].notes;

          await base44.entities.LegalCase.update(shipmentId, {
            status: 'Failed',
            notes: JSON.stringify({
              ...shipmentData,
              incident_id: saved.id,
              failureReason: description
            })
          });
        }
      }

      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident_reports'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    }
  });
}

/**
 * Hook for fetching incidents for a shipment
 */
export function useShipmentIncidents(shipmentId) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['shipment_incidents', shipmentId],
    queryFn: async () => {
      if (!shipmentId) return [];

      const incidents = await base44.entities.incident_reports.filter({
        shipment_id: shipmentId
      });

      return incidents.sort((a, b) => 
        new Date(b.incident_timestamp) - new Date(a.incident_timestamp)
      );
    },
    enabled: !!shipmentId
  });
}

/**
 * Hook for all incidents in company
 */
export function useIncidentsList(filters = {}) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['incidents_list', companyId, filters],
    queryFn: async () => {
      if (!companyId) return [];

      const incidents = await base44.entities.incident_reports.filter({
        company_id: companyId,
        ...filters
      });

      return incidents.sort((a, b) => 
        new Date(b.reported_at) - new Date(a.reported_at)
      );
    },
    enabled: !!companyId
  });
}

/**
 * Hook for resolving/closing incidents
 */
export function useResolveIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      incidentId,
      resolutionNotes,
      status = 'resolved' // resolved, closed
    }) => {
      const resolved = await base44.entities.incident_reports.update(incidentId, {
        resolution_notes: resolutionNotes,
        resolved_at: new Date().toISOString(),
        status
      });

      return resolved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents_list'] });
      queryClient.invalidateQueries({ queryKey: ['shipment_incidents'] });
    }
  });
}

/**
 * Hook for requesting a return
 */
export function useRequestReturn() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async ({
      originalShipmentId,
      returnReason,
      customerId,
      returnLocation,
      pickupScheduledDate,
      notes = ''
    }) => {
      const returnOrder = {
        id: crypto.randomUUID(),
        company_id: companyId,
        original_shipment_id: typeof originalShipmentId === 'string' ? originalShipmentId : originalShipmentId?.id,
        return_reason: returnReason,
        return_status: 'requested',
        customer_id: typeof customerId === 'string' ? customerId : customerId?.id,
        return_location: returnLocation,
        pickup_scheduled_date: pickupScheduledDate,
        notes,
        created_at: new Date().toISOString()
      };

      return await base44.entities.return_orders.create(returnOrder);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return_orders'] });
    }
  });
}

/**
 * Hook for fetching return orders
 */
export function useReturnOrders(filters = {}) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['return_orders', companyId, filters],
    queryFn: async () => {
      if (!companyId) return [];

      const returns = await base44.entities.return_orders.filter({
        company_id: companyId,
        ...filters
      });

      return returns.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
    },
    enabled: !!companyId
  });
}

/**
 * Hook for approving/rejecting returns
 */
export function useMutateReturnOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      returnOrderId,
      action, // approve, reject
      refundAmount = null,
      notes = ''
    }) => {
      const status = action === 'approve' ? 'approved' : 'rejected';

      const updated = await base44.entities.return_orders.update(returnOrderId, {
        return_status: status,
        refund_amount: refundAmount,
        notes,
        updated_at: new Date().toISOString()
      });

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return_orders'] });
    }
  });
}

/**
 * Hook for creating return shipment (reverse logistics)
 */
export function useCreateReturnShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      returnOrderId,
      vehicleId,
      driverId,
      estimatedReturnDate
    }) => {
      const returnShipment = {
        id: crypto.randomUUID(),
        return_order_id: typeof returnOrderId === 'string' ? returnOrderId : returnOrderId?.id,
        vehicle_id: typeof vehicleId === 'string' ? vehicleId : vehicleId?.id,
        driver_id: typeof driverId === 'string' ? driverId : driverId?.id,
        shipment_status: 'pending',
        created_at: new Date().toISOString()
      };

      const saved = await base44.entities.return_shipments.create(returnShipment);

      // Update return order status
      await base44.entities.return_orders.update(returnOrderId, {
        return_status: 'in_transit',
        estimated_return_date: estimatedReturnDate,
        updated_at: new Date().toISOString()
      });

      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return_orders'] });
      queryClient.invalidateQueries({ queryKey: ['return_shipments'] });
    }
  });
}

/**
 * Hook for tracking return shipments
 */
export function useReturnShipmentTracking(returnOrderId) {
  return useQuery({
    queryKey: ['return_shipment_tracking', returnOrderId],
    queryFn: async () => {
      if (!returnOrderId) return null;

      const shipments = await base44.entities.return_shipments.filter({
        return_order_id: returnOrderId
      });

      if (shipments.length === 0) return null;

      const shipment = shipments[0];

      return {
        id: shipment.id,
        status: shipment.shipment_status,
        vehicleId: shipment.vehicle_id,
        driverId: shipment.driver_id,
        pickupTimestamp: shipment.pickup_timestamp,
        deliveryTimestamp: shipment.delivery_timestamp,
        podRecordId: shipment.pod_record_id
      };
    },
    enabled: !!returnOrderId,
    refetchInterval: 10000
  });
}

/**
 * Hook for return analytics (reverse logistics metrics)
 */
export function useReturnMetrics(daysBack = 30) {
  const companyId = useCompanyId();
  const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  return useQuery({
    queryKey: ['return_metrics', companyId, daysBack],
    queryFn: async () => {
      if (!companyId) return null;

      const returns = await base44.entities.return_orders.filter({
        company_id: companyId
      });

      const recentReturns = returns.filter(r => 
        new Date(r.created_at) >= cutoffDate
      );

      const statuses = {
        requested: 0,
        approved: 0,
        rejected: 0,
        in_transit: 0,
        received: 0,
        processed: 0
      };

      let totalRefundAmount = 0;

      recentReturns.forEach(r => {
        if (statuses.hasOwnProperty(r.return_status)) {
          statuses[r.return_status]++;
        }
        totalRefundAmount += r.refund_amount || 0;
      });

      return {
        totalReturns: recentReturns.length,
        statuses,
        totalRefundAmount,
        approvalRate: recentReturns.length > 0 
          ? (statuses.approved / recentReturns.length) * 100 
          : 0,
        processingRate: recentReturns.length > 0
          ? (statuses.processed / recentReturns.length) * 100
          : 0
      };
    },
    enabled: !!companyId
  });
}
