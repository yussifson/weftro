import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { registerSchoolUser } from '@/api/authUtils';
import { useToast } from '@/components/ui/use-toast';
import { Users, Mail, UserPlus, Shield, User, X, CheckCircle, RefreshCcw, UserMinus, Rocket, Code2 } from 'lucide-react';
import { getSubdomainAndBase, getMainAppUrl, getAccountsUrl } from '@/lib/domainUtils';

export default function CliPadTeamSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (user?.company_id) {
      fetchMembers();
    }
  }, [user]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const [profilesRes, staffRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, role, avatar_url')
          .eq('company_id', user.company_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('staff_records')
          .select('user_email, full_name')
          .eq('company_id', user.company_id)
      ]);
        
      if (profilesRes.error) throw profilesRes.error;
      
      const staffData = staffRes.data || [];
      const profilesData = profilesRes.data || [];

      const mergedMap = new Map();

      staffData.forEach(s => {
        const email = (s.user_email || '').toLowerCase();
        if (email) {
          mergedMap.set(email, {
            id: s.user_id || `pending-${email}`,
            email: s.user_email,
            full_name: s.full_name,
            role: 'user',
            avatar_url: null,
            isPending: !s.user_id
          });
        }
      });

      profilesData.forEach(p => {
        const email = (p.email || '').toLowerCase();
        if (email && mergedMap.has(email)) {
          const existing = mergedMap.get(email);
          mergedMap.set(email, {
            ...existing,
            ...p,
            id: p.id || existing.id,
            full_name: p.full_name || existing.full_name || 'Unknown User',
            isPending: false
          });
        } else {
          mergedMap.set(email || p.id, {
            ...p,
            full_name: p.full_name || 'Unknown User',
            isPending: false
          });
        }
      });
      
      setMembers(Array.from(mergedMap.values()));
    } catch (err) {
      console.error('Error fetching team members:', err);
      toast({ title: 'Error loading team', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', memberId)
        .eq('company_id', user.company_id);
      
      if (error) throw error;
      toast({ title: 'Role updated', description: 'User role has been updated.' });
      fetchMembers();
    } catch (err) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', memberId)
        .eq('company_id', user.company_id);
        
      if (error) throw error;
      toast({ title: 'Member removed', description: 'The user has been removed from your team.' });
      fetchMembers();
    } catch (err) {
      toast({ title: 'Remove failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    if (inviteEmail.includes('+')) {
      toast({ title: 'Invalid Email', description: 'Please use a standard email address. Email aliases (containing "+") are not permitted.', variant: 'destructive' });
      return;
    }
    
    setInviting(true);
    try {
      const emailInput = inviteEmail.trim().toLowerCase();

      // Check for alias collisions using our new RPC
      const { data: aliasData, error: aliasError } = await supabase.rpc('check_invite_alias_collision', {
        input_email: emailInput
      });

      if (!aliasError && aliasData) {
        // If it's an alias collision but NOT an exact match, block it.
        if (aliasData.aliasCollision && !aliasData.exactMatch) {
          throw new Error('This email appears to be an alias of an existing account. Please invite the user using their original registered email without dots/modifiers.');
        }
      }

      let newUser = null;
      let tempPassword = '';

      // If it's NOT an exact match (brand new user), create the user
      if (!aliasData || !aliasData.exactMatch) {
        // Generate a complex temp password, since they'll log in via email link anyway
        tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
        
        const { user: createdUser, error } = await registerSchoolUser(
          inviteEmail, 
          tempPassword, 
          inviteRole, 
          user.company_id, 
          inviteName,
          false
        );
        
        if (error && error.message !== 'already registered in this firm') {
          throw error;
        }
        newUser = createdUser;
      }
      
      // Explicitly insert into staff_records so their name immediately appears in the UI
      const { error: staffErr } = await supabase.from('staff_records').insert({
        company_id: user.company_id,
        user_email: inviteEmail.trim().toLowerCase(),
        full_name: inviteName.trim(),
        role: inviteRole,
        department: 'General',
        date_joined: new Date().toISOString()
      });
      
      if (staffErr) {
        console.error("Failed to insert into staff_records:", staffErr);
      }
      
      // Explicitly update the profile to heal any missing data from DB triggers (only if we created a new user)
      if (newUser && newUser.id) {
        await supabase.from('profiles').update({
          full_name: inviteName.trim(),
          email: inviteEmail.trim().toLowerCase()
        }).eq('id', newUser.id);
      }
      
      // Send a proper invitation email
      const accountsUrl = getAccountsUrl();
      const currentOrigin = window.location.origin;
      const loginUrl = `${accountsUrl}/login?continue=${encodeURIComponent(currentOrigin)}&prompt=login`;
      
      let emailHtml = '';
      if (!aliasData || !aliasData.exactMatch) {
        emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You've been invited to Weftro!</h2>
            <p>Hi ${inviteName},</p>
            <p>You have been invited to join the team on Weftro.</p>
            <p>You can log in using your email address and the following temporary password:</p>
            <div style="background-color: #f4f4f5; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 18px; margin: 16px 0; letter-spacing: 1px;">
              <strong>${tempPassword}</strong>
            </div>
            <p>Please log in and change your password immediately in your account settings.</p>
            <a href="${loginUrl}" style="display: inline-block; background-color: #10b981; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 16px;">Log In to Weftro</a>
          </div>
        `;
      } else {
        emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You've been added to a new workspace on Weftro!</h2>
            <p>Hi ${inviteName},</p>
            <p>Good news! You have been invited to join a new workspace on Weftro.</p>
            <p>Since you already have an account with us, simply log in using your existing email and password to access your new workspace.</p>
            <a href="${loginUrl}" style="display: inline-block; background-color: #10b981; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 16px;">Log In to Weftro</a>
          </div>
        `;
      }

      const { error: sendError } = await supabase.functions.invoke('send-email', {
        body: {
          to: [inviteEmail.trim()],
          subject: 'You have been invited to Weftro',
          html: emailHtml
        }
      });
      
      if (sendError) {
        console.error("Failed to send invite email:", sendError);
        // Fallback to Magic Link if edge function fails
        await supabase.auth.signInWithOtp({
          email: inviteEmail.trim(),
          options: {
            emailRedirectTo: `${accountsUrl}/reset-password?continue=${encodeURIComponent(currentOrigin)}`
          }
        });
      }

      toast({ 
        title: `Invited ${inviteName}`, 
        description: `An invitation has been emailed to ${inviteEmail}.`,
      });
      
      // Reset form & refresh
      setInviteName('');
      setInviteEmail('');
      setInviteRole('user');
      setShowInviteForm(false);
      fetchMembers();
      
    } catch (err) {
      console.error(err);
      toast({ title: 'Invite failed', description: err.message, variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Team Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage who has access to your company's Weftro Workspace.</p>
        </div>
        {!showInviteForm && (
          <button 
            onClick={() => setShowInviteForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all shadow-md shadow-primary/20"
          >
            <UserPlus className="w-4 h-4" /> Invite Member
          </button>
        )}
      </div>

      {showInviteForm && (
        <div className="mb-8 p-6 bg-secondary/50 border border-primary/20 rounded-2xl relative">
          <button 
            onClick={() => setShowInviteForm(false)}
            className="absolute top-4 right-4 p-1 rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <h3 className="text-sm font-bold text-foreground mb-4">Invite New Team Member</h3>
          <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Full Name</label>
              <input
                required
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Email Address</label>
              <input
                required
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="jane@company.com"
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-all"
              >
                <option value="user">Member</option>
                <option value="spaceman">🚀 Spaceman</option>
                <option value="developer">💻 Developer</option>
                <option value="company_admin">Admin</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <button 
                type="submit"
                disabled={inviting}
                className="w-full h-[42px] flex items-center justify-center gap-2 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold shadow-md transition-all disabled:opacity-70"
              >
                {inviting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send Invite
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCcw className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-x-auto bg-background">
          <table className="w-full min-w-[600px] text-left border-collapse">
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map(member => (
                <tr key={member.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${member.full_name || member.email?.split('@')[0]}`} 
                        alt="" 
                        className="w-8 h-8 rounded-full bg-secondary"
                      />
                      <span className="text-sm font-semibold text-foreground">{member.full_name || member.email?.split('@')[0] || 'Pending...'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{member.email}</span>
                  </td>
                  <td className="px-6 py-4">
                    {member.id === user.id ? (
                      member.role === 'company_admin' || member.role === 'admin' || member.role === 'super_admin' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-semibold">
                          <Shield className="w-3.5 h-3.5" /> Admin
                        </span>
                      ) : member.role === 'spaceman' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-semibold">
                          <Rocket className="w-3.5 h-3.5" /> Spaceman
                        </span>
                      ) : member.role === 'developer' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                          <Code2 className="w-3.5 h-3.5" /> Developer
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-background0/10 text-slate-500 dark:text-muted-foreground text-xs font-semibold">
                          <User className="w-3.5 h-3.5" /> Member
                        </span>
                      )
                    ) : (
                      <div className="flex items-center gap-4">
                        <select
                          value={
                            member.role === 'company_admin' || member.role === 'admin' ? 'company_admin'
                            : member.role === 'spaceman' ? 'spaceman'
                            : member.role === 'developer' ? 'developer'
                            : 'user'
                          }
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="bg-secondary/50 border border-border rounded-lg text-xs font-semibold px-2 py-1 text-foreground focus:outline-none focus:border-primary cursor-pointer"
                        >
                          <option value="user">Member</option>
                          <option value="spaceman">🚀 Spaceman</option>
                <option value="developer">💻 Developer</option>
                          <option value="company_admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove member"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-muted-foreground text-sm">
                    No team members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
