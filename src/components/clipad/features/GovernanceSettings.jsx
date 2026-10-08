import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { resolveIntelligenceContext } from '@/lib/clipadIntelligenceGovernanceService';
import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';
import { Loader2, ShieldCheck, Lock, Users, Building, EyeOff } from 'lucide-react';

export default function GovernanceSettings() {
  const { user } = useAuth();
  const [govCtx, setGovCtx] = useState(null);
  const [loading, setLoading] = useState(true);

  const isRoleAwareEnabled = isV3FeatureEnabled(V3_FLAGS.ROLE_AWARE_INTELLIGENCE_ENABLED, user);

  useEffect(() => {
    async function loadCtx() {
      if (user && isRoleAwareEnabled) {
        try {
          const ctx = await resolveIntelligenceContext(user);
          setGovCtx(ctx);
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    }
    loadCtx();
  }, [user, isRoleAwareEnabled]);

  if (!isRoleAwareEnabled) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center border border-border rounded-xl bg-card">
        <ShieldCheck className="w-8 h-8 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-bold">Role-Aware Intelligence Disabled</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-2">
          Your organization is not currently utilizing the V3 Governance layer.
        </p>
      </div>
    );
  }

  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-muted-foreground m-6" />;
  if (!govCtx) return null;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="bg-gradient-to-r from-[#006065]/10 to-[#fad503]/10 border border-[#006065]/20 rounded-xl p-6">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[#006065] dark:text-[#fad503]" />
          Intelligence Governance & Privacy
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Clipad's AI Assistant only accesses information you are explicitly authorized to view. 
          Your intelligence context is securely derived from your organizational role and workspace memberships.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Your Identity Context</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Organizational Role</p>
                <p className="font-bold text-foreground capitalize">{govCtx.role}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Space Memberships</p>
                <p className="font-bold text-foreground">{govCtx.accessibleSpaces.length} accessible spaces</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">AI Knowledge Scopes</h3>
          <div className="space-y-3">
            {govCtx.allowedMemoryScopes.includes('ORGANIZATION') && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Building className="w-4 h-4 text-[#006065] dark:text-[#fad503]" />
                <span>Organization-wide Knowledge</span>
              </div>
            )}
            {govCtx.allowedMemoryScopes.includes('TEAM') && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Users className="w-4 h-4 text-blue-500" />
                <span>Team & Space Knowledge</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Lock className="w-4 h-4 text-green-500" />
              <span>Personal Knowledge</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 pt-2 border-t border-border">
              <EyeOff className="w-4 h-4" />
              <span>Private & Restricted content is blocked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
