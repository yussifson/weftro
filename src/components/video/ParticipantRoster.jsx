import React, { useState, useMemo } from 'react';
import { 
  useParticipantIds, 
  useLocalSessionId, 
  useParticipant, 
  useAudioTrack, 
  useVideoTrack, 
  useActiveSpeakerId 
} from '@daily-co/daily-react';
import { Users, Mic, MicOff, Video, VideoOff, Volume2, Shield, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

function RosterItem({ id, isLocal, activeSpeakerId, hostId }) {
  const participant = useParticipant(id);
  const audioTrack = useAudioTrack(id);
  const videoTrack = useVideoTrack(id);

  const isMuted = audioTrack?.state !== 'playable';
  const isVideoOff = videoTrack?.state !== 'playable';
  // Mute state is distinct from speaking state: a participant is only speaking if activeSpeakerId matches AND participant is not muted
  const isActiveSpeaker = Boolean(activeSpeakerId && activeSpeakerId === id);
  const isSpeaking = Boolean(isActiveSpeaker && !isMuted);

  const rawName = participant?.user_name || (isLocal ? 'You' : 'Participant');
  const displayName = rawName
    .replace(/^optavel\//i, '')
    .replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, isLocal ? 'You' : 'Participant')
    .replace(/^[a-z0-9]{10,}$/i, isLocal ? 'You' : 'Participant');

  const initials = (displayName || 'P').substring(0, 2).toUpperCase();
  const isHostParticipant = (hostId && participant?.user_id === hostId) || participant?.owner;

  return (
    <div 
      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
        isSpeaking 
          ? 'bg-[#00beac]/10 border-[#00beac]/40 shadow-sm' 
          : 'bg-slate-50 dark:bg-[#15262D] border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-[#1C333C]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold shadow-inner">
            {initials}
          </div>
          {isSpeaking && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00beac] border-2 border-white dark:border-[#101D22] flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </span>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate text-slate-800 dark:text-slate-100">
              {displayName}
            </span>
            {isLocal && (
              <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">
                You
              </span>
            )}
            {isHostParticipant && (
              <span className="text-[10px] bg-amber-500/10 text-amber-500 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Shield className="w-2.5 h-2.5" /> Host
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {isSpeaking ? (
              <span className="text-[#00beac] font-medium flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> Speaking
              </span>
            ) : isMuted ? (
              'Muted'
            ) : (
              'Microphone on'
            )}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        <div 
          className={`p-1.5 rounded-lg ${
            isMuted 
              ? 'text-red-500 bg-red-50 dark:bg-red-950/40' 
              : 'text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-white/5'
          }`}
          title={isMuted ? 'Microphone muted' : 'Microphone on'}
          aria-label={isMuted ? 'Microphone muted' : 'Microphone on'}
        >
          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-500" />}
        </div>
        <div 
          className={`p-1.5 rounded-lg ${
            isVideoOff 
              ? 'text-slate-400 bg-slate-200/50 dark:bg-white/5' 
              : 'text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-white/5'
          }`}
          title={isVideoOff ? 'Camera off' : 'Camera on'}
          aria-label={isVideoOff ? 'Camera off' : 'Camera on'}
        >
          {isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5 text-emerald-500" />}
        </div>
      </div>
    </div>
  );
}

export default function ParticipantRoster({ onClose, hostId }) {
  const localSessionId = useLocalSessionId();
  const remoteParticipantIds = useParticipantIds({ filter: 'remote' });
  const activeSpeakerId = useActiveSpeakerId();
  const [searchTerm, setSearchTerm] = useState('');

  // Stable ordering: local participant first, then sorted remote participants
  const allParticipantIds = useMemo(() => {
    return [localSessionId, ...remoteParticipantIds].filter(Boolean);
  }, [localSessionId, remoteParticipantIds]);

  const totalCount = allParticipantIds.length;

  return (
    <div 
      className="w-80 border-l border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d151c] flex flex-col shrink-0 animate-in slide-in-from-right shadow-2xl z-40 transition-colors h-full"
      role="region"
      aria-label="Participants"
    >
      {/* Header */}
      <div className="h-14 border-b border-primary/40 flex items-center justify-between px-4">
        <h3 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-white">
          <Users className="w-4 h-4 text-primary" /> 
          Participants
          <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full ml-1">
            {totalCount}
          </span>
        </h3>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-slate-500 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-accent rounded-full" 
          onClick={onClose}
          aria-label="Close roster"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Optional Search / Filter */}
      {totalCount > 5 && (
        <div className="p-3 border-b border-slate-100 dark:border-white/5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search participants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      )}

      {/* Participant list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {allParticipantIds.map((id) => (
          <RosterItem 
            key={id} 
            id={id} 
            isLocal={id === localSessionId}
            activeSpeakerId={activeSpeakerId}
            hostId={hostId}
          />
        ))}
      </div>
    </div>
  );
}
