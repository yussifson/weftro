import { supabase } from '@/api/supabaseClient';
import { useState, useEffect } from "react";
import { powerSync } from "@/api/PowerSyncConnector";
import { INDUSTRIES, getIndustryNav, clientNav } from "@/config/industries";
import { useCompany } from "@/hooks/useCompanyId";

export function useNavigation(user, impersonatedCompany) {
  const [dynamicModules, setDynamicModules] = useState([]);
  const [allowedPaths, setAllowedPaths] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const { company } = useCompany();
  
  const isAdmin = ["super_admin", "admin", "company_admin", "managing_partner"].includes(user?.role);
  const activeIndustry = sessionStorage.getItem('slate_industry_override') 
    || impersonatedCompany?.industry 
    || impersonatedCompany?.industry_type 
    || company?.industry_type 
    || user?.company_industry 
    || 'law';

  // 1. Fetch Dynamic Modules (App Builder etc.)
  useEffect(() => {
    const fetchDynamicNav = async () => {
      try {
        let query = supabase
          .from('module_definitions')
          .select('id, name, icon, status, industry_type')
          .eq('is_active', true)
          .or(`company_id.eq.${user?.company_id || ''},shared_with.ilike.%${user?.company_id || ''}%`);
        
        if (!isAdmin) {
          query = query.eq('status', 'published');
        } else {
          query = query.in('status', ['published', 'draft']);
        }

        const { data } = await query;
        const filteredData = (data || []).filter(m => !m.industry_type || m.industry_type === activeIndustry);
        setDynamicModules(filteredData);
      } catch (err) {
        console.error("Failed to load dynamic nav", err);
      }
    };
    if (user?.company_id) {
      fetchDynamicNav();
      const channelName = `sidebar-modules-${Date.now()}-${Math.random()}`;
      const channel = supabase.channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'module_definitions' }, () => {
          fetchDynamicNav();
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.company_id, activeIndustry, isAdmin]);

  // 2. Fetch True RBAC Permissions from SQLite based on user role
  useEffect(() => {
    if (isAdmin) {
      setLoadingPermissions(false);
      return;
    }
    
    if (!user?.role || !user?.company_id) {
      setLoadingPermissions(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        // First find the role ID that matches the user's string role
        const roleRes = await powerSync.execute('SELECT id FROM platform_roles WHERE company_id = ? AND (name = ? OR name = ?)', [user.company_id, user.role, user.role.toLowerCase()]);
        
        if (roleRes.rows?.length > 0) {
          const roleId = roleRes.rows.item(0).id;
          const permRes = await powerSync.execute('SELECT feature_path FROM platform_role_permissions WHERE role_id = ?', [roleId]);
          const paths = [];
          for(let i=0; i<permRes.rows.length; i++) {
             paths.push(permRes.rows.item(i).feature_path);
          }
          setAllowedPaths(paths);
        } else {
          // Fallback if role is not found in database (maybe it's predefined but not seeded yet)
          // We allow basic access or no access. Let's provide a safe fallback for unseeded roles.
          setAllowedPaths(['/', '/my-dashboard']);
        }
      } catch (e) {
        console.error("Failed to load RBAC permissions", e);
      } finally {
        setLoadingPermissions(false);
      }
    };
    
    fetchPermissions();
  }, [user?.company_id, user?.role, isAdmin]);

  const industryNav = getIndustryNav(activeIndustry);
  
  const savedModulesStr = localStorage.getItem(`active_modules_${user?.company_id}`);
  const rawActiveModules = savedModulesStr ? JSON.parse(savedModulesStr) : null;
  const hasMatchingModules = rawActiveModules && (
    (rawActiveModules.length === 1 && rawActiveModules[0] === '__orbit__') ||
    industryNav.some(item => rawActiveModules.includes(item.path))
  );
  const activeModules = hasMatchingModules ? rawActiveModules : null;
  const isOrbitMode = activeModules?.length === 1 && activeModules[0] === '__orbit__';
  
  const filteredCompanyNav = isOrbitMode ? [] : industryNav.filter(item => {
    if (activeModules && !['/', '/settings', '/roles', '/departments', '/integrations', '/admin'].includes(item.path)) {
      if (!activeModules.includes(item.path)) return false;
    }
    if (isAdmin) return true;
    
    // Check dynamic RBAC database permissions
    return allowedPaths.includes(item.path);
  });

  const dynamicNavItems = dynamicModules.map(m => ({
    id: m.id,
    label: m.name,
    icon: m.icon || "Sparkles",
    status: m.status || "published",
    path: `/m/${m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
    isDynamic: true
  }));

  const baseNav = user?.role === "client" ? clientNav : filteredCompanyNav;
  const appBuilderItem = { label: "OrbitBolt AI Builder", icon: "Zap", path: "/slate/BOLT" };
  const marketplaceItem = { label: "Marketplace", icon: "ShoppingCart", path: "/marketplace" };
  
  let navItems = isAdmin
    ? [...baseNav, ...dynamicNavItems, appBuilderItem, marketplaceItem, { label: "Firm Setup", icon: "Settings", path: "/firm-setup" }]
    : [...baseNav, ...dynamicNavItems, marketplaceItem];
    
  if (user?.role === "super_admin") {
    navItems = [...navItems, { label: "Super Admin Portal", icon: "Shield", path: "/system-admin" }];
  }

  return { navItems, isAdmin, activeIndustry, loadingPermissions };
}
