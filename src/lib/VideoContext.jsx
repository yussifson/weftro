import React, { createContext, useContext, useState, useEffect } from 'react';

const VideoContext = createContext();

const STORAGE_KEY = 'slate_active_call_url';

export function VideoProvider({ children }) {
  // Initialize from sessionStorage so call survives page refresh
  const [activeRoomUrl, setActiveRoomUrl] = useState(() => {
    try { return sessionStorage.getItem(STORAGE_KEY) || null; }
    catch { return null; }
  });
  const [isPipMode, setIsPipMode] = useState(false);

  // Keep sessionStorage in sync with state
  useEffect(() => {
    try {
      if (activeRoomUrl) {
        sessionStorage.setItem(STORAGE_KEY, activeRoomUrl);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch { /* ignore */ }
  }, [activeRoomUrl]);

  const joinRoom = (url) => {
    setActiveRoomUrl(url);
    setIsPipMode(false);
  };

  const leaveRoom = () => {
    setActiveRoomUrl(null);
    setIsPipMode(false);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  const togglePipMode = () => {
    setIsPipMode((prev) => !prev);
  };

  return (
    <VideoContext.Provider value={{ activeRoomUrl, isPipMode, joinRoom, leaveRoom, togglePipMode }}>
      {children}
    </VideoContext.Provider>
  );
}

export function useVideo() {
  const context = useContext(VideoContext);
  if (context === undefined) {
    throw new Error('useVideo must be used within a VideoProvider');
  }
  return context;
}
