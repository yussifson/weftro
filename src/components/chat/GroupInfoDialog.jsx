import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users } from "lucide-react";

export default function GroupInfoDialog({ open, onOpenChange, activeRoom, participantProfiles }) {
  if (!activeRoom) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col overflow-hidden bg-background">
        <DialogHeader className="p-6 pb-2 shrink-0 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-primary/30 flex items-center justify-center overflow-hidden mb-4 shadow-sm border border-slate-200 dark:border-border">
            {activeRoom.avatar_url ? (
              <img src={activeRoom.avatar_url} alt={activeRoom.name} className="w-full h-full object-cover" />
            ) : (
              <Users className="w-12 h-12 text-primary dark:text-primary/70" />
            )}
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">{activeRoom.name || 'Group Chat'}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Group · {activeRoom.chat_participants?.length || 0} members
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2 flex flex-col gap-4">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Members</h3>
            <div className="space-y-2">
              {activeRoom.chat_participants?.map(p => {
                const profile = participantProfiles[p.user_id];
                return (
                  <div key={p.user_id} className="flex items-center gap-3 p-2 rounded-xl bg-secondary/30">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-secondary overflow-hidden shrink-0">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.full_name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-semibold text-xs">
                          {profile?.full_name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{profile?.full_name || 'Unknown User'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.role === 'admin' && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1 rounded">Admin</span>}
                        <p className="text-xs text-muted-foreground">{profile?.email}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
