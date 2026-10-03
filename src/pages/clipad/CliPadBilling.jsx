import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useCompanyId } from '@/hooks/useCompanyId';
import { supabase } from '@/api/supabaseClient';
import { logAuditEvent } from '@/lib/auditLogger';
import { PLAN_LIMITS } from '@/lib/clipadPricing';
import { Check, Loader2, Sparkles, FileText, ArrowUpRight } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import ContactSalesModal from '@/components/clipad/ContactSalesModal';
import PaymentReceiptModal from '@/components/clipad/PaymentReceiptModal';

export default function CliPadBilling() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const companyId = useCompanyId();
  const [currentPlan, setCurrentPlan] = useState('free');
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(218 / 19); // Fallback: 218 GHS for $19
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [receiptDetails, setReceiptDetails] = useState(null);
  const [history, setHistory] = useState([]);
  const [usedStorageGB, setUsedStorageGB] = useState(0);

  useEffect(() => {
    // Load Paystack script
    const script = document.createElement('script');
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);

    fetchSubscription();
    fetchExchangeRate();
    fetchHistory();

    return () => {
      document.body.removeChild(script);
    };
  }, [companyId]);

  const fetchSubscription = async () => {
    if (!companyId) {
      setInitializing(false);
      return;
    }
    try {
      // 0. Fetch company name for receipts
      const { data: companyData } = await supabase
        .from('companies')
        .select('name, clipad_pricing_tags(name)')
        .eq('id', companyId)
        .maybeSingle();
      if (companyData?.name) setCompanyName(companyData.name);

      // 1. Check company_subscriptions (set by Paystack payments or admin sync trigger)
      const { data: subData } = await supabase
        .from('company_subscriptions')
        .select('plan_id, status, updated_at, current_period_end')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .maybeSingle();

      if (subData?.plan_id && subData.plan_id !== 'free') {
        setCurrentPlan(subData.plan_id);
        setInitializing(false);
        return;
      }

      // 2. Fallback: read from companies.pricing_tag_id (already fetched in step 0)
      if (companyData?.clipad_pricing_tags?.name) {
        const tagName = companyData.clipad_pricing_tags.name.toLowerCase();
        if (tagName.includes('enterprise')) {
          setCurrentPlan('enterprise');
        } else if (tagName.includes('pro')) {
          setCurrentPlan('pro');
        } else {
          setCurrentPlan(subData?.plan_id || 'free');
        }
      } else {
        setCurrentPlan(subData?.plan_id || 'free');
      }

      if (subData) {
        setSubscriptionData(subData);
      }
    } catch (e) {
      console.error(e);
      setCurrentPlan('free');
    } finally {
      setInitializing(false);
    }
  };

  
  const fetchHistory = async () => {
    if (companyId === undefined) return;
    try {
      const { data } = await supabase
        .from('optavel_transactions')
        .select('*')
        .eq('company_id', companyId)
        .eq('category', 'clipad_billing')
        .order('created_at', { ascending: false });
      if (data) setHistory(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchExchangeRate = async () => {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await res.json();
      if (data && data.rates && data.rates.GHS) {
        setExchangeRate(data.rates.GHS);
      } else {
        setExchangeRate(218 / 19);
      }
    } catch (e) {
      console.error('Exchange rate fetch failed, using fallback 218 GHS', e);
      setExchangeRate(218 / 19);
    }
  };

  const handleUpgrade = async (planType) => {
    setLoading(true);
    try {
      const isPro = planType === 'pro';
      const amountInGhs = isPro ? Math.ceil(15 * exchangeRate) : Math.ceil(39 * exchangeRate);
      const amountInPesewas = amountInGhs * 100;
      const planCode = isPro 
            ? (import.meta.env.VITE_PAYSTACK_PLAN_CODE_PRO || 'PLN_rz16cups3jarao2')
            : (import.meta.env.VITE_PAYSTACK_PLAN_CODE_ENTERPRISE || 'PLN_0g01fqqgeymnsj7');

      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_mock', // Fallback for dev
        email: user?.email || 'user@example.com',
        amount: amountInPesewas, 
        currency: 'GHS',
        plan: planCode, // Add Paystack Plan code for subscriptions
        ref: '' + Math.floor((Math.random() * 1000000000) + 1), // generates a pseudo-unique reference
        callback: function (response) {
          toast({
            title: 'Payment Successful',
            description: `Reference: ${response.reference}. You are now on the ${planType.toUpperCase()} plan.`,
          });
          
          const receiptNum = `CLIP-${Date.now().toString(36).toUpperCase()}-${planType.slice(0,3).toUpperCase()}`;
          const newReceipt = {
            reference: response.reference,
            receiptNumber: receiptNum,
            amount: amountInPesewas,
            currency: 'GHS',
            plan: planType,
            date: new Date().toISOString(),
            email: user?.email || 'user@example.com',
            companyName: companyName || undefined,
            isAdminAssigned: false,
          };
          setReceiptDetails(newReceipt);
          setCurrentPlan(planType);
          
          if (companyId) {
            supabase.from('company_subscriptions').upsert({
              company_id: companyId,
              plan_id: planType,
              status: 'active',
              paystack_customer_code: response.reference,
              updated_at: new Date().toISOString()
            }).then(() => fetchSubscription());

            supabase.from('optavel_transactions').insert({
              id: crypto.randomUUID(),
              company_id: companyId,
              amount: amountInPesewas,
              type: 'subscription',
              category: 'clipad_billing',
              description: JSON.stringify(newReceipt),
              date: new Date().toISOString(),
              created_at: new Date().toISOString()
            }).then(() => fetchHistory());
            
            // Send email receipt to user
            supabase.functions.invoke('send-email', {
              body: {
                to: [user?.email],
                subject: `CliPad Plan Upgrade Receipt - ${receiptNum}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px; color: #0f172a;">
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden;">
                      <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; text-align: center; padding: 32px;">
                        <div style="font-size: 22px; font-weight: 900; margin-bottom: 8px;">CliPad</div>
                        <div style="font-size: 12px; font-weight: 500;">Payment Successful</div>
                        <div style="font-size: 10px; margin-top: 12px; font-family: monospace;">#${receiptNum}</div>
                      </div>
                      <div style="padding: 32px;">
                        <h2 style="text-align: center; font-size: 32px; font-weight: 900; margin-bottom: 24px;">GHS ${(amountInPesewas / 100).toFixed(2)}</h2>
                        <p style="text-align: center; font-weight: bold; margin-bottom: 32px;">${planType.toUpperCase()} Plan</p>
                        <hr style="border: 0; border-top: 1px dashed #e2e8f0; margin-bottom: 24px;" />
                        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                        <p><strong>Billed To:</strong> ${user?.email}</p>
                        <p><strong>Reference:</strong> ${response.reference}</p>
                      </div>
                    </div>
                  </div>
                `
              }
            });
          }
        },
        onClose: function () {
          toast({ title: 'Payment Cancelled', description: 'Window closed.' });
        },
      });
      handler.openIframe();
    } catch (err) {
      toast({ title: 'Error', description: 'Could not initialize Paystack', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  if (initializing) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#006065] dark:text-[#fad503]" /></div>;
  }

  const planRank = { free: 0, pro: 1, enterprise: 2, custom: 3 };
  const getButtonText = (targetPlan) => {
    if (currentPlan === targetPlan) return 'Current Plan';
    if (targetPlan === 'custom') return 'Contact Us';
    if ((planRank[currentPlan] || 0) > (planRank[targetPlan] || 0)) {
      return 'Downgrade';
    }
    return 'Upgrade';
  };

  const handleDowngrade = (planType) => {
    toast({
      title: 'Downgrade Requested',
      description: `Your request to downgrade to the ${planType.toUpperCase()} plan has been received. Our team will process this before your next billing cycle.`,
    });
    if (companyId) {
      supabase.from('optavel_transactions').insert({
        id: crypto.randomUUID(),
        company_id: companyId,
        amount: 0,
        type: 'downgrade_request',
        category: 'clipad_billing',
        description: JSON.stringify({ message: `Requested downgrade to ${planType}` }),
        date: new Date().toISOString(),
        created_at: new Date().toISOString()
      }).then(() => fetchHistory());
    }
  };

  const handlePlanClick = (targetPlan) => {
    if (currentPlan === targetPlan) return;
    if (targetPlan === 'custom') {
      navigate('/custom-pricing');
      return;
    }
    if ((planRank[currentPlan] || 0) > (planRank[targetPlan] || 0)) {
      handleDowngrade(targetPlan);
    } else {
      handleUpgrade(targetPlan);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Billing & Plans</h2>
        <p className="text-muted-foreground mt-2">Manage your CliPad subscription and features.</p>
      </div>

      {/* Billing Cycle Progress */}
      {currentPlan !== 'free' && subscriptionData && (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-foreground">Current Billing Cycle</h3>
            <span className="text-sm font-medium text-muted-foreground">
              {(() => {
                const start = new Date(subscriptionData.updated_at || Date.now());
                const end = subscriptionData.current_period_end ? new Date(subscriptionData.current_period_end) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
                const now = new Date();
                const total = end.getTime() - start.getTime();
                const elapsed = now.getTime() - start.getTime();
                const percentage = Math.max(0, Math.min(100, (elapsed / total) * 100));
                return `${Math.round(percentage)}% Elapsed`;
              })()}
            </span>
          </div>
          <div className="w-full bg-white/10 dark:bg-secondary rounded-full h-3 mb-1 overflow-hidden">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${(() => {
                const start = new Date(subscriptionData.updated_at || Date.now());
                const end = subscriptionData.current_period_end ? new Date(subscriptionData.current_period_end) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
                const now = new Date();
                const total = end.getTime() - start.getTime();
                const elapsed = now.getTime() - start.getTime();
                const percentage = Math.max(0, Math.min(100, (elapsed / total) * 100));
                if (percentage > 90) return 'bg-red-500';
                if (percentage > 70) return 'bg-amber-500';
                return 'bg-emerald-500';
              })()}`}
              style={{ width: `${(() => {
                const start = new Date(subscriptionData.updated_at || Date.now());
                const end = subscriptionData.current_period_end ? new Date(subscriptionData.current_period_end) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
                const now = new Date();
                const total = end.getTime() - start.getTime();
                const elapsed = now.getTime() - start.getTime();
                return Math.max(0, Math.min(100, (elapsed / total) * 100));
              })()}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {(() => {
              const start = new Date(subscriptionData.updated_at || Date.now());
              const end = subscriptionData.current_period_end ? new Date(subscriptionData.current_period_end) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
              return `Cycle ends on ${end.toLocaleDateString()}`;
            })()}
          </p>
        </div>
      )}

      {/* Storage Progress */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-foreground">This Month's Storage Usage</h3>
          <span className="text-sm text-muted-foreground">
            {usedStorageGB.toFixed(2)} GB / {PLAN_LIMITS[currentPlan]?.maxStorageGB === Infinity ? 'Unlimited' : `${PLAN_LIMITS[currentPlan]?.maxStorageGB} GB`} Used
          </span>
        </div>
        <div className="w-full bg-white/10 dark:bg-secondary rounded-full h-3 mb-1 overflow-hidden">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${PLAN_LIMITS[currentPlan]?.maxStorageGB !== Infinity && (usedStorageGB / PLAN_LIMITS[currentPlan]?.maxStorageGB) > 0.9 ? 'bg-red-500' : 'bg-[#006065]'}`}
            style={{ width: `${PLAN_LIMITS[currentPlan]?.maxStorageGB === Infinity ? (usedStorageGB > 0 ? 5 : 0) : Math.min(100, (usedStorageGB / PLAN_LIMITS[currentPlan]?.maxStorageGB) * 100)}%` }}
          ></div>
        </div>
        {PLAN_LIMITS[currentPlan]?.maxStorageGB !== Infinity && (usedStorageGB / PLAN_LIMITS[currentPlan]?.maxStorageGB) > 0.9 && (
          <p className="text-xs text-red-500 mt-2">You are approaching your storage limit. Upgrade your plan to continue recording.</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full items-stretch max-w-7xl mx-auto">
        {/* FREE PLAN */}
        <div className={`p-6 flex flex-col rounded-2xl border ${currentPlan === 'free' ? 'border-[#006065] bg-[#006065]/5 dark:bg-[#006065]/20 shadow-md ring-1 ring-[#006065]' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow'}`}>
          <h3 className="text-xl font-bold">Free</h3>
          <p className="text-2xl font-bold mt-2">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          <ul className="mt-4 mb-6 space-y-2.5">
            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-[#006065] dark:text-[#fad503]" /> 10 Video Meetings</li>
            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-[#006065] dark:text-[#fad503]" /> Basic AI Summaries</li>
            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-[#006065] dark:text-[#fad503]" /> 2GB Max Cloud Storage</li>
          </ul>
          <button 
            onClick={() => handlePlanClick('free')}
            disabled={currentPlan === 'free' || loading}
            className={`w-full mt-auto py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${currentPlan === 'free' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-default' : 'bg-white dark:bg-slate-900 border border-[#006065]/30 hover:border-[#006065] dark:border-slate-700 dark:hover:border-[#fad503] text-slate-900 dark:text-white shadow-sm'}`}>
            {getButtonText('free')}
          </button>
        </div>

        {/* PRO PLAN */}
        <div className={`relative p-6 flex flex-col rounded-2xl border ${currentPlan === 'pro' ? 'border-[#006065] bg-[#006065]/5 dark:bg-[#006065]/20 shadow-md ring-1 ring-[#006065]' : 'border-[#006065]/30 dark:border-[#fad503]/30 bg-white dark:bg-slate-900 shadow-md hover:shadow-lg transition-all'}`}>
          {currentPlan !== 'pro' && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#006065] text-white text-xs font-bold rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Recommended
            </div>
          )}
          <h3 className="text-xl font-bold">Pro</h3>
          <p className="text-2xl font-bold mt-2">$15<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          <p className="text-xs text-muted-foreground mt-1">
            Billed in GHS ({Math.ceil(15 * exchangeRate)} GHS)
          </p>
          <ul className="mt-4 mb-6 space-y-2.5">
            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-[#006065] dark:text-[#fad503]" /> Unlimited Meetings</li>
            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-[#006065] dark:text-[#fad503]" /> Advanced AI Action Items</li>
            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-[#006065] dark:text-[#fad503]" /> 15GB Max Cloud Storage</li>
          </ul>
          <button 
            onClick={() => handlePlanClick('pro')}
            disabled={currentPlan === 'pro' || loading}
            className={`w-full mt-8 py-2 rounded-xl font-semibold transition-all ${currentPlan === 'pro' ? 'bg-secondary text-foreground border border-border' : 'bg-[#006065] text-white hover:bg-[#006065]/90'}`}>
            {getButtonText('pro')}
          </button>
        </div>

        {/* ENTERPRISE PLAN */}
        <div className={`p-6 flex flex-col rounded-2xl border ${currentPlan === 'enterprise' ? 'border-[#006065] bg-[#006065]/5 dark:bg-[#006065]/20 shadow-md ring-1 ring-[#006065]' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow'}`}>
          <h3 className="text-xl font-bold">Enterprise</h3>
          <p className="text-2xl font-bold mt-2">$39<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          <p className="text-xs text-muted-foreground mt-1">
            Billed in GHS ({Math.ceil(39 * exchangeRate)} GHS)
          </p>
          <ul className="mt-4 mb-6 space-y-2.5">
            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-[#006065] dark:text-[#fad503]" /> Dedicated Account Manager</li>
            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-[#006065] dark:text-[#fad503]" /> Custom Payment Subdomains</li>
            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-[#006065] dark:text-[#fad503]" /> Enterprise SLAs</li>
            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-[#006065] dark:text-[#fad503]" /> 50GB Max Cloud Storage</li>
          </ul>
          <button 
            onClick={() => handlePlanClick('enterprise')}
            disabled={currentPlan === 'enterprise' || loading}
            className={`w-full mt-auto py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${currentPlan === 'enterprise' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-default' : 'bg-white dark:bg-slate-900 border border-[#006065]/30 hover:border-[#006065] dark:border-slate-700 dark:hover:border-[#fad503] text-slate-900 dark:text-white shadow-sm'}`}>
            {getButtonText('enterprise')}
          </button>
        </div>

        {/* CUSTOM PLAN */}
        <div className={`p-6 flex flex-col rounded-2xl border ${currentPlan === 'custom' ? 'border-[#006065] bg-[#006065]/5 dark:bg-[#006065]/20 shadow-md ring-1 ring-[#006065]' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow'}`}>
          <h3 className="text-xl font-bold">Custom</h3>
          <p className="text-2xl font-bold mt-2">Contact Us</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tailored deployment & licensing
          </p>
          <ul className="mt-4 mb-6 space-y-2.5">
            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-[#006065] dark:text-[#fad503]" /> Dedicated Infrastructure / On-Prem</li>
            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-[#006065] dark:text-[#fad503]" /> Custom AI Models & Fine-Tuning</li>
            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-[#006065] dark:text-[#fad503]" /> Bespoke Integrations & SLAs</li>
            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-[#006065] dark:text-[#fad503]" /> Unlimited Cloud Storage</li>
          </ul>
          <button 
            onClick={() => handlePlanClick('custom')}
            disabled={currentPlan === 'custom' || loading}
            className={`w-full mt-auto py-2.5 rounded-lg text-sm font-semibold border ${currentPlan === 'custom' ? 'bg-secondary text-foreground border-border' : 'bg-[#006065] hover:bg-[#004e52] text-white shadow-md'}`}>
            {getButtonText('custom')}
          </button>
        </div>
      </div>
      {/* Billing History */}
      <div className="mt-12">
        <h3 className="text-xl font-bold text-foreground mb-6">Billing History & Receipts</h3>
        {history.length === 0 ? (
          <div className="p-8 text-center bg-card border border-border rounded-2xl text-muted-foreground flex flex-col items-center justify-center gap-2">
            <FileText className="w-8 h-8 opacity-50" />
            <p>No billing history found.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-transparent dark:bg-[#006065] border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold text-white/70">Date</th>
                  <th className="px-6 py-4 font-semibold text-white/70">Receipt #</th>
                  <th className="px-6 py-4 font-semibold text-white/70">Plan</th>
                  <th className="px-6 py-4 font-semibold text-white/70">Amount</th>
                  <th className="px-6 py-4 font-semibold text-white/70">Status</th>
                  <th className="px-6 py-4 font-semibold text-white/70 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((tx) => {
                  let rDetails = {};
                  try { rDetails = JSON.parse(tx.description); } catch(e){}
                  
                  return (
                    <tr key={tx.id} className="hover:bg-transparent dark:hover:bg-[#006065]/50 transition-colors">
                      <td className="px-6 py-4 text-white/80 dark:text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground font-mono text-xs">
                        {rDetails.receiptNumber || tx.id.split('-')[0].toUpperCase()}
                      </td>
                      <td className="px-6 py-4 capitalize text-white/80 dark:text-muted-foreground">
                        {rDetails.plan || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        {rDetails.isAdminAssigned ? 'Admin Assigned' : `GHS ${(tx.amount / 100).toFixed(2)}`}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-wider">
                          Paid
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setReceiptDetails({ companyName: rDetails.companyName || companyName, email: rDetails.email || user?.email, ...rDetails })}
                          className="text-[#006065] dark:text-[#fad503] hover:text-[#006065] dark:text-[#fad503]/80 font-semibold flex items-center justify-end gap-1 w-full"
                        >
                          View Receipt <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ContactSalesModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
      <PaymentReceiptModal isOpen={!!receiptDetails} onClose={() => setReceiptDetails(null)} transactionDetails={receiptDetails} />
    </div>
  );
}
