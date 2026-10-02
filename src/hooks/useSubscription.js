import { supabase } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { powerSync } from "@/api/PowerSyncConnector";
import { useCompanyId } from '@/hooks/useCompanyId';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';
import { useAuth } from '@/lib/AuthContext';

export function useSubscription() {
  const companyId = useCompanyId();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin' || user?.user_metadata?.role === 'super_admin';

  const { data, isLoading, error } = useQuery({
    queryKey: ['subscription_fixed', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      // Fetch company plan via Supabase or fallback to PowerSync
      let company = null;
      try {
         const { data: compData } = await supabase.from('companies').select('subscription_plan, subscription_status').eq('id', companyId).maybeSingle();
         company = compData;
      } catch (e) {}

      if (!company) {
         try {
             const companyRes = await powerSync.execute('SELECT subscription_plan, subscription_status FROM companies WHERE id = ?', [companyId]);
             company = companyRes.rows?._array?.[0] || {};
         } catch(e) {}
      }

      const planKey = company?.subscription_plan || 'free_trial';
      const status = company?.subscription_status || 'active';
      const plan = SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.free_trial;

      // Fetch usage metrics
      const today = new Date().toISOString().split('T')[0];
      const { data: usageData } = await supabase
        .from('usage_metrics')
        .select('*')
        .eq('company_id', companyId)
        .eq('metric_name', 'ai_credits_daily')
        .gte('period_start', today);

      const aiCreditsUsed = usageData?.[0]?.used_amount || 0;

      // Count actual users for the limit check
      const { count: usersCount } = await supabase
        .from('staff_records')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      return {
        subscription: { status },
        plan,
        usage: {
          ai_credits_daily: aiCreditsUsed,
          users: usersCount || 0
        }
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000 // Cache for 5 mins
  });

  const plan = data?.plan || SUBSCRIPTION_PLANS.free_trial;
  const subscription = data?.subscription;
  const status = subscription?.status || 'none';
  const isActive = isSuperAdmin || (status === 'active' || status === 'trialing');

  // Helper to check if a feature is enabled
  const hasFeature = (featureName) => {
    if (isSuperAdmin) return true;
    // If aiLimited is true, maybe they don't have premium AI features
    if (featureName === 'premium_ai' && plan.aiLimited) return false;
    return isActive;
  };

  // Helper to check if user has reached a specific limit
  const checkLimit = (limitName) => {
    if (isSuperAdmin) {
       return { allowed: true, current: 0, max: 'Unlimited' };
    }
    // map common limit names to SUBSCRIPTION_PLANS keys
    const mapping = {
        users: 'maxUsers',
        cases: 'maxCases',
        clients: 'maxClients',
        storage: 'maxStorageGB',
        industries: 'maxIndustries'
    };
    const propName = mapping[limitName] || limitName;
    const limitMax = plan[propName] || 0;
    
    // If limitMax is 'Unlimited' or 9999, always allow
    if (limitMax === 'Unlimited' || limitMax >= 9999) {
       return { allowed: true, current: 0, max: 'Unlimited' };
    }

    const currentUsage = data?.usage[limitName] || 0;
    return {
      allowed: currentUsage < limitMax,
      current: currentUsage,
      max: limitMax
    };
  };

  return {
    isLoading,
    error,
    subscription,
    plan,
    isActive,
    status,
    hasFeature,
    checkLimit
  };
}
