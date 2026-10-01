import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

/**
 * Interface for industry visibility data
 */
export interface IndustryVisibility {
  id: string;
  industry_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Check if user is a super admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) return false;
    return data.role === 'super_admin';
  } catch (err) {
    console.error('[v0] Error checking super admin status:', err);
    return false;
  }
}

/**
 * Get all visible industries filtered by status and user role
 * 
 * @param includeInactive - If true, include inactive industries (only for super admins)
 * @param userId - Current user ID
 * @returns Object with filtered industries
 */
export async function getVisibleIndustries(
  includeInactive: boolean = false,
  userId?: string
): Promise<Record<string, any>> {
  try {
    const { data: visibilityData, error } = await supabase
      .from('industry_visibility')
      .select('industry_key, is_active')
      .order('industry_key', { ascending: true });

    if (error) {
      console.error('[v0] Error fetching industry visibility:', error);
      return {};
    }

    // Create a map of industry keys to visibility status
    const visibilityMap = new Map(
      visibilityData?.map(v => [v.industry_key, v.is_active]) || []
    );

    // Import industries config - use dynamic import to avoid circular dependencies
    const industriesModule = await import('@/config/industries');
    const INDUSTRIES = industriesModule.INDUSTRIES;

    // Filter industries based on visibility
    const filteredIndustries: Record<string, any> = {};

    for (const [key, config] of Object.entries(INDUSTRIES)) {
      const isVisible = visibilityMap.get(key);

      // If industry_visibility record exists, use it
      if (isVisible !== undefined) {
        // Super admins see all industries; regular users see only active ones
        if (isVisible || (userId && (await isSuperAdmin(userId)))) {
          filteredIndustries[key] = config;
        }
      } else {
        // No visibility record found - treat as visible (backward compatibility)
        filteredIndustries[key] = config;
      }
    }

    return filteredIndustries;
  } catch (err) {
    console.error('[v0] Error in getVisibleIndustries:', err);
    return {};
  }
}

/**
 * Get single industry visibility status
 */
export async function getIndustryVisibility(
  industryKey: string
): Promise<IndustryVisibility | null> {
  try {
    const { data, error } = await supabase
      .from('industry_visibility')
      .select('*')
      .eq('industry_key', industryKey)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - treat as visible (backward compatibility)
        return null;
      }
      throw error;
    }

    return data as IndustryVisibility;
  } catch (err) {
    console.error('[v0] Error fetching industry visibility:', err);
    return null;
  }
}

/**
 * Update industry visibility status (super admin only)
 */
export async function updateIndustryVisibility(
  industryKey: string,
  isActive: boolean,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify user is super admin
    const superAdmin = await isSuperAdmin(userId);
    if (!superAdmin) {
      return { success: false, error: 'Only super admins can modify industry visibility' };
    }

    const { data, error } = await supabase
      .from('industry_visibility')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('industry_key', industryKey)
      .select()
      .single();

    if (error) throw error;

    // Audit log is handled by database trigger
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[v0] Error updating industry visibility:', err);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get all industry visibility records (super admin view)
 */
export async function getAllIndustryVisibility(
  userId: string
): Promise<IndustryVisibility[]> {
  try {
    // Verify user is super admin
    const superAdmin = await isSuperAdmin(userId);
    if (!superAdmin) {
      throw new Error('Only super admins can view all industry visibility records');
    }

    const { data, error } = await supabase
      .from('industry_visibility')
      .select('*')
      .order('industry_key', { ascending: true });

    if (error) throw error;

    return (data as IndustryVisibility[]) || [];
  } catch (err) {
    console.error('[v0] Error fetching all industry visibility:', err);
    throw err;
  }
}

/**
 * Get industry visibility audit log (super admin only)
 */
export async function getIndustryVisibilityAuditLog(
  industryKey?: string
): Promise<any[]> {
  try {
    let query = supabase
      .from('industry_visibility_audit')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(100);

    if (industryKey) {
      query = query.eq('industry_key', industryKey);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[v0] Error fetching audit log:', err);
    return [];
  }
}

/**
 * Get plans with visibility filtering
 */
export async function getVisiblePlans(
  marketTier: string,
  userId?: string
): Promise<any[]> {
  try {
    let query = supabase
      .from('subscription_plans')
      .select('*')
      .eq('market_tier', marketTier)
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    // Check if user is super admin
    const isSuperAdminUser = userId ? await isSuperAdmin(userId) : false;

    // Non-super-admins only see visible plans
    if (!isSuperAdminUser) {
      query = query.eq('is_visible', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Always include free plan if not present
    const plans = data || [];
    const hasFree = plans.some(p => p.price_monthly === 0 || p.price_monthly === '0');

    if (!hasFree) {
      plans.unshift({
        id: 'free',
        name: 'Free',
        price_monthly: 0,
        is_visible: true,
        is_active: true,
        limits: { users: 1, ai_credits_monthly: 100 }
      });
    }

    return plans;
  } catch (err) {
    console.error('[v0] Error fetching visible plans:', err);
    return [];
  }
}

/**
 * Hook to use industry visibility in React components
 */
export function useIndustryVisibility() {
  const { user } = useAuth();

  const fetchVisibleIndustries = async (includeInactive: boolean = false) => {
    if (!user?.id) return {};
    return getVisibleIndustries(includeInactive, user.id);
  };

  const fetchVisiblePlans = async (marketTier: string) => {
    if (!user?.id) return [];
    return getVisiblePlans(marketTier, user.id);
  };

  const updateVisibility = async (industryKey: string, isActive: boolean) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' };
    }
    return updateIndustryVisibility(industryKey, isActive, user.id);
  };

  return {
    fetchVisibleIndustries,
    fetchVisiblePlans,
    updateVisibility
  };
}
