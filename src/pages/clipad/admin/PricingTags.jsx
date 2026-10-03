import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Building2, CheckCircle2, ChevronDown, Tags, Plus, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { OrbitLoader } from '@/components/ui/orbit-loader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PricingTags() {
  const [companies, setCompanies] = useState([]);
  const [pricingTags, setPricingTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', price: 0, currency: 'USD' });
  const [editingTag, setEditingTag] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [compRes, tagsRes] = await Promise.all([
      supabase.from('companies').select('*, clipad_pricing_tags(name)').order('created_at', { ascending: false }),
      supabase.from('clipad_pricing_tags').select('*').order('created_at', { ascending: false })
    ]);
    
    if (!compRes.error) setCompanies(compRes.data || []);
    if (!tagsRes.error) setPricingTags(tagsRes.data || []);
    setLoading(false);
  }

  const handleUpdateCompanyPlan = async (companyId, tagId, tagName) => {
    const { error } = await supabase.from('companies').update({ pricing_tag_id: tagId }).eq('id', companyId);
    
    if (!error) {
      // Resolve canonical plan name from tag
      const name = (tagName || '').toLowerCase();
      const resolvedPlan = name.includes('custom') ? 'custom' : name.includes('enterprise') ? 'enterprise' : name.includes('pro') ? 'pro' : 'free';

      // Also upsert company_subscriptions so billing page reflects the change immediately
      await supabase.from('company_subscriptions').upsert({
        company_id: companyId,
        plan_id: resolvedPlan,
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'company_id' });

      // Fetch all users in this company and send them a plan_upgrade notification
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('company_id', companyId);

      if (profiles && profiles.length > 0) {
        const receiptNumber = `CLIP-${Date.now().toString(36).toUpperCase()}-${resolvedPlan.slice(0,3).toUpperCase()}`;
        
        // Save to optavel_transactions so billing history sees it
        if (resolvedPlan !== 'free') {
          const amountInGhs = resolvedPlan === 'enterprise' ? 450 : 105;
          const newReceipt = {
            reference: 'ADMIN-ASSIGNED-' + Date.now().toString(36).toUpperCase(),
            receiptNumber: receiptNumber,
            amount: 0, // Since it's admin assigned, they might pay via invoice
            currency: 'GHS',
            plan: resolvedPlan,
            date: new Date().toISOString(),
            isAdminAssigned: true,
          };
          await supabase.from('optavel_transactions').insert({
            id: crypto.randomUUID(),
            company_id: companyId,
            amount: 0,
            type: 'subscription',
            category: 'clipad_billing',
            description: JSON.stringify(newReceipt),
            date: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
          
          // Send email receipt to company admins
          const adminEmails = profiles
            .filter(p => ['company_admin', 'super_admin', 'admin'].includes(p.role) && p.email)
            .map(p => p.email);
            
          if (adminEmails.length > 0) {
            supabase.functions.invoke('send-email', {
              body: {
                to: adminEmails,
                subject: `CliPad Plan Upgraded - ${receiptNumber}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px; color: #0f172a;">
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden;">
                      <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; text-align: center; padding: 32px;">
                        <div style="font-size: 22px; font-weight: 900; margin-bottom: 8px;">CliPad</div>
                        <div style="font-size: 12px; font-weight: 500;">Plan Upgraded by Admin</div>
                        <div style="font-size: 10px; margin-top: 12px; font-family: monospace;">#${receiptNumber}</div>
                      </div>
                      <div style="padding: 32px;">
                        <p style="text-align: center; font-weight: bold; margin-bottom: 24px;">Your workspace has been upgraded to the ${resolvedPlan.toUpperCase()} Plan</p>
                        <hr style="border: 0; border-top: 1px dashed #e2e8f0; margin-bottom: 24px;" />
                        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                        <p><strong>Status:</strong> Complimentary Upgrade / Invoiced</p>
                        <p style="margin-top: 24px; font-size: 12px; color: #64748b; text-align: center;">You can view and download this receipt in your CliPad Billing Settings at any time.</p>
                      </div>
                    </div>
                  </div>
                `
              }
            });
          }
        }
        const adminProfilesForNotifs = profiles.filter(p => ['company_admin', 'super_admin', 'admin'].includes(p.role));
        const notifRows = adminProfilesForNotifs.map(p => ({
          user_id: p.id,
          type: 'plan_upgrade',
          title: `Your plan has been upgraded to ${resolvedPlan.charAt(0).toUpperCase() + resolvedPlan.slice(1)}!`,
          message: `An admin has upgraded your CliPad workspace to the ${resolvedPlan.toUpperCase()} plan. Receipt: ${receiptNumber}`,
          link: '/clipad/billing',
          is_read: false,
        }));
        if (notifRows.length > 0) {
          await supabase.from('clipad_notifications').insert(notifRows);
        }
      }

      toast({
        title: "Plan Updated Successfully",
        description: `The company's CliPad plan has been upgraded to ${tagName || 'Free Tier'}.`
      });
      fetchData();
    } else {
      toast({
        title: "Failed to update plan",
        description: error.message,
        variant: "destructive"
      });
    }
  };


  const handleSaveTag = async (e) => {
    e.preventDefault();
    const payload = { ...formData, price: parseFloat(formData.price) };
    
    let error;
    if (editingTag) {
      const res = await supabase.from('clipad_pricing_tags').update(payload).eq('id', editingTag.id);
      error = res.error;
    } else {
      const res = await supabase.from('clipad_pricing_tags').insert(payload);
      error = res.error;
    }

    if (!error) {
      toast({ title: "Pricing Tag Saved" });
      setIsDialogOpen(false);
      setEditingTag(null);
      fetchData();
    } else {
      toast({ title: "Error saving tag", variant: "destructive" });
    }
  };

  const handleDeleteTag = async (id) => {
    if(!window.confirm("Are you sure? This tag might be assigned to companies.")) return;
    const { error } = await supabase.from('clipad_pricing_tags').delete().eq('id', id);
    if (!error) {
      toast({ title: "Tag Deleted" });
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-transparent  p-4 sm:p-6 md:p-8 animate-pulse">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="h-8 bg-[#006065] text-white border border-white/15/15 dark:bg-slate-800 rounded w-48 mb-2"></div>
            <div className="h-4 bg-[#006065] text-white border border-white/15/15 dark:bg-slate-800 rounded w-32"></div>
          </div>
          <div className="h-10 bg-[#006065] text-white border border-white/15/15 dark:bg-slate-800 rounded w-32"></div>
        </div>
        <div className="bg-[#006065] text-white dark:bg-[#006065] p-6 rounded-2xl h-64 mb-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pricing & Plans</h1>
          <p className="text-muted-foreground mt-2">Manage CliPad plans separately from global Slate plans.</p>
        </div>
      </div>

      <Tabs defaultValue="companies" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="companies">Company Assignments</TabsTrigger>
          <TabsTrigger value="tags">Manage Tiers</TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="border border-border rounded-xl bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Global Slate Plan</TableHead>
                <TableHead>CliPad Plan</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500">
                      <Building2 className="w-4 h-4" />
                    </div>
                    {company.name}
                  </TableCell>
                  <TableCell>
                    {company.subscription_plan ? (
                      <span className="px-2 py-1 bg-slate-800 text-slate-100 rounded-md text-[10px] font-bold uppercase tracking-wider">Slate Member</span>
                    ) : (
                      <span className="px-2 py-1 bg-indigo-500/10 text-indigo-500 rounded-md text-[10px] font-bold uppercase tracking-wider">CliPad Only</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize px-3 py-1 bg-[#006065] text-white border border-white/15/10 dark:bg-secondary text-white/70 dark:text-muted-foreground rounded-md text-xs font-medium">
                      {company.subscription_plan || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize px-3 py-1 bg-[#006065]/10 text-[#006065] dark:text-[#00beac] rounded-md text-sm font-bold">
                      {company.clipad_pricing_tags?.name || 'Free Tier'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          Change CliPad Plan <ChevronDown className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUpdateCompanyPlan(company.id, null, 'Free Tier')} className="cursor-pointer">
                          Free Tier {!company.pricing_tag_id && <CheckCircle2 className="w-4 h-4 text-[#006065] ml-auto" />}
                        </DropdownMenuItem>
                        {pricingTags.map(tag => (
                          <DropdownMenuItem key={tag.id} onClick={() => handleUpdateCompanyPlan(company.id, tag.id, tag.name)} className="cursor-pointer font-medium text-blue-600 dark:text-blue-400">
                            {tag.name} {company.pricing_tag_id === tag.id && <CheckCircle2 className="w-4 h-4 text-[#006065] ml-auto" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {companies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No companies found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="tags" className="border border-border rounded-xl bg-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">CliPad Pricing Tiers</h2>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if(!open) { setEditingTag(null); setFormData({ name: '', description: '', price: 0, currency: 'USD' }); }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4"/> New Tier</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTag ? 'Edit Tier' : 'Create Pricing Tier'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveTag} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tier Name</Label>
                    <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="e.g., Enterprise" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Optional details" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Price / mo</Label>
                      <Input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Input value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} required />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">Save Tier</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pricingTags.map(tag => (
              <div key={tag.id} className="p-4 border border-border rounded-lg flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-primary">{tag.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingTag(tag); setFormData(tag); setIsDialogOpen(true); }} className="p-1.5 bg-[#006065] text-white border border-white/15/10 hover:bg-[#006065] text-white border border-white/15/15 dark:bg-secondary dark:hover:bg-slate-700 rounded text-white/80 dark:text-muted-foreground"><Pencil className="w-3.5 h-3.5"/></button>
                    <button onClick={() => handleDeleteTag(tag.id)} className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4 flex-1">{tag.description || 'No description provided.'}</p>
                <div className="font-mono font-semibold text-xl">
                  {tag.price} {tag.currency}
                </div>
              </div>
            ))}
            {pricingTags.length === 0 && (
              <div className="col-span-3 text-center py-12 text-muted-foreground bg-transparent dark:bg-[#006065] rounded-lg">
                No custom pricing tiers created yet.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

