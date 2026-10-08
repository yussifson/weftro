import { supabase } from '@/api/supabaseClient';
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { powerSync } from "@/api/PowerSyncConnector";
import { useAuth } from './AuthContext';
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState(() => {
    // 1. Check local storage for quick sync to prevent flash on load
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    return 'light';
  });

  const isUpdatingRef = useRef(false);

  // Apply theme class to document
  const applyTheme = (themeName) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    // Force light mode on marketing pages regardless of user setting
    const path = window.location.pathname;
    const isMarketingPage = ['/', '/features', '/solutions', '/pricing', '/login', '/signup', '/custom-pricing', '/landing', '/home', '/marketing', '/about', '/meet'].includes(path);

    if (isMarketingPage) {
      root.classList.add('light');
      root.style.colorScheme = 'light';
      return;
    }

    if (themeName === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      root.style.colorScheme = systemTheme;
    } else {
      root.classList.add(themeName);
      root.style.colorScheme = themeName;
    }
  };

  // Run on mount and whenever theme changes
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle system theme updates dynamically
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyTheme('system');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Sync with user database theme once user session resolves
  // Sync with user database theme once user session resolves
  useEffect(() => {
    if (user && user.user_metadata?.theme) {
      const userTheme = user.user_metadata.theme;
      const syncedUserId = localStorage.getItem('theme_synced_user_id');
      
      // If we haven't synced this user's theme to this device yet, apply it
      if (syncedUserId !== user.id) {
        if (userTheme !== theme) {
          setThemeState(userTheme);
        }
        localStorage.setItem('theme_synced_user_id', user.id);
      }
    }
  }, [user]);

  const changeTheme = async (newTheme) => {
    if (newTheme === theme) return;
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);

    // If user is authenticated, save the preference in Supabase auth user_metadata
    if (user && !isUpdatingRef.current) {
      isUpdatingRef.current = true;
      localStorage.setItem('theme_synced_user_id', user.id);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          const { error } = await supabase.auth.updateUser({
            data: { theme: newTheme }
          });
          if (error && error.name !== 'AuthSessionMissingError') {
            console.error('Failed to persist theme preference on server:', error);
          }
        }
      } catch (err) {
        // Suppress expected auth errors for non-critical theme updates
      } finally {
        isUpdatingRef.current = false;
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
