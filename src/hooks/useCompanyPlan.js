import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useCompanyId } from './useCompanyId';
import { getCompanyPlan } from '@/lib/clipadPricing';

/**
 * Hook to securely and reactively fetch the current DB-sourced plan 
 * for the user's active company.
 */
export function useCompanyPlan() {
  const companyId = useCompanyId();

  const { data: plan = 'free', isLoading } = useQuery({
    queryKey: ['companyPlan', companyId],
    queryFn: async () => {
      if (!companyId) return 'free';
      return await getCompanyPlan(supabase, companyId);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  return { plan, isLoading };
}
