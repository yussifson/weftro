import { supabase} from '@/api/supabaseClient';
import React, { useState, useEffect, useRef} from "react";
import {Search, Plus, MessageSquare, MoreVertical, Send, Sparkles, Hash, Users, UserCircle, Phone, Video, X, Paperclip, CheckCheck, Image as ImageIcon, FileText, Check, Smile, File} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import { cn} from "@/lib/utils";
import { createPortal } from "react-dom";
import { useAuth} from "@/lib/AuthContext";
import { Button} from "@/components/ui/button";
import { generateText} from "@/lib/cloudflareAI";
import { powerSync} from "@/api/PowerSyncConnector";
import AddChatDialog from "./AddChatDialog";
import { useToast} from "@/components/ui/use-toast";
import { format} from "date-fns";
import { OrbitLoader } from "@/components/ui/orbit-loader";
import ThinkingAccordion, { parseThinking } from "./ThinkingAccordion";

export default function GlobalChatPanel({ isOpen, onClose}) {
 const { user} = useAuth();
 const { toast} = useToast();
 const [activeTab, setActiveTab] = useState("recent");
 const [rooms, setRooms] = useState([]);
 const [activeRoomId, setActiveRoomId] = useState(null);
 const [messages, setMessages] = useState([]);
 const [inputValue, setInputValue] = useState("");
 const [isAddChatOpen, setIsAddChatOpen] = useState(false);
 const [loadingRooms, setLoadingRooms] = useState(false);
 const [loadingMessages, setLoadingMessages] = useState(false);
 const [isUploading, setIsUploading] = useState(false);
 const [showEmojiPicker, setShowEmojiPicker] = useState(false);
 const [showAttachMenu, setShowAttachMenu] = useState(false);
 
 const messagesEndRef = useRef(null);
 const fileInputRef = useRef(null);

 // Load Rooms
 useEffect(() => {
 if (!isOpen || !user?.id) return;
 loadRooms();
 
 const roomSub = supabase.channel('room-updates')
 .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${user.id}`}, () => {
 loadRooms();
})
 .subscribe();
 
 return () => {
 supabase.removeChannel(roomSub);
};
}, [isOpen, user?.id]);

 const loadRooms = async () => {
 setLoadingRooms(true);
 try {
 // Find all rooms this user is in
 const { data: participants} = await supabase
 .from('chat_participants')
 .select('room_id')
 .eq('user_id', user.id);
 
 if (participants && participants.length > 0) {
 const roomIds = participants.map(p => p.room_id);
 
 // Load the room details
 const { data: roomsData} = await supabase
 .from('chat_rooms')
 .select(`
 *,
 chat_participants ( user_id, role, last_read_at )
 `)
 .in('id', roomIds)
 .order('updated_at', { ascending: false});
 
 setRooms(roomsData || []);
} else {
 setRooms([]);
}
} catch (err) {
 console.error(err);
} finally {
 setLoadingRooms(false);
}
};

 // Load Messages for Active Room
 useEffect(() => {
 if (!activeRoomId) return;
 loadMessages(activeRoomId);
 
 // Update last_read_at when opening room
 supabase.from('chat_participants').update({ last_read_at: new Date().toISOString()})
 .eq('room_id', activeRoomId).eq('user_id', user.id).then();

 const messageSub = supabase.channel(`messages-${activeRoomId}`)
 .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages'}, (payload) => {
 if (payload.new.room_id === activeRoomId) {
 setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
 // Mark as read immediately if we are in the room
 if (payload.new.sender_id !== user.id) {
 supabase.from('chat_participants').update({ last_read_at: new Date().toISOString()})
 .eq('room_id', activeRoomId).eq('user_id', user.id).then();
}
}
 setRooms(prev => prev.map(r => r.id === payload.new.room_id ? { ...r, updated_at: new Date().toISOString()} : r));
})
 .subscribe();
 
 return () => {
 supabase.removeChannel(messageSub);
};
}, [activeRoomId]);

 const [participantProfiles, setParticipantProfiles] = useState({});
 const [replyTo, setReplyTo] = useState(null);
 const [editingMsg, setEditingMsg] = useState(null);

 const loadMessages = async (roomId) => {
 setLoadingMessages(true);
 try {
 const { data} = await supabase
 .from('chat_messages')
 .select('*')
 .eq('room_id', roomId)
 .order('created_at', { ascending: true});
 setMessages(data || []);

 // Pre-load participant profiles based on message senders instead of room participants
 if (data && data.length > 0) {
 const senderIds = [...new Set(data.map(m => m.sender_id).filter(Boolean))];
 if (senderIds.length > 0) {
 const { data: profiles} = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', senderIds);
 if (profiles) {
 const pMap = {};
 profiles.forEach(p => pMap[p.id] = p);
 setParticipantProfiles(pMap);
}
}
}
} catch (err) {
 console.error(err);
} finally {
 setLoadingMessages(false);
}
};

 // Scroll to bottom
 useEffect(() => {
 if (messagesEndRef.current) {
 messagesEndRef.current.scrollIntoView({ behavior: "smooth"});
}
}, [messages]);

 const handleSend = async () => {
 if (!inputValue.trim() || !activeRoomId) return;
 
 const text = inputValue.trim();
 setInputValue("");
 
 try {
 if (editingMsg) {
 (async () => {
 const _payload = {
 content: text,
 is_edited: true
};
 const _keys = Object.keys(_payload);
 const _vals = Object.values(_payload).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
 await powerSync.execute(`UPDATE chat_messages SET ${_keys.map(k => k+' = ?').join(', ')} WHERE id = ?`, [..._vals, editingMsg.id]);
})();
 const error = null;
 if (error) throw error;
 setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content: text, is_edited: true} : m));
 setEditingMsg(null);
} else {
 (async () => {
 const _payload = {
 id: crypto.randomUUID(),
 room_id: activeRoomId,
 sender_id: user.id,
 content: text,
 reply_to_id: replyTo?.id || null
};
 const _keys = Object.keys(_payload);
 const _vals = Object.values(_payload).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
 const _plhdr = _keys.map(()=>'?').join(', ');
 await powerSync.execute(`INSERT INTO chat_messages (${_keys.join(', ')}) VALUES (${_plhdr})`, _vals);
})();
 const error = null;
 if (error) throw error;
 setReplyTo(null);
}
 
 // Update room timestamp
 await (async () => {
 const _payload = { updated_at: new Date().toISOString()};
 const _keys = Object.keys(_payload);
 const _vals = Object.values(_payload).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
 await powerSync.execute(`UPDATE chat_rooms SET ${_keys.map(k => k+' = ?').join(', ')} WHERE id = ?`, [..._vals, activeRoomId]);
})();
} catch (err) {
 toast({ title: "Error", description: "Failed to send message", variant: "destructive"});
}
};

 const handleFileUpload = async (e, type) => {
 const file = e.target.files?.[0];
 if (!file || !activeRoomId) return;
 
 // File upload limit 50MB
 if (file.size > 50 * 1024 * 1024) {
 toast({ title: "Error", description: "File exceeds 50MB limit", variant: "destructive"});
 return;
}
 
 setIsUploading(true);
 try {
 // Create a unique file name
 const fileExt = file.name.split('.').pop();
 const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
 const filePath = `${activeRoomId}/${fileName}`;
 
 // Attempt to upload to a 'chat_attachments' bucket (requires bucket to exist)
 let fileUrl = "";
 const { data, error: uploadError} = await supabase.storage.from('chat_attachments').upload(filePath, file);
 
 if (uploadError) {
 // Fallback if bucket doesn't exist, just send a text message for now
 console.warn("Storage upload failed, falling back to text. Make sure 'chat_attachments' bucket exists and is public.");
 const { error} = await supabase.from('chat_messages').insert({
 room_id: activeRoomId,
 sender_id: user.id,
 content: `[File Shared: ${file.name}] (Storage bucket not configured)`
});
 if (error) throw error;
 return;
}
 
 const { data: publicUrlData} = supabase.storage.from('chat_attachments').getPublicUrl(filePath);
 fileUrl = publicUrlData.publicUrl;

 // Type determination
 let mimePrefix = "data:application";
 if (file.type.startsWith("image/")) mimePrefix = "data:image";
 if (file.type.startsWith("video/")) mimePrefix = "data:video";

 const content = `[Attachment|${file.name}|${fileUrl}|${mimePrefix}]`;
 
 (async () => {
 const _payload = {
 id: crypto.randomUUID(),
 room_id: activeRoomId,
 sender_id: user.id,
 content: content
};
 const _keys = Object.keys(_payload);
 const _vals = Object.values(_payload).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
 const _plhdr = _keys.map(()=>'?').join(', ');
 await powerSync.execute(`INSERT INTO chat_messages (${_keys.join(', ')}) VALUES (${_plhdr})`, _vals);
})();
 const error = null;
 if (error) throw error;
} catch (err) {
 toast({ title: "Error", description: "Failed to upload file", variant: "destructive"});
} finally {
 setIsUploading(false);
}
};

 const handleAiAssist = async () => {
 if (!inputValue.trim()) return;
 
 const originalInput = inputValue;
 setInputValue("AI is thinking...");
 
 try {
 // Provide recent chat history for context if available
 const chatHistory = messages.slice(-5).map(m => `${m.sender_id === user.id ? 'Me' : 'Them'}: ${m.content}`).join('\n');
 const messagesPayload = [
 { role: 'system', content: `You are an AI assistant embedded in a chat app. Your job is to rewrite the user's DRAFT message to be clearer, more professional, and contextually appropriate based on the recent chat history. Return ONLY the rewritten text.\n\nRecent Chat History:\n${chatHistory}`},
 { role: 'user', content: originalInput}
 ];
 
 const response = await generateText(messagesPayload);
 setInputValue(response || originalInput);
} catch (error) {
 console.error("AI Assist failed:", error);
 toast({ title: "AI Error", description: "Could not connect to Cloudflare AI.", variant: "destructive"});
 setInputValue(originalInput);
}
};

  const content = (
  <>
 {/* Mobile Backdrop */}
 {isOpen && (
 <div className="md:hidden fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-[2px] transition-opacity" onClick={onClose} />
 )}
 
 <div 
 className={`flex flex-col bg-card z-[70] transition-all duration-300 overflow-hidden ${
 // Mobile: Bottom Sheet
 isOpen ? "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:h-[85vh] max-md:rounded-md-t-[32px] max-md: max-md:pb-[env(safe-area-inset-bottom)] max-md:translate-y-0 max-md:opacity-100" : "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:h-0 max-md:translate-y-full max-md:opacity-0 max-md:pointer-events-none"
} ${
 // Desktop: Side Panel
 isOpen ? "md:relative md:h-full md:shrink-0 md:border-l md:border-primary/40 md:w-[450px] md:opacity-100" : "md:h-full md:w-0 md:opacity-0 md:border-none md:pointer-events-none"
}`}
 >
 {/* Mobile Drag Handle */}
 <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0 bg-[#f0f2f5] dark:bg-[#202c33]">
 <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
 </div>
 
 <AddChatDialog 
 open={isAddChatOpen} 
 onOpenChange={setIsAddChatOpen} 
 onChatCreated={(room) => {
 setRooms(prev => [room, ...prev]);
 setActiveRoomId(room.id);
}}
 />

 {/* Header */}
 <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-primary/40 shrink-0">
 <div className="flex items-center gap-3">
 {activeRoomId ? (
 <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2" onClick={() => setActiveRoomId(null)}>
 &larr; Back
 </Button>
 ) : (
 <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
 {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover"/> : <MessageSquare className="w-5 h-5 text-primary" />}
 </div>
 )}
 <div>
 <h2 className="font-semibold text-foreground leading-tight">
 {activeRoomId ? (rooms.find(r => r.id === activeRoomId)?.name || 'Direct Chat') : 'Chats'}
 </h2>
 </div>
 </div>
 <div className="flex items-center gap-2 text-[#54656f] dark:text-[#aebac1]">
 <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full hover:bg-primary/20" onClick={() => setIsAddChatOpen(true)}>
 <Plus className="w-5 h-5" />
 </Button>
 <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-colors" onClick={onClose}>
 <X className="w-4 h-4" />
 </Button>
 </div>
 </div>

 {/* Main Content Area */}
 <div className="flex-1 overflow-hidden flex flex-col bg-[#efeae2] dark:bg-[#0b141a] relative">
 {/* Chat Background Pattern (WhatsApp style) */}
 <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.03] pointer-events-none bg-[url('https://static.whatsapp.net/rsrc.php/v3/yl/r/1-vpMpu-EPE.png')]" />

 {!activeRoomId ? (
 /* Room List */
 <div className="flex-1 overflow-y-auto bg-background z-10 flex flex-col">
 <div className="p-2">
 <div className="relative">
 <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#71717a] dark:text-gray-400" />
 <input
 type="text"
 placeholder="Search or start new chat"
 className="w-full pl-9 pr-4 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-none rounded-xl text-sm focus:ring-0 focus:outline-none"
 />
 </div>
 </div>
 <div className="flex-1 overflow-y-auto">
 {loadingRooms ? (
 <div className="flex justify-center p-8"><OrbitLoader size="md" /></div>
 ) : rooms.length > 0 ? (
 rooms.map(room => (
 <div 
 key={room.id} 
 onClick={() => setActiveRoomId(room.id)}
 className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] transition-colors group"
 >
 <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
 <span className="text-sm font-semibold text-primary">{room.name ? room.name[0].toUpperCase() : 'U'}</span>
 </div>
 <div className="flex-1 min-w-0 border-b border-primary/40 group-last:border-none pb-3">
 <div className="flex justify-between items-baseline mb-0.5">
 <p className="text-base text-foreground truncate">{room.name || 'Direct Chat'}</p>
 <p className="text-xs text-[#71717a] dark:text-gray-400 tracking-[0.04em]">{format(new Date(room.updated_at), 'h:mm a')}</p>
 </div>
 <p className="text-sm text-[#71717a] dark:text-gray-400 truncate">Click to view messages...</p>
 </div>
 </div>
 ))
 ) : (
 <div className="flex flex-col items-center justify-center p-8 h-full text-center text-[#71717a] dark:text-gray-400">
 <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
 <p>No chats found.</p>
 <Button variant="link" onClick={() => setIsAddChatOpen(true)}>Start a new chat</Button>
 </div>
 )}
 </div>
 </div>
 ) : (
 /* Active Chat View */
 <>
 <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 z-10">
 <div className="text-center my-2 flex justify-center">
 <span className="text-xs text-[#71717a] dark:text-gray-400 bg-background/60 backdrop-blur px-3 py-1 rounded-full  tracking-[0.04em]">
 Messages and calls are end-to-end encrypted.
 </span>
 </div>
 
 {loadingMessages ? (
 <div className="flex justify-center p-4"><OrbitLoader size="md" /></div>
 ) : messages.map((msg, idx) => {
 const isMe = msg.sender_id === user.id;
 const showTail = idx === 0 || messages[idx-1].sender_id !== msg.sender_id;
 const profile = participantProfiles[msg.sender_id];
 const senderName = profile?.full_name || 'User';
 const avatarUrl = profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${senderName}`;
 
 return (
 <div key={msg.id} id={`msg-${msg.id}`} className={cn("flex items-end gap-2 max-w-[85%] group", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}>
 {/* Avatar for others */}
 {!isMe && showTail ? (
 <img src={avatarUrl} alt={senderName} className="w-7 h-7 rounded-full shrink-0 " />
 ) : (
 !isMe && <div className="w-7 shrink-0" />
 )}

 <div className={cn(
 "relative px-3 py-1.5 text-[14.5px] leading-snug rounded-xl",
 isMe 
 ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-gray-100 rounded-tr-none" 
 : "bg-white dark:bg-[#202c33] text-slate-900 dark:text-gray-100 rounded-tl-none"
 )}>
 {/* Replied Message Preview */}
 {msg.reply_to_id && (
 <div className="bg-primary/20 dark:bg-white/5 border-l-4 border-primary rounded-md p-1.5 mb-1.5 text-xs opacity-80 cursor-pointer tracking-[0.04em] hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200" onClick={() => {
 const el = document.getElementById(`msg-${msg.reply_to_id}`);
 if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center'});
}}>
 <span className="font-semibold text-primary block">{participantProfiles[messages.find(m => m.id === msg.reply_to_id)?.sender_id]?.full_name || 'User'}</span>
 <span className="truncate block max-w-[200px]">{messages.find(m => m.id === msg.reply_to_id)?.content || 'Message'}</span>
 </div>
 )}
 
 {/* Name for group chats if not me */}
 {!isMe && showTail && rooms.find(r => r.id === activeRoomId)?.name !== null && (
 <div className="text-[11px] font-semibold text-primary mb-0.5">{senderName}</div>
 )}

 {/* Tail */}
 {showTail && (
 <svg viewBox="0 0 8 13" width="8" height="13" className={cn("absolute top-0", isMe ? "-right-2 text-[#d9fdd3] dark:text-[#005c4b]" : "-left-2 text-white dark:text-[#202c33]")}>
 <path opacity="0.13" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" />
 <path fill="currentColor" d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z" />
 </svg>
 )}
 
 {msg.content.startsWith('[Attachment|') ? (
 <div className="pr-12 pt-1 pb-1">
 <div className="flex items-center gap-2 bg-primary/20 dark:bg-white/5 p-2 rounded-xl hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 {msg.content.split('|')[3] === 'data:image' ? (
 <img src={msg.content.split('|')[2]} alt="attachment" className="max-w-[200px] rounded-md object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.content.split('|')[2], '_blank')} />
 ) : msg.content.split('|')[3] === 'data:video' ? (
 <video src={msg.content.split('|')[2]} controls className="max-w-[250px] rounded-md" />
 ) : (
 <a href={msg.content.split('|')[2]} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:bg-primary/20 dark:hover:bg-white/5 rounded-lg p-1 transition-colors hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 <FileText className="w-8 h-8 text-primary shrink-0" />
 <div className="flex flex-col min-w-0">
 <span className="text-sm font-semibold truncate max-w-[150px] text-primary hover:underline">{msg.content.split('|')[1]}</span>
 <span className="text-xs text-[#71717a] dark:text-gray-400 uppercase tracking-[0.04em]">{msg.content.split('|')[1]?.split('.').pop() || 'DOCUMENT'}</span>
 </div>
 </a>
 )}
 </div>
 </div>
 ) : (() => {
    const { thinking, content: cleanContent, isThinkingDone } = parseThinking(msg.content);
    return (
      <div className="pr-12">
        {thinking && <ThinkingAccordion thinking={thinking} isThinkingDone={isThinkingDone} />}
        {cleanContent && <div className="whitespace-pre-wrap">{cleanContent}</div>}
      </div>
    );
  })()}
 
 <div className="float-right -mb-1 ml-2 text-[10px] text-[#71717a] dark:text-gray-400 flex items-center gap-2 mt-1">
 {msg.is_edited && <span className="mr-1 italic">edited</span>}
 {format(new Date(msg.created_at), 'h:mm a')}
 {isMe && (() => {
 const room = rooms.find(r => r.id === activeRoomId);
 if (!room) return <Check className="w-3.5 h-3.5" />;
 const otherParticipants = room.chat_participants?.filter(p => p.user_id !== user.id) || [];
 const isReadByAny = otherParticipants.some(p => p.last_read_at && new Date(p.last_read_at) >= new Date(msg.created_at));
 if (isReadByAny) return <CheckCheck className="w-3.5 h-3.5 text-primary" />;
 return <CheckCheck className="w-3.5 h-3.5 text-[#71717a] dark:text-gray-400" />;
})()}
 </div>
 </div>
 
 {/* Message Actions - Always slightly visible to be easily discoverable */}
 <div className="opacity-40 hover:opacity-100 transition-opacity flex flex-wrap items-center gap-2 bg-white/50 dark:bg-black/20 rounded-full px-1 py-0.5 mb-1 self-center hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 <button onClick={() => setReplyTo(msg)} className="p-1 hover:bg-primary/20 rounded-full text-[#71717a] dark:text-gray-400" title="Reply">
 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
 </button>
 <button 
 onClick={async () => {
 const currentLikes = msg.reactions?.likes || 0;
 const { error} = await supabase.from('chat_messages').update({
 reactions: { ...msg.reactions, likes: currentLikes + 1}
}).eq('id', msg.id);
 if (!error) {
 setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: { ...m.reactions, likes: currentLikes + 1}} : m));
}
}} 
 className="p-1 hover:bg-primary/20 rounded-full text-[#71717a] dark:text-gray-400 flex items-center gap-0.5" 
 title="Like"
 >
 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
 {msg.reactions?.likes > 0 && <span className="text-[10px]">{msg.reactions.likes}</span>}
 </button>
 {isMe && (
 <>
 <button onClick={() => { setEditingMsg(msg); setInputValue(msg.content);}} className="p-1 hover:bg-primary/20 rounded-full text-[#71717a] dark:text-gray-400" title="Edit">
 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
 </button>
 <button 
 className="p-1 hover:bg-rose-100 hover:text-rose-500 rounded-full text-[#71717a] dark:text-gray-400" 
 title="Delete"
 onClick={() => {
 supabase.from('chat_messages').delete().eq('id', msg.id).then(() => {
 setMessages(prev => prev.filter(m => m.id !== msg.id));
});
}}
 >
 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
 </button>
 </>
 )}
 </div>
 </div>
 );
})}
 <div ref={messagesEndRef} className="h-1" />
 </div>
 
 {/* Context Header for Reply/Edit */}
 {(replyTo || editingMsg) && (
 <div className="px-4 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-primary/40 flex items-center justify-between z-10 text-sm">
 <div className="flex-1 min-w-0 border-l-4 border-primary pl-3">
 <p className="font-semibold text-primary">{editingMsg ? "Editing Message" : `Replying to ${participantProfiles[replyTo?.sender_id]?.full_name || 'User'}`}</p>
 <p className="text-[#71717a] dark:text-gray-400 truncate">{editingMsg ? editingMsg.content : replyTo?.content}</p>
 </div>
 <button onClick={() => { setReplyTo(null); setEditingMsg(null); setInputValue('');}} className="p-2 hover:bg-primary/20 rounded-full">
 <X className="w-4 h-4 text-[#71717a] dark:text-gray-400" />
 </button>
 </div>
 )}

 {/* Input Area */}
 <div className="px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-primary/40 z-10 flex items-center gap-2">
 <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'file')} />
 <input type="file" accept="image/*" id="chat-image-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'image')} />
 <input type="file" accept=".pdf,.doc,.docx,.txt" id="chat-doc-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'doc')} />
 
 <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
 <PopoverTrigger asChild>
 <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-primary/20 shrink-0">
 <Smile className="w-6 h-6" />
 </Button>
 </PopoverTrigger>
 <PopoverContent side="top" align="start" className="w-auto p-0 border-none bg-transparent mb-2">
 <EmojiPicker onEmojiClick={(e) => setInputValue(prev => prev + e.emoji)} />
 </PopoverContent>
 </Popover>

 <Popover open={showAttachMenu} onOpenChange={setShowAttachMenu}>
 <PopoverTrigger asChild>
 <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-primary/20 shrink-0">
 {isUploading ? <OrbitLoader size="md" /> : <Paperclip className="w-6 h-6" />}
 </Button>
 </PopoverTrigger>
 <PopoverContent side="top" align="start" className="w-48 p-2 mb-2 rounded-2xl flex flex-col gap-2 ">
 <Button variant="ghost" className="justify-start gap-3 w-full rounded-xl hover:bg-slate-50 hover:text-primary" onClick={() => document.getElementById('chat-doc-upload')?.click()}>
 <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-primary"><FileText className="w-4 h-4"/></div>
 Document
 </Button>
 <Button variant="ghost" className="justify-start gap-3 w-full rounded-xl hover:bg-rose-50 hover:text-rose-600" onClick={() => document.getElementById('chat-image-upload')?.click()}>
 <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600"><ImageIcon className="w-4 h-4"/></div>
 Photos & Videos
 </Button>
 <Button variant="ghost" className="justify-start gap-3 w-full rounded-xl hover:bg-slate-50 hover:text-primary" onClick={() => fileInputRef.current?.click()}>
 <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-primary"><File className="w-4 h-4"/></div>
 File
 </Button>
 </PopoverContent>
 </Popover>
 
 <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-xl relative flex items-center  hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 <input
 type="text"
 value={inputValue}
 onChange={e => setInputValue(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && handleSend()}
 placeholder="Type a message"
 className="w-full bg-transparent border-none px-4 py-2.5 text-sm focus:ring-0 focus:outline-none"
 />
 <button onClick={handleAiAssist} className="absolute right-3 p-1 text-primary hover:bg-slate-100 rounded-full transition-colors" title="AI Magic Rewrite">
 <Sparkles className="w-4 h-4" />
 </button>
 </div>
 
 <Button 
 onClick={handleSend}
 disabled={!inputValue.trim()}
 size="icon" 
 className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 shrink-0"
 >
 <Send className="w-4 h-4" />
 </Button>
 </div>
 </>
 )}
 </div>
 </div>
  </>
  );

  const portalTarget = document.getElementById('right-docked-panel-portal');
  return portalTarget ? createPortal(content, portalTarget) : content;
}
