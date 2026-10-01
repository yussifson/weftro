import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompanyId } from './useCompanyId';
import { useAuth } from '@/lib/AuthContext';

/**
 * Hook to fetch generic industry records using LegalCase as the underlying generic container.
 * Record data is stored in the 'notes' JSON column.
 */
export function useIndustryRecords(recordType) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['industry_records', companyId, recordType],
    queryFn: async () => {
      if (!companyId || !recordType) return [];
      
      const records = await base44.entities.LegalCase.filter({
        company_id: companyId,
        case_type: recordType
      });

      return records.map(r => {
        let data = {};
        try {
          data = typeof r.notes === 'string' ? JSON.parse(r.notes) : (r.notes || {});
        } catch (e) {}
        return {
          id: r.id,
          company_id: r.company_id,
          record_type: r.case_type,
          data: data,
          status: r.status,
          search_text: r.title,
          created_at: r.created_date || r.created_at,
          updated_at: r.updated_date || r.updated_at,
          created_by: r.created_by
        };
      }).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    },
    enabled: !!companyId && !!recordType,
    placeholderData: (prev) => prev});
}

export function useMutateIndustryRecord() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, recordType, payload, status, searchText }) => {
      if (!companyId || !recordType) {
        throw new Error("Missing context to save record.");
      }

      const userName = user?.user_metadata?.full_name || user?.email || 'Unknown User';

      const casePayload = {
        company_id: companyId,
        case_type: recordType,
        title: searchText || 'Record',
        status: status || 'Active',
        notes: JSON.stringify(payload),
        updated_at: new Date().toISOString()
      };

      let result;
      try {
        if (id) {
          result = await base44.entities.LegalCase.update(id, casePayload);
        } else {
          casePayload.created_by = userName;
          casePayload.created_at = new Date().toISOString();
          result = await base44.entities.LegalCase.create(casePayload);
        }
      } catch (err) {
        const errorMsg = err?.message || 'Failed to save record';
        console.error('[v0] Industry data save error:', errorMsg, err);
        throw new Error(`Failed to save ${recordType}: ${errorMsg}`);
      }

      let data = {};
      try { data = typeof result.notes === 'string' ? JSON.parse(result.notes) : (result.notes || {}); } catch(e) {}
      
      return {
        id: result.id,
        company_id: result.company_id,
        record_type: result.case_type,
        data: data,
        status: result.status,
        search_text: result.title,
        created_at: result.created_at,
        updated_at: result.updated_at,
        created_by: result.created_by
      };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        ['industry_records', companyId, data.record_type],
        (old = []) => {
          const exists = old.find(r => r.id === data.id);
          if (exists) return old.map(r => r.id === data.id ? data : r);
          return [data, ...old];
        }
      );
      queryClient.invalidateQueries({ queryKey: ['industry_records', companyId, data.record_type] });
    }});
}

export function useDeleteIndustryRecord() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async ({ id, recordType }) => {
      await base44.entities.LegalCase.delete(id);
      return { id, recordType };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        ['industry_records', companyId, data.recordType],
        (old = []) => old.filter(r => r.id !== data.id)
      );
      queryClient.invalidateQueries({ queryKey: ['industry_records', companyId, data.recordType] });
    }});
}
