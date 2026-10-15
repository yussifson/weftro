import React, { createContext, useState, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
import { powerSync } from "@/api/PowerSyncConnector";
import { supabase } from "@/api/supabaseClient";
import { isDesktopApp } from '@/lib/domainUtils';
import { identifyUser, resetUser } from '@/lib/posthog';
import { getSubdomainAndBase } from './domainUtils';
import { useImpersonation } from './ImpersonationContext';
import { saveAccount, removeAccount, getSavedAccounts, markAccountLoggedOut } from './multiAccountUtils';
export const PORTAL_ROLES = ['client', 'patient', 'guest', 'parent', 'student', 'learner', 'trainee', 'customer', 'policyholder', 'member', 'tenant', 'landlord', 'employee'];

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { impersonatedCompany } = useImpersonation();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authStep, setAuthStep] = useState("Initializing...");
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState({ public_settings: {} });

  const isCheckingRef = useRef(false);
  const isAuthenticatedRef = useRef(false);
  const userRef = useRef(null);
  const hasInitializedRef = useRef(false);
  const isExplicitLogoutRef = useRef(false);

  // Keep ref in sync with user state to prevent stale closures
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Keep ref in sync with isAuthenticated state to prevent stale closures
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const checkAppState = useCallback(async () => {
    setIsLoadingPublicSettings(false);
    return;
  }, []);

  const checkUserAuth = useCallback(async (passedSession = null, forceRefresh = false) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    try {
      // Only show full-screen loader if the user is not yet authenticated
      if (!isAuthenticatedRef.current) {
        setIsLoadingAuth(true);
      }
      
      let sessionVal = passedSession;
      
      // Parse URL parameters ONCE before any scrubbing occurs
      const urlParams = new URLSearchParams(window.location.search);
      const setupModeParam = urlParams.get('setup_mode');
      const activeModulesParam = urlParams.get('active_modules');
      const industryParam = urlParams.get('industry');
      // If the URL has an industry param (set by onboarding), persist it to localStorage immediately
      // so the dashboard knows the right industry without waiting for PowerSync to sync.
      if (industryParam) {
        localStorage.setItem('slate_onboarding_industry', industryParam);
      }

      if (!sessionVal) {
        // Attempt to restore cross-domain session from URL query parameters or hash fragment
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const urlAccessToken = urlParams.get('access_token') || hashParams.get('access_token');
        const urlRefreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
        
        if (urlAccessToken && urlRefreshToken) {
            setAuthStep("Restoring cross-domain session...");
            
            // ALWAYS clean the URL immediately to prevent retry loops on refresh
            const params = new URLSearchParams(window.location.search);
            params.delete('access_token');
            params.delete('refresh_token');
            const cleanHashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
            cleanHashParams.delete('access_token');
            cleanHashParams.delete('refresh_token');
            const newSearch = params.toString();
            const newHash = cleanHashParams.toString();
            const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '') + (newHash ? '#' + newHash : '');
            window.history.replaceState({}, document.title, newUrl);

            const { data, error } = await supabase.auth.setSession({
                access_token: urlAccessToken,
                refresh_token: urlRefreshToken
            });
            
            if (!error && data.session) {
                sessionVal = data.session;
            } else if (error) {
                console.warn("[AuthContext] Cross-domain setSession failed:", error.message);
                // Fallback: try setting session with only access_token
                const { data: fallbackData, error: fallbackError } = await supabase.auth.setSession({
                    access_token: urlAccessToken
                });
                
                if (!fallbackError && fallbackData?.session) {
                    sessionVal = fallbackData.session;
                } else {
                    // Ultimate fallback: manually fetch the user if the token is valid
                    const { data: userData, error: userError } = await supabase.auth.getUser(urlAccessToken);
                    if (userData?.user) {
                       // We have a valid user, so let's proceed even if the session couldn't be formally set in local storage yet
                       sessionVal = { user: userData.user, access_token: urlAccessToken, refresh_token: urlRefreshToken };
                       // Manually persist to local storage to survive refresh
                       try {
                           const projectId = import.meta.env.VITE_SUPABASE_URL.split('//')[1].split('.')[0];
                           localStorage.setItem('sb-optavel-auth-token', JSON.stringify(sessionVal));
                           localStorage.setItem(`sb-${projectId}-auth-token`, JSON.stringify(sessionVal));
                       } catch (e) {
                           console.warn("Failed to manually persist fallback session:", e);
                       }
                    }
                }
            }
        }
        
        if (!sessionVal) {
          setAuthStep("Fetching session...");
          const { data: { session: fetchedSession }, error } = await supabase.auth.getSession();
          if (error) throw error;
          sessionVal = fetchedSession;
        }
      }
      
      const sessionUser = sessionVal?.user;
      
      if (!sessionUser) {
        try {
          const cachedUserRaw = localStorage.getItem('slate_cached_user');
          if (cachedUserRaw) {
            const cachedUser = JSON.parse(cachedUserRaw);
            setUser(cachedUser);
            setIsAuthenticated(true);
            setAuthChecked(true);
            setIsLoadingAuth(false);
            isCheckingRef.current = false;
            return;
          }
        } catch (e) {}
        throw new Error("Not logged in");
      }

      // INSTANT MOBILE HYDRATION: If a valid cached user exists for this session ID,
      // unblock the UI immediately (< 50ms) so mobile screens load instantly.
      try {
        const cachedUserRaw = localStorage.getItem('slate_cached_user');
        if (cachedUserRaw) {
          const cachedUser = JSON.parse(cachedUserRaw);
          if (cachedUser && cachedUser.id === sessionUser.id) {
            setUser(cachedUser);
            setIsAuthenticated(true);
            setAuthChecked(true);
            setIsLoadingAuth(false);
          }
        }
      } catch (e) {}
      
      // === GLOBALIZATION (i18n) SYNC ===
      // Check if user has a saved language preference from another device
      const savedLang = sessionUser.user_metadata?.language;
      if (savedLang) {
        const currentCookie = document.cookie.match(/(^|;) ?googtrans=([^;]*)(;|$)/);
        let currentLang = null;
        if (currentCookie && currentCookie[2]) {
          const parts = currentCookie[2].split('/');
          if (parts.length > 2) currentLang = parts[2];
        }
        if (savedLang !== currentLang) {
          document.cookie = `googtrans=/en/${savedLang}; path=/; domain=${window.location.hostname}`;
          document.cookie = `googtrans=/en/${savedLang}; path=/`;
          // If google translate is already loaded, trigger it
          const googleSelect = document.querySelector('.goog-te-combo');
          if (googleSelect) {
            googleSelect.value = savedLang;
            googleSelect.dispatchEvent(new Event('change'));
          }
        }
      }
      
      // Optimization: If already authenticated with the same user ID and not forcing a refresh, return immediately.
      // This prevents redundant database queries and layout/sidebar flickering on window refocus.
      // IMPORTANT: We still verify the Supabase session is live so we don't return with stale/expired credentials
      // that would cause all API calls to fail with 401 Unauthorized.
      const currentUser = userRef.current;
      if (!forceRefresh && isAuthenticatedRef.current && currentUser && currentUser.id === sessionUser.id) {
        // Quick session sanity check: ensure the stored token isn't expired
        const tokenExpiresAt = sessionVal?.expires_at || sessionVal?.session?.expires_at;
        const nowSecs = Math.floor(Date.now() / 1000);
        const isSessionFresh = tokenExpiresAt && (tokenExpiresAt - nowSecs) > 60; // Has at least 60s left
        
        if (isSessionFresh) {
          setIsAuthenticated(true);
          setAuthChecked(true);
          setIsLoadingAuth(false);
          isCheckingRef.current = false;
          return;
        }
        // If session is expiring soon or we can't verify, fall through to refresh full auth state
        console.log('[AuthContext] Session near expiry, performing full auth refresh...');
      }


      setAuthStep("Fetching profile...");
      let profile = null;
      let profileError = null;

      try {
          // ALWAYS TRY SUPABASE FIRST TO AVOID SYNC DELAYS AND FLICKERS
          const { data: supaProfile } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).maybeSingle();
          if (supaProfile) {
              profile = supaProfile;
          }
      } catch (e) {
          console.warn('[AuthContext] Supabase fetch failed, trying local offline DB:', e);
      }

      if (!profile) {
          // FALLBACK TO POWERSYNC IF OFFLINE OR NOT FOUND IN SUPABASE YET
          try {
             let res = await powerSync.execute('SELECT * FROM profiles WHERE id = ?', [sessionUser.id]);
             profile = res.rows._array[0] || null;
          } catch(e) {}
      }

      // Save transferred config to local storage using the correct company ID
      if (setupModeParam && profile?.company_id) {
          localStorage.setItem(`setup_mode_${profile.company_id}`, setupModeParam);
          if (activeModulesParam) {
             localStorage.setItem(`active_modules_${profile.company_id}`, activeModulesParam);
          } else {
             localStorage.removeItem(`active_modules_${profile.company_id}`);
          }
          
          // Clean the URL without reloading
          const newUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, newUrl);
      }

      setAuthStep("Checking invite/staff records...");
      let staffRecord = null;
      try {
        const res = await supabase
          .from('staff_records')
          .select('*')
          .ilike('user_email', sessionUser.email)
          .maybeSingle();
        staffRecord = res.data;
      } catch (e) {
          console.warn('[AuthContext] Offline: Cannot check fresh staff_records');
      }

      if (staffRecord) {
        // Fetch company name to copy to the profile
        let companyName = null;
        if (staffRecord.company_id) {
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', staffRecord.company_id)
            .maybeSingle();
          if (company?.name) {
            companyName = company?.name;
          }
        }

        if (!profile) {
          // Create new profile mapped to the existing company and role
          const _payload = {
            id: sessionUser.id,
            role: staffRecord.role || sessionUser.user_metadata?.role || 'lawyer',
            company_id: staffRecord.company_id,
            company_name: companyName,
            email: sessionUser.email?.toLowerCase() || null,
            phone: staffRecord.phone || null,
            department: staffRecord.department || null,
            bar_number: staffRecord.bar_number || null
          };
          const _keys = Object.keys(_payload);
          const _vals = Object.values(_payload).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
          
          let newProfile = null;
          let insertError = null;
          try {
            await powerSync.execute(`INSERT INTO profiles (${_keys.join(', ')}) VALUES (${_keys.map(()=>'?').join(', ')})`, _vals);
            const __resNew = await powerSync.execute(`SELECT * FROM profiles WHERE id = ?`, [sessionUser.id]);
            newProfile = __resNew.rows && __resNew.rows.length > 0 ? __resNew.rows.item(0) : null;
          } catch(err) {
            console.warn('[AuthContext] PowerSync offline insert failed:', err);
            insertError = err;
            // Provide a mock profile so auth can proceed if PowerSync is crashed
            newProfile = _payload;
          }
          
          if (!insertError || newProfile) {
            profile = newProfile;
            profileError = null;
          }
        } else if (profile) {
          // If the profile already exists, but its role or company is different from staff_records, sync them!
          // Do not let a local staff_record downgrade a global admin, super_admin, company_admin, or spaceman
          const isGlobalAdmin = ['super_admin', 'admin', 'company_admin', 'spaceman'].includes(profile.role);
          const shouldUpdateRole = !isGlobalAdmin && (profile.role !== staffRecord.role);

          if (
            shouldUpdateRole ||
            profile.company_id !== staffRecord.company_id ||
            profile.department !== staffRecord.department ||
            profile.bar_number !== staffRecord.bar_number ||
            !profile.company_name ||
            profile.email?.toLowerCase() !== sessionUser.email?.toLowerCase()
          ) {
                        const _payload = {
              company_id: staffRecord.company_id,
              company_name: companyName || profile.company_name,
              email: sessionUser.email?.toLowerCase() || profile.email || null,
              phone: staffRecord.phone || profile.phone || null,
              department: staffRecord.department || null,
              bar_number: staffRecord.bar_number || null
            };
            const _keys = Object.keys(_payload);
            const _vals = Object.values(_payload).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
            
            let updatedProfile = null;
            let updateError = null;
            try {
              await powerSync.execute(`UPDATE profiles SET ${_keys.map(k=>k+' = ?').join(', ')} WHERE id = ?`, [..._vals, sessionUser.id]);
              const __resUpd = await powerSync.execute(`SELECT * FROM profiles WHERE id = ?`, [sessionUser.id]);
              updatedProfile = __resUpd.rows && __resUpd.rows.length > 0 ? __resUpd.rows.item(0) : null;
            } catch(err) {
              console.warn('[AuthContext] PowerSync offline update failed:', err);
              updateError = err;
              updatedProfile = { ...profile, ..._payload };
            }
            
            if (!updateError || updatedProfile) {
              profile = updatedProfile;
            }
          }
        }

        if (staffRecord.id && !staffRecord.user_id) {
          try {
            const _payload = { user_id: sessionUser.id };
            const _keys = Object.keys(_payload);
            const _vals = Object.values(_payload).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
            await powerSync.execute(`UPDATE staff_records SET ${_keys.map(k => k+' = ?').join(', ')} WHERE id = ?`, [..._vals, staffRecord.id]);
          } catch(err) {
            console.warn('[AuthContext] PowerSync offline staff update failed:', err);
          }
        }
      } else if (!profile) {
        let invitedCompanyId = sessionUser.user_metadata?.company_id || null;
        let invitedRole = sessionUser.user_metadata?.role || 'company_admin';

        if (!invitedCompanyId && sessionUser.email) {
          const { data: accessRecord } = await supabase
            .from('univ_accesscontrols')
            .select('*')
            .ilike('email', sessionUser.email)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (accessRecord) {
             invitedCompanyId = accessRecord.company_id;
             invitedRole = accessRecord.role;
          }
        }

        if (!PORTAL_ROLES.includes(invitedRole)) {
            let finalCompanyId = invitedCompanyId;
            let finalCompanyName = null;
            let finalRole = invitedRole || 'company_admin'; // Make them admin of their own workspace

            // Auto-create personal workspace if no company was invited
            if (!finalCompanyId) {
                finalCompanyName = 'Personal Workspace';
                const newCompanyId = crypto.randomUUID();
                const newCompany = {
                    id: newCompanyId,
                    name: finalCompanyName,
                    subdomain: 'workspace-' + newCompanyId.split('-')[0]
                };
                try {
                    await supabase.from('companies').insert(newCompany);
                    await powerSync.execute(`INSERT INTO companies (id, name, subdomain) VALUES (?, ?, ?)`, [newCompany.id, newCompany.name, newCompany.subdomain]);
                    finalCompanyId = newCompanyId;
                    
                    // Crucial: Update Auth metadata so the session immediately reflects the new company_id
                    await supabase.auth.updateUser({
                      data: { company_id: newCompanyId, role: finalRole }
                    });
                } catch (e) {
                    console.warn('[AuthContext] Failed to auto-create personal workspace:', e);
                }
            }

            const _payload = {
              id: sessionUser.id,
              role: finalRole,
              company_id: finalCompanyId,
              company_name: finalCompanyName,
              email: sessionUser.email?.toLowerCase() || null
            };
            
            // Sync to Supabase directly first to ensure database existence immediately
            try {
              await supabase.from('profiles').upsert(_payload, { onConflict: 'id' });
            } catch (supaErr) {
              console.warn('[AuthContext] Failed to insert profile to Supabase directly:', supaErr);
            }

            const _keys = Object.keys(_payload);
            const _vals = Object.values(_payload).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
            try {
              await powerSync.execute(`INSERT INTO profiles (${_keys.join(', ')}) VALUES (${_keys.map(()=>'?').join(', ')})`, _vals);
            } catch (insertErr) {
              console.warn('[AuthContext] Profile insert skipped (likely already synced):', insertErr);
            }
            const __resNew = await powerSync.execute(`SELECT * FROM profiles WHERE id = ?`, [sessionUser.id]);
            const newProfile = __resNew.rows && __resNew.rows.length > 0 ? __resNew.rows.item(0) : null;
            const insertError = null;
            
            if (!insertError && newProfile) {
              profile = newProfile;
              profileError = null;
            } else {
              console.error("Failed to fetch new profile after insert.");
            }
        }
      } else if (profile && !profile.company_id) {
        if (sessionUser.user_metadata?.company_id) {
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({
              company_id: sessionUser.user_metadata.company_id,
              email: sessionUser.email?.toLowerCase() || profile.email || null})
            .eq('id', sessionUser.id)
            .select()
            .single();
          if (!updateError) profile = updatedProfile;
        } else {
          // Auto-repair legacy users with null company_id
          const newCompanyId = crypto.randomUUID();
          const newCompanyName = 'Personal Workspace';
          try {
              await supabase.from('companies').insert({
                  id: newCompanyId,
                  name: newCompanyName,
                  subdomain: 'workspace-' + newCompanyId.split('-')[0]
              });
              const { data: updatedProfile, error: updateError } = await supabase
                  .from('profiles')
                  .update({
                      company_id: newCompanyId,
                      role: 'company_admin'
                  })
                  .eq('id', sessionUser.id)
                  .select()
                  .single();
              
              if (!updateError) {
                profile = updatedProfile;
                await powerSync.execute(`UPDATE profiles SET company_id = ?, role = ? WHERE id = ?`, [newCompanyId, 'company_admin', sessionUser.id]);
                await powerSync.execute(`INSERT INTO companies (id, name, subdomain) VALUES (?, ?, ?)`, [newCompanyId, newCompanyName, 'workspace-' + newCompanyId.split('-')[0]]);
              }
          } catch (e) {
              console.warn('[AuthContext] Failed to repair legacy user without workspace', e);
          }
        }
      }

      setAuthStep("Checking firm subdomain...");
      let companySubdomain = null;
      let companyData = null;
      if (profile?.company_id) {
        let companyRaw = null;
        try {
          const res = await powerSync.execute('SELECT * FROM companies WHERE id = ?', [profile.company_id]);
          companyRaw = res.rows._array[0] || null;
          if (companyRaw?.pricing_tag_id) {
            const tagRes = await powerSync.execute('SELECT name FROM clipad_pricing_tags WHERE id = ?', [companyRaw.pricing_tag_id]);
            companyRaw.clipad_pricing_tags = tagRes.rows._array[0] || null;
          }
        } catch (err) {
          console.warn("PowerSync fetch failed:", err);
        }
        
        let finalCompany = companyRaw || {};
        
        // FALLBACK TO SUPABASE
        try {
          const { data: supaCompany } = await supabase.from('companies').select('*, clipad_pricing_tags(name)').eq('id', profile.company_id).maybeSingle();
          if (supaCompany) finalCompany = { ...finalCompany, ...supaCompany };
        } catch(e) { /* offline - use PowerSync data only */ }
        
        if (finalCompany?.id) {
          companyData = finalCompany;
          companySubdomain = finalCompany.subdomain || finalCompany.name?.toLowerCase().replace(/[^a-z0-9-]/g, '');
        }
      }

      // Find where we are right now
      const { currentSubdomain, baseDomain } = getSubdomainAndBase();

      // Subdomain routing is intentionally disabled.
      // Wildcard DNS (*.domain.com) is not configured, so redirecting to subdomains causes NXDOMAIN errors.
      // Branch switching works perfectly on the same URL by just relying on AuthContext state.

      // Update favicon and title if company data has it
      // Clipad / Weftro pages always use Weftro branding regardless of company
      const clipadRoutes = ['/', '/pricing', '/security', '/custom-pricing', '/login', '/signup', '/chat', '/analytics', '/meetings', '/spaces', '/dashboard', '/settings', '/support', '/search', '/record', '/watch', '/journey', '/decisions', '/integrations', '/action-items', '/knowledge-graph', '/timeline', '/health', '/integration-analytics', '/clipad'];
      const isClipadRoute = window.location.pathname === '/' || window.location.hostname.includes('Weftro') || window.location.hostname.includes('clipad') || clipadRoutes.some(r => r !== '/' && window.location.pathname.startsWith(r));

      if (isClipadRoute) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.type = 'image/svg+xml';
        link.href = '/clipad-logo.svg';
        if (window.location.pathname !== '/' && window.location.pathname !== '/pricing' && window.location.pathname !== '/security') {
          document.title = 'Weftro';
        }
      } else if (companyData) {
        if (companyData.favicon_url) {
          let link = document.querySelector("link[rel~='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
          }
          link.href = companyData.favicon_url;
        }
        if (companyData?.name) {
          let suffix = "Workspace";
          if (companyData.industry_type === 'law') suffix = "Law Management";
          else if (companyData.industry_type === 'school' || companyData.industry_type === 'highschool') suffix = "Education Platform";
          else if (companyData.industry_type === 'hospital') suffix = "Hospital System";
          else if (companyData.industry_type === 'hotel') suffix = "Property Management";
          else if (companyData.industry_type === 'orbit_build') suffix = "Digital Workspace";
          
          document.title = `${companyData?.name} - ${suffix}`;
        }
      }

      setAuthStep("Fetching available workspaces...");
      let availableCompanies = [];
      try {
        const emailParam = sessionUser.email ? sessionUser.email : '';
        
        // Execute PowerSync queries in parallel with a 2-second timeout limit
        const fetchWorkspacesPromise = (async () => {
          const [__resUA, __resSA, __resPU] = await Promise.all([
            powerSync.execute(`SELECT company_id FROM univ_accesscontrols WHERE email LIKE ?`, [emailParam]).catch(() => ({ rows: [] })),
            powerSync.execute(`SELECT company_id FROM staff_records WHERE user_email LIKE ?`, [emailParam]).catch(() => ({ rows: [] })),
            powerSync.execute(`SELECT company_id FROM portal_users WHERE email LIKE ?`, [emailParam]).catch(() => ({ rows: [] }))
          ]);

          const uAccess = __resUA.rows ? (__resUA.rows._array || Array.from(__resUA.rows)) : [];
          const sAccess = __resSA.rows ? (__resSA.rows._array || Array.from(__resSA.rows)) : [];
          const pAccess = __resPU.rows ? (__resPU.rows._array || Array.from(__resPU.rows)) : [];

          const cIds = new Set();
          if (profile?.company_id) cIds.add(profile.company_id);
          if (companyData?.id) cIds.add(companyData.id);
          (uAccess || []).forEach(r => r.company_id && cIds.add(r.company_id));
          (sAccess || []).forEach(r => r.company_id && cIds.add(r.company_id));
          (pAccess || []).forEach(r => r.company_id && cIds.add(r.company_id));

          if (cIds.size > 0) {
            const _cIdsArr = Array.from(cIds);
            if (_cIdsArr.length > 0) {
              const _plhdr = _cIdsArr.map(() => '?').join(',');
              const __resC = await powerSync.execute(`SELECT id, name, subdomain FROM companies WHERE id IN (${_plhdr})`, _cIdsArr).catch(() => ({ rows: [] }));
              return __resC.rows ? (__resC.rows._array || Array.from(__resC.rows)) : [];
            }
          }
          return [];
        })();

        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve([]), 2000));
        const comps = await Promise.race([fetchWorkspacesPromise, timeoutPromise]);
        if (comps) availableCompanies = comps;
      } catch(e) {
        console.error("Failed to fetch available workspaces:", e);
      }

      // MFA Enforcement Check
      if (companyData?.id) {
        setAuthStep("Verifying security requirements...");
        try {
          const { data: secSettings } = await supabase.from('company_security_settings').select('require_mfa').eq('company_id', companyData.id).maybeSingle();
          if (secSettings?.require_mfa) {
            const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            if (!mfaError) {
              if (mfaData.nextLevel === 'aal2' && mfaData.currentLevel !== 'aal2') {
                throw new Error("MFA is required by your workspace administrator. Please sign in with Two-Factor Authentication.");
              }
            }
          }
        } catch(e) {
          if (e.message.includes('MFA is required')) {
            throw e;
          }
          console.error("Security settings check failed:", e);
        }
      }

      let newUser = { 
        ...sessionUser, 
        ...profile, 
        companies: companyData,
        availableCompanies: availableCompanies
      };
      
      if (impersonatedCompany) {
        newUser = {
          ...newUser,
          company_id: impersonatedCompany.id,
          company_name: impersonatedCompany?.name,
          role: 'company_admin', // Treat them as admin of this firm
          is_impersonating: true,
          companies: impersonatedCompany
        };
      }

      const cleanLogo = (url) => {
        if (!url) return url;
        let finalUrl = url.trim();
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('/') && !finalUrl.startsWith('data:')) {
          finalUrl = 'https://' + finalUrl;
        }
        if (finalUrl.lastIndexOf('http') > 0) {
           const secondHttp = finalUrl.lastIndexOf('http');
           if (finalUrl.substring(0, secondHttp).includes('=')) {
              finalUrl = finalUrl.substring(secondHttp);
           }
        }
        return finalUrl;
      };

      let baseRole = profile?.role || sessionUser.user_metadata?.role;
      let effectiveStaffRole = staffRecord?.role;
      if (effectiveStaffRole === 'Company Admin' || effectiveStaffRole === 'Managing Partner') {
        effectiveStaffRole = 'company_admin';
      }
      
      newUser = { 
        ...newUser,
        role: ['super_admin', 'admin', 'company_admin', 'spaceman'].includes(baseRole) ? baseRole : (effectiveStaffRole || baseRole || 'lawyer'),
        company_logo_url: cleanLogo(companyData?.logo_url || null),
        company_name: companyData?.name || newUser?.company_name || sessionUser.user_metadata?.company_name || "Slate",
        company_industry: companyData?.industry_type || newUser?.industry_type || localStorage.getItem('slate_onboarding_industry') || 'law',
        company_currency: companyData?.currency || null,
        email: sessionUser.email, 
        full_name: staffRecord?.full_name || newUser?.full_name || sessionUser.user_metadata?.full_name || "Admin",
        avatar_url: sessionUser.user_metadata?.avatar_url || newUser?.avatar_url || null,
        subscription_plan: companyData?.subscription_plan || 'starter',
        clipad_plan: (() => {
          const role = profile?.role || sessionUser.user_metadata?.role;
          if (['super_admin', 'admin'].includes(role)) return 'enterprise';

          const planStr = (companyData?.subscription_plan || profile?.subscription_tier || '').toLowerCase().trim();
          const tagName = (companyData?.clipad_pricing_tags?.name || '').toLowerCase().trim();

          if (planStr.includes('enterprise') || tagName.includes('enterprise')) return 'enterprise';
          if (planStr.includes('pro') || planStr.includes('professional') || planStr.includes('firm_plus') || planStr.includes('starter') || tagName.includes('pro')) return 'pro';

          return 'free';
        })(),
        subscription_status: companyData?.subscription_status || 'trial',
        company_status: companyData?.status || 'active',
        company_created_date: companyData?.created_date || null,
        available_companies: availableCompanies
      };

      const updatedUser = userRef.current;
      const hasChanged = !updatedUser ||
        updatedUser.id !== newUser.id ||
        updatedUser.role !== newUser.role ||
        updatedUser.company_logo_url !== newUser.company_logo_url ||
        updatedUser.company_name !== newUser.company_name ||
        updatedUser.company_industry !== newUser.company_industry ||
        updatedUser.full_name !== newUser.full_name ||
        updatedUser.email !== newUser.email ||
        updatedUser.avatar_url !== newUser.avatar_url ||
        updatedUser.subscription_status !== newUser.subscription_status ||
        updatedUser.clipad_plan !== newUser.clipad_plan ||
        updatedUser.subscription_plan !== newUser.subscription_plan;

      if (hasChanged) {
        setAuthStep("Setting user...");
        setUser(newUser);
        saveAccount(sessionVal, newUser);
        identifyUser(newUser);
      }
      
      // Cache the fully constructed user profile for offline fallback
      try {
        localStorage.setItem('slate_cached_user', JSON.stringify(newUser));
      } catch (e) {}

      setIsAuthenticated(true);
      setAuthChecked(true);
    } catch (error) {
      if (error.message !== 'Not logged in') {
        console.error('User auth check failed:', error);
      }
      
      // OFFLINE FALLBACK: If we are offline OR any network error occurred,
      // try to use the cached user profile so the app doesn't kick to login
      const isNetworkError = !navigator.onLine || 
        error.message?.includes('Failed to fetch') || 
        error.message?.includes('NetworkError') ||
        error.message?.includes('ERR_INTERNET_DISCONNECTED') ||
        error.message?.includes('Too Many Requests') ||
        (error.message === 'Not logged in' && !navigator.onLine) ||
        error.status === 429 ||
        error.status >= 500 ||
        error.code === 'PGRST116' ||
        error.name === 'AuthRetryableFetchError' ||
        error.name === 'TypeError';
        
      if (isNetworkError) {
        try {
          const cachedUserRaw = localStorage.getItem('slate_cached_user');
          if (cachedUserRaw) {
            console.warn("Offline mode active: Auth fetch failed. Using cached user profile.");
            const cachedUser = JSON.parse(cachedUserRaw);
            setUser(cachedUser);
            setIsAuthenticated(true);
            setAuthChecked(true);
            setIsLoadingAuth(false);
            isCheckingRef.current = false;
            return;
          }
        } catch (e) {}
      }

      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: 'Not logged in' });
      setAuthChecked(true);
    } finally {
      setAuthStep("Done");
      setIsLoadingAuth(false);
      isCheckingRef.current = false;
    }
  }, []);

  // Listen to auth state changes from Supabase
  useEffect(() => {
    let isMounted = true;

    // Step 1: Perform the initial auth check ourselves.
    // We do NOT rely on onAuthStateChange's INITIAL_SESSION event because
    // it fires with null when there are cross-domain URL tokens that haven't
    // been processed yet, causing a flash redirect to /login.
    const initAuth = async () => {
      if (hasInitializedRef.current) return;
      hasInitializedRef.current = true;
      await checkUserAuth(null);
    };
    initAuth();

    // Step 2: Listen to SUBSEQUENT auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;
      
      // Skip the INITIAL_SESSION event - we handle init ourselves above
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_OUT') {
        if (!isExplicitLogoutRef.current) {
          // Distinguish between offline-triggered sign out vs. genuine invalid refresh token.
          // If the device is online, this means the refresh token is truly invalid → must re-login.
          if (navigator.onLine) {
            console.warn("Session token invalid while online. Clearing stale session and prompting re-login.");
            try { localStorage.removeItem('slate_cached_user'); } catch(e) {}
            setUser(null);
            setIsAuthenticated(false);
            setIsLoadingAuth(false);
            setAuthChecked(true);
          } else {
            // Offline-triggered: ignore it to allow the offline fallback cache to work!
            console.warn("Ignored implicit SIGNED_OUT event to preserve offline mode cache.");
          }
          return;
        }

        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        // Clear cached user on explicit sign out
        try { localStorage.removeItem('slate_cached_user'); } catch(e) {}
        return;
      }

      if (newSession) {
        // For SIGNED_IN, TOKEN_REFRESHED events
        checkUserAuth(newSession).then((userData) => {
          // Log security event for explicit sign ins
          if (event === 'SIGNED_IN' && userData?.company_id) {
            supabase.from('clipad_org_events').insert({
              workspace_id: userData.company_id,
              type: 'security',
              title: 'User logged in securely',
              user_id: userData.id
            }).then();
          }
        }).catch(() => {});
      }
    });

    // Step 3: Listen for Global Security Broadcasts (e.g. Force Logout)
    const securityChannel = supabase.channel('global_security')
      .on('broadcast', { event: 'FORCE_LOGOUT' }, async (payload) => {
        if (!isMounted) return;
        const targetUserId = payload.payload?.userId;
        const currentUser = userRef.current;
        
        if (currentUser && currentUser.id === targetUserId) {
          console.warn("Received FORCE_LOGOUT signal from super admin. Logging out...");
          isExplicitLogoutRef.current = true;
          // Clear local storage and sign out from Supabase (locally to preserve SSO for other apps)
          try { localStorage.removeItem('slate_cached_user'); } catch(e) {}
          await supabase.auth.signOut({ scope: 'local' });
          
          // Force a full page reload so they are kicked to the login screen
          window.location.reload();
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      supabase.removeChannel(securityChannel);
    };
  }, [checkUserAuth]);

  const refreshUser = useCallback(async () => {
    await checkUserAuth(null, true);
    return userRef.current;
  }, [checkUserAuth]);

  const logout = useCallback(async (shouldRedirect = true, preserveSavedAccount = true) => {
    isExplicitLogoutRef.current = true;
    
    const currentUser = userRef.current;
    if (currentUser) {
      if (preserveSavedAccount) {
        markAccountLoggedOut(currentUser.id);
      } else {
        removeAccount(currentUser.id);
      }
      // Log logout security event safely without blocking the logout operation
      if (currentUser.company_id) {
        (async () => {
          try {
            // Use a short timeout so a network freeze or CORS preflight block doesn't halt logout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1500);
            await supabase.from('clipad_org_events').insert({
              workspace_id: currentUser.company_id,
              type: 'security',
              title: 'User logged out securely',
              user_id: currentUser.id
            }).abortSignal(controller.signal);
            clearTimeout(timeoutId);
          } catch (e) {
            console.warn("Could not log logout event to server:", e);
          }
        })();
      }
    }
    
    const isRootAccount = window.location.hostname.startsWith('account.');
    if (isRootAccount) {
      await supabase.auth.signOut();
    } else {
      await supabase.auth.signOut({ scope: 'local' });
    }
    
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      if (isDesktopApp()) {
        window.location.hash = '/login';
      } else {
        window.location.href = '/login';
      }
    }
  }, []);

  const navigateToLogin = useCallback(() => {
    if (isDesktopApp()) {
      window.location.hash = '/login';
    } else {
      window.location.href = '/login';
    }
  }, []);

  const switchAccount = useCallback(async (targetAccountId) => {
    try {
      setIsLoadingAuth(true);
      const accounts = getSavedAccounts();
      const targetAccount = accounts.find(a => a.id === targetAccountId);
      
      if (targetAccount && targetAccount.access_token) {
        // Clear cached profile & onboarding industry so re-fetch happens for the target account
        localStorage.removeItem('slate_cached_user');
        localStorage.removeItem('slate_onboarding_industry');

        // Update target account last_active timestamp
        targetAccount.last_active = new Date().toISOString();
        const updatedAccounts = accounts.map(a => a.id === targetAccountId ? targetAccount : a);
        localStorage.setItem('optavel_saved_accounts', JSON.stringify(updatedAccounts));

        // Formally set session in Supabase JS Client so memory, storage keys, and auth listeners sync to target account
        const { data, error } = await supabase.auth.setSession({
          access_token: targetAccount.access_token,
          refresh_token: targetAccount.refresh_token
        });

        if (error || !data?.session) {
          // If setSession fails (e.g. refresh token expired), try with access_token fallback
          const sessionVal = {
            access_token: targetAccount.access_token,
            refresh_token: targetAccount.refresh_token,
            user: {
              id: targetAccount.id,
              email: targetAccount.email,
              user_metadata: {
                full_name: targetAccount.full_name,
                avatar_url: targetAccount.avatar_url
              }
            }
          };

          const url = import.meta.env.VITE_SUPABASE_URL || '';
          const projectId = url.split('//')[1]?.split('.')[0] || 'app';
          localStorage.setItem(`sb-${projectId}-auth-token`, JSON.stringify(sessionVal));
        }

        // Force a page reload so PowerSync, React Query, and AuthContext re-initialize with the target account
        window.location.reload();
      } else {
        throw new Error("No tokens found for target account");
      }
    } catch (e) {
      console.warn("Failed to switch account transparently, forcing login...", e);
      const accounts = getSavedAccounts();
      const acc = accounts.find(a => a.id === targetAccountId);
      if (acc?.email) {
        window.location.href = `/login?prompt=login&email=${encodeURIComponent(acc.email)}`;
      } else {
        window.location.href = `/login?prompt=login`;
      }
    }
  }, []);

  const isPortalUser = user?.role ? PORTAL_ROLES.includes(user.role.toLowerCase()) : false;

  const contextValue = useMemo(() => ({
    user, 
    isPortalUser,
    isAuthenticated, 
    isLoadingAuth,
    authStep,
    isLoadingPublicSettings,
    authError,
    appPublicSettings,
    authChecked,
    logout,
    navigateToLogin,
    switchAccount,
    checkUserAuth,
    checkAppState,
    refreshUser
  }), [
    user,
    isPortalUser,
    isAuthenticated,
    isLoadingAuth,
    authStep,
    isLoadingPublicSettings,
    authError,
    appPublicSettings,
    authChecked,
    logout,
    navigateToLogin,
    switchAccount,
    checkUserAuth,
    checkAppState,
    refreshUser
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
