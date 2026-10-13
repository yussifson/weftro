import { supabase } from '@/api/supabaseClient';
import { useQuery } from "@tanstack/react-query";
import { powerSync } from "@/api/PowerSyncConnector";
import { useAuth } from "@/lib/AuthContext";
import { get, set } from 'idb-keyval';

export function useCompanyId() {
  const { user, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return undefined;
  return user?.company_id || null;
}

export function useCompany() {
  const { user } = useAuth();
  const companyId = user?.company_id;
  const cacheKey = `slate_company_${companyId}`;

  const { data: company = null, isLoading } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      try {
        const { data, error } = await supabase
          .from("companies")
          .select("*")
          .eq("id", companyId)
          .maybeSingle();
        if (error) throw error;
        
        if (data) {
          // Cache for offline
          await set(cacheKey, data).catch(() => {});
          return data;
        }

        // Try PowerSync fallback if online fetch returns null
        try {
          const psData = await powerSync.getAll('SELECT * FROM companies WHERE id = ?', [companyId]);
          if (psData && psData.length > 0) {
            return psData[0];
          }
        } catch (pe) {}

        const cached = await get(cacheKey);
        return cached || null;
      } catch (err) {
        console.warn("useCompany offline fallback:", err.message);
        try {
          const psData = await powerSync.getAll('SELECT * FROM companies WHERE id = ?', [companyId]);
          if (psData && psData.length > 0) {
            return psData[0];
          }
          const cached = await get(cacheKey);
          return cached || null;
        } catch (e) {
          return null;
        }
      }
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const override = typeof window !== 'undefined' ? sessionStorage.getItem('slate_industry_override') : null;

  let finalCompany = company;
  if (user?.role === 'super_admin') {
    if (!finalCompany) {
      finalCompany = {
        id: 'super_admin_company',
        name: 'Super Admin Co',
        industry_type: override || 'law'
      };
    } else if (override) {
      finalCompany = {
        ...finalCompany,
        industry_type: override
      };
    }
  }

  return { company: finalCompany, isLoading: isLoading && !!companyId };
}