import { supabase } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { powerSync } from "@/api/PowerSyncConnector";
import { useAuth } from '@/lib/AuthContext';

export function useCustomFields(recordType) {
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;

  return useQuery({
    queryKey: ['custom_fields', companyId, recordType],
    queryFn: async () => {
      if (!companyId) return [];
      let query = supabase
        .from('custom_field_definitions')
        .select('*')
        .eq('company_id', companyId);
      
      if (recordType) {
        query = query.eq('record_type', recordType);
      }

      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId});
}

export function useMutateCustomField() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;

  return useMutation({
    mutationFn: async ({ id, recordType, fieldName, fieldLabel, fieldType, fieldOptions, isRequired }) => {
      if (!companyId) throw new Error('No company ID');

      const payload = {
        company_id: companyId,
        record_type: recordType,
        field_name: fieldName,
        field_label: fieldLabel,
        field_type: fieldType || 'text',
        field_options: fieldOptions || [],
        is_required: isRequired || false};

      if (id) {
        const { data, error } = await supabase
          .from('custom_field_definitions')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('custom_field_definitions')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['custom_fields', companyId] });
      if (variables.recordType) {
        queryClient.invalidateQueries({ queryKey: ['custom_fields', companyId, variables.recordType] });
      }
    }
  });
}

export function useDeleteCustomField() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('custom_field_definitions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom_fields', companyId] });
    }
  });
}
