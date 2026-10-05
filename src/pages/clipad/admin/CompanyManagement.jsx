import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useImpersonation } from '@/lib/ImpersonationContext';
import { MoreVertical, UserX, Shield, LogIn, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrbitLoader } from '@/components/ui/orbit-loader';
import { useToast } from "@/components/ui/use-toast";

export default function CompanyManagement() {
  const [companies, setCompanies] = useState([]);
  const [pricingTags, setPricingTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { startImpersonation } = useImpersonation();
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
    fetchPricingTags();
  }, []);

  async function fetchPricingTags() {
    const { data } = await supabase.from('clipad_pricing_tags').select('id, name');
    if (data) setPricingTags(data);
  }

  async function fetchCompanies() {
    setLoading(true);
    const { data, error } = await supabase.from('companies').select('*, clipad_pricing_tags(name)').order('created_at', { ascending: false });
    if (!error) {
      setCompanies(data || []);
    }
    setLoading(false);
  }

  const handleUpdateCliPadPlan = async (companyId, tagId) => {
    const { error } = await supabase.from('companies').update({ pricing_tag_id: tagId }).eq('id', companyId);
    if (!error) {
      fetchCompanies();
      toast({ title: "Plan Updated", description: "Company plan has been updated." });
    } else {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleImpersonate = async (company) => {
    toast({
      title: "Impersonating Company",
      description: `Switching context to ${company.name}...`
    });
    
    // Log the impersonation action
    await supabase.from('audit_logs').insert({
      action: 'impersonate',
      company_id: company.id,
      details: 'Super Admin Impersonation'
    });

    startImpersonation(company);
  };

  const handleStatusToggle = async (company) => {
    const newStatus = company.status === 'suspended' ? 'active' : 'suspended';
    const { error } = await supabase.from('companies').update({ status: newStatus }).eq('id', company.id);
    if (!error) {
      fetchCompanies();
      toast({ title: "Status Updated", description: `Company is now ${newStatus}` });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this company? This action is irreversible.")) return;
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (!error) {
      fetchCompanies();
      toast({ title: "Company Deleted", variant: "destructive" });
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
        <p className="text-muted-foreground mt-2">Manage all registered companies, update plans, or impersonate spaces.</p>
      </div>

      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Subdomain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Slate Plan</TableHead>
              <TableHead>KERINT Plan</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell className="text-muted-foreground">{company.subdomain || 'N/A'}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${company.status === 'suspended' ? 'bg-red-500/10 text-red-500' : 'bg-[#006065]/10 text-[#006065]'}`}>
                    {company.status || 'Active'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="capitalize px-2 py-1 bg-[#006065] text-white border border-white/15/10 dark:bg-secondary text-white/80 dark:text-foreground rounded-md text-xs font-medium">
                    {company.subscription_plan || 'N/A'}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="capitalize px-3 py-1 bg-[#006065]/10 text-[#006065] dark:text-[#00beac] rounded-md text-xs font-bold hover:bg-[#006065]/20 transition-colors cursor-pointer border-none outline-none focus:ring-0">
                      {company.clipad_pricing_tags?.name || 'Free Tier'}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleUpdateCliPadPlan(company.id, null)}>
                        Free Tier
                      </DropdownMenuItem>
                      {pricingTags.map(tag => (
                        <DropdownMenuItem key={tag.id} onClick={() => handleUpdateCliPadPlan(company.id, tag.id)}>
                          {tag.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-2 hover:bg-secondary rounded-md transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleImpersonate(company)}>
                        <LogIn className="w-4 h-4 mr-2" /> Impersonate Space
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusToggle(company)}>
                        {company.status === 'suspended' ? <Shield className="w-4 h-4 mr-2" /> : <UserX className="w-4 h-4 mr-2 text-orange-500" />} 
                        {company.status === 'suspended' ? 'Activate' : 'Suspend'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(company.id)} className="text-red-500 focus:text-red-500">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {companies.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No companies found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

