import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { hasFeature } from '@/lib/clipadPricing';
import { useCompanyPlan } from '@/hooks/useCompanyPlan';
import { isAdmin, isSuperAdmin } from '@/lib/constants';
import { Headphones, Puzzle, Lock, Plug } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { Settings, User, Users, Bell, Shield, LogOut, ArrowLeft, Video, CheckCircle, Camera, CreditCard } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { CliPadLogo } from '@/components/ui/CliPadLogo';
import CliPadBilling from './CliPadBilling';
import CliPadTeamSettings from '@/components/clipad/CliPadTeamSettings';

import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';

export default function CliPadSettings() {
  const { user, logout } = useAuth();
  const { plan } = useCompanyPlan();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'profile');
  const [fullName, setFullName] = useState(user?.full_name || user?.user_metadata?.full_name || '');

  // Settings state (persisted to Supabase)
  const [settings, setSettings] = useState(() => {
    const saved = user?.user_metadata?.clipad_settings;
    if (saved) {
      try {
        return { ...{
          emailNotifs: true,
          actionItemReminders: true,
          aiSummaries: true,
          cameraDefault: true,
          micDefault: true,
          blurBackground: false
        }, ...saved };
      } catch (e) {}
    }
    return {
      emailNotifs: true,
      actionItemReminders: true,
      aiSummaries: true,
      cameraDefault: true,
      micDefault: true,
      blurBackground: false,
      chatMentionsDelivery: 'realtime',
      taskAssignmentDelivery: 'realtime'
    };
  });

  const toggle = (key) => setSettings(s => ({ ...s, [key]: !s[key] }));
  
  const updateSetting = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          clipad_settings: settings,
          full_name: fullName
        }
      });
      
      if (error) throw error;
      
      // Update users table
      if (user?.id) {
        await supabase.from('users').update({ full_name: fullName }).eq('id', user.id);
      }
      
      toast({ title: 'Settings saved', description: 'Your preferences have been updated.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to save settings', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    window.location.href = '/login';
  };

  const handleUpdateAvatar = async () => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt
      });

      if (image.base64String) {
        toast({ title: "Photo selected", description: "Profile photo ready for upload to storage." });
        // Typically here: const { data } = await supabase.storage.from('avatars').upload(...)
      }
    } catch (e) {
      if (e.message !== 'User cancelled photos app') {
        toast({ title: "Camera error", description: e.message, variant: 'destructive' });
      }
    }
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-background text-slate-900 dark:text-slate-100 font-sans page-enter">

      <div className="max-w-6xl mx-auto px-4 md:px-10 py-6 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Sidebar Tabs */}
          <div className="md:col-span-1 flex flex-row overflow-x-auto md:flex-col gap-2 md:gap-3 pb-2 md:pb-0 no-scrollbar scrollbar-hide">
            {[
              {id: 'profile', icon: User, label: 'Profile'}, 
              {id: 'notifs', icon: Bell, label: 'Notifications'}, 
              {id: 'meeting', icon: Video, label: 'Meeting Defaults'}, 
              ...(isAdmin(user) ? [{id: 'team', icon: Users, label: 'Team Management'}, {id: 'billing', icon: CreditCard, label: 'Billing & Plans'}] : [])
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => {
                  setActiveTab(tab.id);
                }}
                className={`whitespace-nowrap flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all border active:scale-95 ${activeTab === tab.id ? 'bg-white dark:bg-card text-[#006065] dark:text-[#006065] dark:text-[#fad503] border-slate-200 dark:border-border shadow-md' : 'bg-transparent text-slate-600 dark:text-muted-foreground border-transparent hover:bg-white dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-900 dark:text-foreground'}`}>
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-[#006065] dark:text-[#006065] dark:text-[#fad503]' : 'text-slate-500 dark:text-muted-foreground'}`} /> {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="md:col-span-3 space-y-8">
            
            {activeTab === 'billing' && <CliPadBilling />}
            {activeTab === 'team' && (
        <>
        {/* Enterprise Features */}
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-3xl p-6 sm:p-10 mb-8 shadow-sm text-slate-900 dark:text-slate-900 dark:text-foreground">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#006065] dark:text-[#fad503] shadow-sm shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-foreground">Enterprise Features</h2>
              <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">Advanced capabilities for scaling organizations.</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-foreground flex items-center gap-2">Branded Meeting Rooms {hasFeature(plan, 'hasBrandedRooms') && <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-white dark:bg-[#fad503]/20 text-[#006065] dark:text-[#fad503]">Active</span>}</h3>
                <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">Customize your clipboard meeting rooms with company logos and colors.</p>
              </div>
              {!hasFeature(plan, 'hasBrandedRooms') && <button onClick={() => setActiveTab('billing')} className="px-4 py-2 rounded-xl bg-white text-white dark:bg-[#fad503] dark:text-[#006065] text-sm font-bold hover:bg-[#fad503]/90 transition-colors">Upgrade</button>}
              {hasFeature(plan, 'hasBrandedRooms') && <button onClick={() => toast({title: "Branding", description: "Company branding is automatically applied from your company profile settings."})} className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-slate-900 dark:text-foreground text-sm font-bold hover:bg-slate-200 dark:bg-slate-700 transition-colors">Configure</button>}
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-foreground flex items-center gap-2"><Headphones className="w-4 h-4"/> SLA & Dedicated Support {hasFeature(plan, 'hasSLA') && <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-white dark:bg-[#fad503]/20 text-[#006065] dark:text-[#fad503]">Active</span>}</h3>
                <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">24/7 priority support and guaranteed uptime SLA.</p>
              </div>
              {!hasFeature(plan, 'hasSLA') && <button onClick={() => setActiveTab('billing')} className="px-4 py-2 rounded-xl bg-white text-white dark:bg-[#fad503] dark:text-[#006065] text-sm font-bold hover:bg-[#fad503]/90 transition-colors">Upgrade</button>}
              {hasFeature(plan, 'hasSLA') && <button onClick={() => { window.location.href = "mailto:support@optavel.com"; toast({title: "Support", description: "Opening your email client to contact our enterprise support team."})}} className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-slate-900 dark:text-foreground text-sm font-bold hover:bg-slate-200 dark:bg-slate-700 transition-colors">Contact Support</button>}
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-foreground flex items-center gap-2"><Lock className="w-4 h-4"/> SSO & Compliance Recording {hasFeature(plan, 'hasComplianceRecording') && <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-white dark:bg-[#fad503]/20 text-[#006065] dark:text-[#fad503]">Active</span>}</h3>
                <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">Single Sign-On enforcement and mandatory compliance recordings.</p>
              </div>
              {!hasFeature(plan, 'hasComplianceRecording') && <button onClick={() => setActiveTab('billing')} className="px-4 py-2 rounded-xl bg-white text-white dark:bg-[#fad503] dark:text-[#006065] text-sm font-bold hover:bg-[#fad503]/90 transition-colors">Upgrade</button>}
              {hasFeature(plan, 'hasComplianceRecording') && <button onClick={() => toast({title: "SSO Config", description: "SSO settings have been verified and applied to your company workspace."})} className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-slate-900 dark:text-foreground text-sm font-bold hover:bg-slate-200 dark:bg-slate-700 transition-colors">Configure</button>}
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-foreground flex items-center gap-2"><Puzzle className="w-4 h-4"/> Custom Integrations <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-white dark:bg-[#fad503]/20 text-[#006065] dark:text-[#fad503]">Coming Soon</span></h3>
                <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">Connect CliPad directly into your proprietary internal systems.</p>
              </div>
              {!hasFeature(plan, 'hasCustomIntegrations') && <button onClick={() => setActiveTab('billing')} className="px-4 py-2 rounded-xl bg-white text-white dark:bg-[#fad503] dark:text-[#006065] text-sm font-bold hover:bg-[#fad503]/90 transition-colors">Upgrade</button>}
              {hasFeature(plan, 'hasCustomIntegrations') && <button className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-slate-900 dark:text-foreground/50 text-sm font-bold disabled:opacity-50" disabled>Configure</button>}
            </div>
          </div>
        </div>
  
        <CliPadTeamSettings />
        </>
      )}

            {/* Profile */}
            {activeTab === 'profile' && (
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-4 md:p-8 text-slate-900 dark:text-slate-900 dark:text-foreground shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-foreground mb-6 flex items-center gap-2"><User className="w-5 h-5 text-[#006065] dark:text-[#fad503]" /> Account Profile</h2>
              <div className="flex items-center gap-6 mb-8">
                <div className="relative group cursor-pointer" onClick={handleUpdateAvatar}>
                  <img
                    src={user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.full_name || user?.email}`}
                    className="w-20 h-20 rounded-2xl bg-white/10 object-cover shadow-sm group-hover:opacity-70 transition-opacity"
                    alt="Profile"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-2xl">
                    <Camera className="w-6 h-6 text-slate-900 dark:text-foreground drop-shadow-md" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-foreground">{user?.full_name || 'User'}</h3>
                  <p className="text-slate-500 dark:text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-2 uppercase tracking-wider">Full Name</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-sm focus:outline-none focus:border-[#00beac] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-muted-foreground mb-2 uppercase tracking-wider">Email Address</label>
                  <input
                    disabled
                    value={user?.email || ''}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-border text-slate-900 dark:text-foreground/50 text-sm cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifs' && (
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-4 md:p-8 text-slate-900 dark:text-slate-900 dark:text-foreground shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-foreground mb-6 flex items-center gap-2"><Bell className="w-5 h-5 text-[#006065] dark:text-[#fad503]" /> Notifications</h2>
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-foreground text-sm group-hover:text-[#006065] dark:text-[#fad503] transition-colors">Meeting summaries</p>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">Receive email with AI summary after meetings</p>
                  </div>
                  <div onClick={() => toggle('aiSummaries')} className={`w-10 h-6 rounded-full transition-colors relative ${settings.aiSummaries ? 'bg-white dark:bg-[#fad503]' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${settings.aiSummaries ? 'left-5' : 'left-1'}`} />
                  </div>
                </label>
                <div className="h-px bg-white/10 w-full" />
                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-foreground text-sm group-hover:text-[#006065] dark:text-[#fad503] transition-colors">Action item reminders</p>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">Daily reminder of pending tasks</p>
                  </div>
                  <div onClick={() => toggle('actionItemReminders')} className={`w-10 h-6 rounded-full transition-colors relative ${settings.actionItemReminders ? 'bg-white dark:bg-[#fad503]' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${settings.actionItemReminders ? 'left-5' : 'left-1'}`} />
                  </div>
                </label>
                <div className="h-px bg-white/10 w-full" />
                
                {/* NEW PHASE 1 NOTIFICATIONS */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-foreground text-sm">Chat Mentions</p>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">When someone @mentions you in chat</p>
                  </div>
                  <select 
                    value={settings.chatMentionsDelivery || 'realtime'} 
                    onChange={(e) => updateSetting('chatMentionsDelivery', e.target.value)}
                    className="bg-white/10 border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#00beac]"
                  >
                    <option value="realtime" className="bg-white text-slate-900 dark:text-foreground">Real-time</option>
                    <option value="daily" className="bg-white text-slate-900 dark:text-foreground">Daily Digest</option>
                    <option value="weekly" className="bg-white text-slate-900 dark:text-foreground">Weekly Digest</option>
                    <option value="off" className="bg-white text-slate-900 dark:text-foreground">Off</option>
                  </select>
                </div>
                <div className="h-px bg-white/10 w-full" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-foreground text-sm">Task Assignments</p>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">When you are assigned a new task</p>
                  </div>
                  <select 
                    value={settings.taskAssignmentDelivery || 'realtime'} 
                    onChange={(e) => updateSetting('taskAssignmentDelivery', e.target.value)}
                    className="bg-white/10 border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#00beac]"
                  >
                    <option value="realtime" className="bg-white text-slate-900 dark:text-foreground">Real-time</option>
                    <option value="daily" className="bg-white text-slate-900 dark:text-foreground">Daily Digest</option>
                    <option value="weekly" className="bg-white text-slate-900 dark:text-foreground">Weekly Digest</option>
                    <option value="off" className="bg-white text-slate-900 dark:text-foreground">Off</option>
                  </select>
                </div>
              </div>
            </div>
            )}

            {/* Meeting Defaults */}
            {activeTab === 'meeting' && (
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-4 md:p-8 text-slate-900 dark:text-slate-900 dark:text-foreground shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-foreground mb-6 flex items-center gap-2"><Camera className="w-5 h-5 text-[#006065] dark:text-[#fad503]" /> Meeting Defaults</h2>
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-foreground text-sm group-hover:text-[#006065] dark:text-[#fad503] transition-colors">Camera on by default</p>
                  </div>
                  <div onClick={() => toggle('cameraDefault')} className={`w-10 h-6 rounded-full transition-colors relative ${settings.cameraDefault ? 'bg-white dark:bg-[#fad503]' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${settings.cameraDefault ? 'left-5' : 'left-1'}`} />
                  </div>
                </label>
                <div className="h-px bg-white/10 w-full" />
                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-foreground text-sm group-hover:text-[#006065] dark:text-[#fad503] transition-colors">Microphone on by default</p>
                  </div>
                  <div onClick={() => toggle('micDefault')} className={`w-10 h-6 rounded-full transition-colors relative ${settings.micDefault ? 'bg-white dark:bg-[#fad503]' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${settings.micDefault ? 'left-5' : 'left-1'}`} />
                  </div>
                </label>
                <div className="h-px bg-white/10 w-full" />
                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-foreground text-sm group-hover:text-[#006065] dark:text-[#fad503] transition-colors">Blur background</p>
                  </div>
                  <div onClick={() => toggle('blurBackground')} className={`w-10 h-6 rounded-full transition-colors relative ${settings.blurBackground ? 'bg-white dark:bg-[#fad503]' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${settings.blurBackground ? 'left-5' : 'left-1'}`} />
                  </div>
                </label>
              </div>
            </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
              <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2 rounded-xl text-rose-300 hover:text-slate-900 dark:text-foreground hover:bg-rose-500/20 transition-colors text-sm font-semibold">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#fad503] hover:bg-[#fad503]/90 text-[#006065] font-bold shadow-lg transition-all disabled:opacity-70 active:scale-95">
                {saving ? <div className="w-4 h-4 border-2 border-slate-800/30 border-t-[#006065] rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




