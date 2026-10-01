import { powerSync } from '@/api/PowerSyncConnector';
import { supabase } from '@/api/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export const TowerMutations = {
  createTower: async (name, industry, userEmail, userId) => {
    try {
      const companyId = uuidv4();
      
      // We must insert directly to Supabase since PowerSync is read-heavy synced 
      // for the current active workspace, and this spans outside the local bucket until synced.
      const { data: newCompany, error: compError } = await supabase
        .from('companies')
        .insert({
          id: companyId,
          name: name,
          industry_type: industry,
          admin_email: userEmail,
          created_by: userId,
          status: 'active',
          subscription_plan: 'enterprise',
          subscription_status: 'active'
        })
        .select()
        .single();

      if (compError) throw compError;

      // Add to access controls so the AuthContext maps this user to the new vertical
      const { error: accessError } = await supabase
        .from('univ_accesscontrols')
        .insert({
          id: uuidv4(),
          company_id: companyId,
          email: userEmail,
          role: 'company_admin',
          status: 'active'
        });

      if (accessError) throw accessError;

      return { success: true, company: newCompany };
    } catch (e) {
      console.error("Failed to create new tower:", e);
      return { success: false, error: e };
    }
  },

  getAllTowers: async (userEmail, industry) => {
    try {
      // Find all companies where this user is an admin or mapped via access controls
      // First, get all company_ids mapped to this user's email
      const { data: access } = await supabase
        .from('univ_accesscontrols')
        .select('company_id')
        .eq('email', userEmail);
        
      const accessIds = (access || []).map(a => a.company_id);
      
      // Query companies that match these IDs or where admin_email is this user
      // Also filter by the specific industry so they only see the relevant verticals
      const orClause = accessIds.length 
        ? `admin_email.eq.${userEmail},id.in.(${accessIds.join(',')})`
        : `admin_email.eq.${userEmail}`;

      const { data: companies, error } = await supabase
        .from('companies')
        .select('*')
        .eq('industry_type', industry)
        .or(orClause);
        
      if (error) throw error;
      return { success: true, towers: companies || [] };
    } catch(e) {
      console.error("Failed to fetch towers:", e);
      return { success: false, error: e, towers: [] };
    }
  },
  
  getTowerAggregates: async (companyIds, industry) => {
    // This is a placeholder for aggregating data across all vertical towers.
    // In production, this would hit a Supabase Edge Function or custom RPC.
    // For now, we simulate basic metrics.
    try {
       // Just returning some mocked aggregate data structure for now,
       // as querying N different tables efficiently across M branches requires an RPC.
       return {
         success: true,
         aggregates: {
           totalRevenue: companyIds.length * 15400,
           activeUsers: companyIds.length * 24,
           pendingTasks: companyIds.length * 7
         }
       };
    } catch(e) {
      return { success: false, aggregates: {} };
    }
  }
};
