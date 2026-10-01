import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useVideo } from '@/lib/VideoContext';
import { useAuth } from '@/lib/AuthContext';
import VideoRoom from './VideoRoom';
import { Video, PhoneOff } from 'lucide-react';

export default function GlobalVideoOverlay() {
  const { activeRoomUrl, isPipMode, leaveRoom, togglePipMode } = useVideo();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!activeRoomUrl) return null;

  const isBoard = location.pathname === '/board';
  const effectivePipMode = isPipMode || !isBoard;

  return (
    <>
      {/* ── Floating PiP Video Window ── */}
      <div
        className={`transition-all duration-300 z-40 ${
          effectivePipMode
            ? 'fixed bottom-6 right-6 w-[360px] h-[240px] rounded-xl overflow-hidden ring-2 ring-green-500/40'
            : 'absolute inset-0 bg-background'
        }`}
      >
        {/* Fix #5: Pass userName so the user has an identity in PiP mode */}
        <VideoRoom
          roomUrl={activeRoomUrl}
          userName={user?.full_name || user?.email || 'Guest'}
          onLeave={leaveRoom}
          isPipMode={effectivePipMode}
          togglePipMode={togglePipMode}
        />

        {/* Green "LIVE" badge on the PiP window */}
        {effectivePipMode && (
          <div className="absolute top-2 left-2 flex items-center gap-2.5 bg-primary/20 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full pointer-events-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500/10" />
            </span>
            LIVE
          </div>
        )}

        {/* Quick controls on PiP window */}
        {effectivePipMode && (
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              onClick={() => navigate('/board')}
              title="Go to Board"
              className="w-7 h-7 rounded-full bg-primary/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-green-600 transition-colors"
            >
              <Video className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={leaveRoom}
              title="End Call"
              className="w-7 h-7 rounded-full bg-primary/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Top notification banner (shown on all pages when in PiP) ── */}
      {effectivePipMode && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-2 bg-green-600 text-white text-sm font-medium animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <span>You have an ongoing video call</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/board')}
              className="px-3 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors tracking-[0.04em]"
            >
              Return to Call
            </button>
            <button
              onClick={leaveRoom}
              className="px-3 py-0.5 rounded-full bg-red-500/10 hover:bg-red-500/30 text-white text-xs font-semibold transition-colors flex items-center gap-2 tracking-[0.04em]"
            >
              <PhoneOff className="w-3 h-3" /> End
            </button>
          </div>
        </div>
      )}
    </>
  );
}
