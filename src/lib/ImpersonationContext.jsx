import React, { createContext, useContext, useState, useEffect } from "react";

const ImpersonationContext = createContext();

const STORAGE_KEY = "slate_impersonating";

export function ImpersonationProvider({ children }) {
  const [impersonatedCompany, setImpersonatedCompany] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('impersonate_token');
      if (token) {
        const decoded = JSON.parse(atob(token));
        if (decoded.exp > Date.now()) {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(decoded));
          window.history.replaceState({}, document.title, window.location.pathname);
          return decoded;
        }
      }
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const startImpersonation = (company) => {
    import('@/lib/domainUtils').then(async ({ getSubdomainAndBase }) => {
      const { baseDomain } = getSubdomainAndBase();
      const token = btoa(JSON.stringify({ ...company, exp: Date.now() + 60000 }));
      const protocol = window.location.protocol;
      const port = window.location.port ? ':' + window.location.port : '';
      
      let url = `${protocol}//${company.subdomain}.${baseDomain}${port}/?impersonate_token=${token}`;
      
      try {
        const { supabase } = await import('@/api/supabaseClient');
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token && session?.refresh_token) {
          url += `&access_token=${session.access_token}&refresh_token=${session.refresh_token}`;
        }
      } catch (err) {
        console.error("Failed to append session tokens", err);
      }
      
      window.location.href = url;
    });
  };

  const stopImpersonation = () => {
    setImpersonatedCompany(null);
    sessionStorage.removeItem(STORAGE_KEY);
    import('@/lib/domainUtils').then(({ getSubdomainAndBase }) => {
      const { baseDomain } = getSubdomainAndBase();
      const protocol = window.location.protocol;
      const port = window.location.port ? ':' + window.location.port : '';
      window.location.href = `${protocol}//${baseDomain}${port}/admin`;
    });
  };

  return (
    <ImpersonationContext.Provider value={{ impersonatedCompany, startImpersonation, stopImpersonation }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  return useContext(ImpersonationContext);
}
