import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import base44 from '@/api/base44Client';

// Vehicle Registration
export const useVehicleRegistrations = (vehicleId) => {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['vehicle_registrations', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      try {
        const records = await base44.entities.vehicle_registrations.filter({
          company_id: companyId,
          vehicle_id: vehicleId
        });
        return records || [];
      } catch (err) {
        console.error('[v0] Failed to fetch registrations:', err);
        return [];
      }
    },
    enabled: !!vehicleId
  });
};

export const useCreateRegistration = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const payload = {
        id: crypto.randomUUID(),
        company_id: companyId,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return await base44.entities.vehicle_registrations.create(payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle_registrations', variables.vehicle_id] });
    }
  });
};

// Vehicle Insurance
export const useVehicleInsurance = (vehicleId) => {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['vehicle_insurance', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      try {
        const records = await base44.entities.vehicle_insurance.filter({
          company_id: companyId,
          vehicle_id: vehicleId
        });
        return records || [];
      } catch (err) {
        console.error('[v0] Failed to fetch insurance:', err);
        return [];
      }
    },
    enabled: !!vehicleId
  });
};

export const useCreateInsurance = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const payload = {
        id: crypto.randomUUID(),
        company_id: companyId,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return await base44.entities.vehicle_insurance.create(payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle_insurance', variables.vehicle_id] });
    }
  });
};

// Maintenance Scheduling
export const useMaintenanceSchedules = (vehicleId) => {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['maintenance_schedules', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      try {
        const records = await base44.entities.maintenance_schedules.filter({
          company_id: companyId,
          vehicle_id: vehicleId
        });
        return records || [];
      } catch (err) {
        console.error('[v0] Failed to fetch maintenance schedules:', err);
        return [];
      }
    },
    enabled: !!vehicleId
  });
};

export const useCreateMaintenanceSchedule = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const payload = {
        id: crypto.randomUUID(),
        company_id: companyId,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return await base44.entities.maintenance_schedules.create(payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_schedules', variables.vehicle_id] });
    }
  });
};

// Breakdown Management
export const useVehicleBreakdowns = (vehicleId) => {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['vehicle_breakdowns', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      try {
        const records = await base44.entities.vehicle_breakdowns.filter({
          company_id: companyId,
          vehicle_id: vehicleId
        });
        return records || [];
      } catch (err) {
        console.error('[v0] Failed to fetch breakdowns:', err);
        return [];
      }
    },
    enabled: !!vehicleId
  });
};

export const useCreateBreakdown = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const payload = {
        id: crypto.randomUUID(),
        company_id: companyId,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return await base44.entities.vehicle_breakdowns.create(payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle_breakdowns', variables.vehicle_id] });
    }
  });
};

// Tire Management
export const useTireManagement = (vehicleId) => {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['tire_management', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      try {
        const records = await base44.entities.tire_management.filter({
          company_id: companyId,
          vehicle_id: vehicleId
        });
        return records || [];
      } catch (err) {
        console.error('[v0] Failed to fetch tire data:', err);
        return [];
      }
    },
    enabled: !!vehicleId
  });
};

export const useCreateTire = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const payload = {
        id: crypto.randomUUID(),
        company_id: companyId,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return await base44.entities.tire_management.create(payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tire_management', variables.vehicle_id] });
    }
  });
};

// Fuel Management
export const useFuelManagement = (vehicleId) => {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['fuel_management', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      try {
        const records = await base44.entities.fuel_management.filter({
          company_id: companyId,
          vehicle_id: vehicleId
        });
        return records || [];
      } catch (err) {
        console.error('[v0] Failed to fetch fuel data:', err);
        return [];
      }
    },
    enabled: !!vehicleId
  });
};

export const useCreateFuelRecord = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const payload = {
        id: crypto.randomUUID(),
        company_id: companyId,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return await base44.entities.fuel_management.create(payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fuel_management', variables.vehicle_id] });
    }
  });
};

// Spare Parts Inventory
export const useSpareParts = (companyId) => {
  return useQuery({
    queryKey: ['spare_parts_inventory', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      try {
        const records = await base44.entities.spare_parts_inventory.filter({
          company_id: companyId
        });
        return records || [];
      } catch (err) {
        console.error('[v0] Failed to fetch spare parts:', err);
        return [];
      }
    },
    enabled: !!companyId
  });
};

export const useCreateSparePart = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const payload = {
        id: crypto.randomUUID(),
        company_id: companyId,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return await base44.entities.spare_parts_inventory.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spare_parts_inventory', companyId] });
    }
  });
};

// Asset Tracking
export const useAssetTracking = (vehicleId) => {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['asset_tracking', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      try {
        const records = await base44.entities.asset_tracking.filter({
          company_id: companyId,
          vehicle_id: vehicleId
        });
        return records || [];
      } catch (err) {
        console.error('[v0] Failed to fetch assets:', err);
        return [];
      }
    },
    enabled: !!vehicleId
  });
};

export const useCreateAsset = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const payload = {
        id: crypto.randomUUID(),
        company_id: companyId,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return await base44.entities.asset_tracking.create(payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['asset_tracking', variables.vehicle_id] });
    }
  });
};

// Vehicle Utilization Analytics
export const useVehicleUtilization = (vehicleId) => {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['vehicle_utilization', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      try {
        const records = await base44.entities.vehicle_utilization.filter({
          company_id: companyId,
          vehicle_id: vehicleId
        });
        return records || [];
      } catch (err) {
        console.error('[v0] Failed to fetch utilization data:', err);
        return [];
      }
    },
    enabled: !!vehicleId
  });
};

export const useCreateUtilizationRecord = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const payload = {
        id: crypto.randomUUID(),
        company_id: companyId,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return await base44.entities.vehicle_utilization.create(payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle_utilization', variables.vehicle_id] });
    }
  });
};

// Vehicle Downtime
export const useVehicleDowntime = (vehicleId) => {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['vehicle_downtime', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      try {
        const records = await base44.entities.vehicle_downtime.filter({
          company_id: companyId,
          vehicle_id: vehicleId
        });
        return records || [];
      } catch (err) {
        console.error('[v0] Failed to fetch downtime data:', err);
        return [];
      }
    },
    enabled: !!vehicleId
  });
};

export const useCreateDowntimeRecord = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const payload = {
        id: crypto.randomUUID(),
        company_id: companyId,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return await base44.entities.vehicle_downtime.create(payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle_downtime', variables.vehicle_id] });
    }
  });
};

// Vehicle Inspections
export const useVehicleInspections = (vehicleId) => {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['vehicle_inspections', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      try {
        const records = await base44.entities.vehicle_inspections.filter({
          company_id: companyId,
          vehicle_id: vehicleId
        });
        return records || [];
      } catch (err) {
        console.error('[v0] Failed to fetch inspections:', err);
        return [];
      }
    },
    enabled: !!vehicleId
  });
};

export const useCreateInspection = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const payload = {
        id: crypto.randomUUID(),
        company_id: companyId,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return await base44.entities.vehicle_inspections.create(payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle_inspections', variables.vehicle_id] });
    }
  });
};
