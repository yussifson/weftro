import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, Video, Hash, Calendar, Settings, Activity } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DialogTitle } from "@/components/ui/dialog";

export default function CliPadCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ spaces: [], docs: [], channels: [], videos: [], meetings: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const companyId = user?.company_id;

  // Global Keyboard shortcut: CMD+K / CTRL+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || !companyId) {
      setResults({ spaces: [], docs: [], channels: [], videos: [] });
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const q = query.toLowerCase();
        
        // Fetch all relevant clipad tables — scoped to company to prevent cross-tenant leaks
        const [spacesRes, docsRes, channelsRes, videosRes, meetingsRes] = await Promise.all([
          Promise.resolve(supabase.from('clipad_spaces').select('id, name').eq('company_id', companyId).ilike('name', `%${q}%`).limit(5)).catch(() => ({ data: [] })),
          Promise.resolve(supabase.from('clipad_docs').select('id, space_id, title').eq('company_id', companyId).ilike('title', `%${q}%`).limit(5)).catch(() => ({ data: [] })),
          Promise.resolve(supabase.from('clipad_channels').select('id, space_id, name').ilike('name', `%${q}%`).limit(5)).catch(() => ({ data: [] })),
          Promise.resolve(supabase.from('clipad_videos').select('id, space_id, title').ilike('title', `%${q}%`).limit(5)).catch(() => ({ data: [] })),
          Promise.resolve(supabase.from('clipad_meeting_records').select('id, title').eq('company_id', companyId).ilike('title', `%${q}%`).limit(5)).catch(() => ({ data: [] })),
        ]);

        setResults({
          spaces: spacesRes.data || [],
          docs: docsRes.data || [],
          channels: channelsRes.data || [],
          videos: videosRes.data || [],
          meetings: meetingsRes.data || [],
        });
      } catch (err) {
        console.error("KERINT search failed", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query, companyId]);

  const handleSelect = (route) => {
    setIsOpen(false);
    navigate(route);
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTitle className="sr-only">Command Palette</DialogTitle>
      <CommandInput 
        placeholder="Type a command or search spaces, docs, channels..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{loading ? "Searching..." : "No results found."}</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => handleSelect('/record')}>
            <Video className="mr-2 h-4 w-4 text-rose-500" />
            <span>Start Video Recording</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('/clipad/dashboard')}>
            <Calendar className="mr-2 h-4 w-4 text-[#006065]" />
            <span>Executive Daily Briefing</span>
          </CommandItem>

          <CommandItem onSelect={() => handleSelect('/timeline')}>
            <Activity className="mr-2 h-4 w-4 text-cyan-500" />
            <span>Organizational Timeline</span>
          </CommandItem>
        </CommandGroup>

        {results.spaces.length > 0 && (
          <CommandGroup heading="Spaces">
            {results.spaces.map(space => (
              <CommandItem key={`space-${space.id}`} onSelect={() => handleSelect(`/clipad/spaces/${space.id}`)}>
                <Activity className="mr-2 h-4 w-4" />
                <span>{space.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        
        {results.docs.length > 0 && (
          <CommandGroup heading="Docs">
            {results.docs.map(doc => (
              <CommandItem key={`doc-${doc.id}`} onSelect={() => handleSelect(`/clipad/spaces/${doc.space_id}`)}>
                <FileText className="mr-2 h-4 w-4" />
                <span>{doc.title || 'Untitled Doc'}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.channels.length > 0 && (
          <CommandGroup heading="Channels">
            {results.channels.map(channel => (
              <CommandItem key={`channel-${channel.id}`} onSelect={() => handleSelect(`/clipad/spaces/${channel.space_id}`)}>
                <Hash className="mr-2 h-4 w-4" />
                <span>{channel.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.videos.length > 0 && (
          <CommandGroup heading="Videos">
            {results.videos.map(video => (
              <CommandItem key={`video-${video.id}`} onSelect={() => handleSelect(`/clipad/watch/${video.id}`)}>
                <Video className="mr-2 h-4 w-4" />
                <span>{video.title || 'Untitled Video'}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.meetings?.length > 0 && (
          <CommandGroup heading="Meetings">
            {results.meetings.map(meeting => (
              <CommandItem key={`meeting-${meeting.id}`} onSelect={() => handleSelect(`/clipad/meeting/${meeting.id}`)}>
                <Calendar className="mr-2 h-4 w-4 text-blue-500" />
                <span>{meeting.title || 'Untitled Meeting'}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

