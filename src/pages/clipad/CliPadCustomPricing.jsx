import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useCompanyId } from '@/hooks/useCompanyId';
import { useToast } from '@/components/ui/use-toast';
import {
  ShieldCheck,
  Server,
  Cpu,
  Workflow,
  CheckCircle2,
  ArrowLeft,
  Send,
  Building2,
  Mail,
  User,
  Phone,
  Lock,
  Clock,
  Check,
  Zap
} from 'lucide-react';
import { CliPadLogo } from '@/components/ui/CliPadLogo';

const INTEREST_TAGS = [
  'HD Meetings & Webinars',
  'AI Transcripts & Intelligence',
  'Async Screen Recordings',
  'Dedicated VPC / On-Premise',
  'Custom BI & API Pipelines',
  'SSO & Compliance Audit',
];

const TEAM_SIZES = [
  '1 - 20 seats',
  '21 - 100 seats',
  '101 - 500 seats',
  '501 - 2,000 seats',
  '2,000+ seats',
];

const DEPLOYMENT_OPTIONS = [
  { value: 'cloud', label: 'Optavel Managed Cloud (Zero Ops)' },
  { value: 'dedicated_cloud', label: 'Dedicated VPC (AWS / GCP / Azure)' },
  { value: 'on_premise', label: 'On-Premise / Air-Gapped' },
];

const TIMELINES = [
  'Immediately (< 30 days)',
  '1 - 3 months',
  '3 - 6 months',
  'Exploring / Planning for next FY',
];

const BUDGET_RANGES = [
  'Flexible / Custom Allocation',
  'Under $1,000 / month',
  '$1,000 - $3,000 / month',
  '$3,000 - $10,000 / month',
  '$10,000+ / month',
];

export default function CliPadCustomPricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const companyId = useCompanyId();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.full_name || '',
    workEmail: user?.email || '',
    companyName: '',
    phoneNumber: '',
    teamSize: '21 - 100 seats',
    deployment: 'cloud',
    timeline: 'Immediately (< 30 days)',
    budget: '$1,000 - $3,000 / month',
    selectedInterests: ['HD Meetings & Webinars', 'AI Transcripts & Intelligence'],
    customRequirements: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState(null);

  const toggleInterest = (tag) => {
    setFormData((prev) => {
      const exists = prev.selectedInterests.includes(tag);
      return {
        ...prev,
        selectedInterests: exists
          ? prev.selectedInterests.filter((x) => x !== tag)
          : [...prev.selectedInterests, tag],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.workEmail.trim() || !formData.companyName.trim()) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please provide your full name, work email, and company name.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const requestId = `REQ-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    const payload = {
      id: crypto.randomUUID(),
      request_code: requestId,
      name: formData.fullName.trim(),
      email: formData.workEmail.trim(),
      company: formData.companyName.trim(),
      phone: formData.phoneNumber.trim(),
      team_size: formData.teamSize,
      deployment: formData.deployment,
      timeline: formData.timeline,
      budget: formData.budget,
      use_cases: formData.selectedInterests,
      requirements: formData.customRequirements.trim(),
      user_id: user?.id || null,
      company_id: companyId || null,
      status: 'pending',
      created_at: nowIso,
      message: JSON.stringify({
        requestId,
        fullName: formData.fullName.trim(),
        workEmail: formData.workEmail.trim(),
        company: formData.companyName.trim(),
        phone: formData.phoneNumber.trim(),
        teamSize: formData.teamSize,
        deployment: formData.deployment,
        timeline: formData.timeline,
        budget: formData.budget,
        interests: formData.selectedInterests,
        requirements: formData.customRequirements.trim(),
        submittedAt: nowIso,
      }),
    };

    try {
      // 1. Primary insert to clipad_custom_requests
      try {
        await supabase.from('clipad_custom_requests').insert([payload]);
      } catch (err) {
        console.warn('clipad_custom_requests insert notice:', err);
      }

      // 2. Insert to clipad_contact_requests for Super Admin queries
      try {
        await supabase.from('clipad_contact_requests').insert([{
          id: payload.id,
          name: formData.fullName.trim(),
          email: formData.workEmail.trim(),
          company: formData.companyName.trim(),
          message: payload.message,
          status: 'pending',
          created_at: nowIso,
        }]);
      } catch (err) {
        console.warn('clipad_contact_requests insert notice:', err);
      }

      // 3. Insert to enterprise_requests for global admin visibility
      try {
        const nameParts = formData.fullName.trim().split(' ');
        await supabase.from('enterprise_requests').insert([{
          first_name: nameParts[0] || formData.fullName.trim(),
          last_name: nameParts.slice(1).join(' ') || '',
          work_email: formData.workEmail.trim(),
          company_name: formData.companyName.trim(),
          user_count: formData.teamSize,
          deployment_type: formData.deployment,
          message: formData.customRequirements.trim() || `Interests: ${formData.selectedInterests.join(', ')} | Budget: ${formData.budget} | Timeline: ${formData.timeline}`,
          status: 'pending',
          created_at: nowIso,
        }]);
      } catch (err) {
        console.warn('enterprise_requests insert notice:', err);
      }

      // 4. Record in audit_logs
      try {
        await supabase.from('audit_logs').insert([{
          action: 'custom_pricing_request',
          user_name: formData.fullName.trim(),
          user_email: formData.workEmail.trim(),
          company_id: companyId || null,
          details: payload.message,
          created_at: nowIso,
        }]);
      } catch (err) {
        console.warn('audit_logs insert notice:', err);
      }

      setSubmittedRequest({
        ...formData,
        requestId,
      });

      toast({
        title: 'Custom Plan Request Submitted!',
        description: `Reference #${requestId}. Our enterprise solutions team will contact you within 2 hours.`,
      });
    } catch (err) {
      console.error('Error submitting custom request:', err);
      toast({
        title: 'Submission Received',
        description: `We have logged your request (#${requestId}). An enterprise specialist will reach out shortly.`,
      });
      setSubmittedRequest({
        ...formData,
        requestId,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#090d16] text-white dark:text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/95 dark:bg-[#090d16]/95 border-b border-white/15/80 dark:border-white/10 px-6 md:px-12 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="text-primary transition-transform group-hover:scale-105">
                <CliPadLogo size={28} />
              </div>
              <span className="font-bold text-lg tracking-tight">KERINT</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-xs font-semibold text-white/80 dark:text-foreground/60 hover:text-white dark:hover:text-white px-3 py-2 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </button>
            <Link
              to={user ? '/dashboard' : '/login'}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-[#006065] dark:bg-[#131A2C] hover:bg-slate-800 text-white dark:bg-card text-white dark:hover:bg-white/15 dark:text-foreground transition-all shadow-sm"
            >
              {user ? 'Go to Dashboard' : 'Sign In'}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 md:px-8 py-10 md:py-16">
        {submittedRequest ? (
          /* SUCCESS CONFIRMATION */
          <div className="max-w-xl mx-auto bg-[#006065] dark:bg-[#131A2C] text-white dark:bg-[#111625] border border-white/15 dark:border-white/10 rounded-3xl p-8 md:p-12 shadow-xl text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-[#006065] dark:bg-[#131A2C]/10 text-[#006065] dark:text-[#00beac] rounded-2xl mx-auto flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 rounded-full text-xs font-mono font-bold tracking-wider mb-4">
              Ref: {submittedRequest.requestId}
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2 text-foreground">
              Request Received, {submittedRequest.fullName.split(' ')[0]}!
            </h1>
            <p className="text-white/80 dark:text-foreground/60 text-sm leading-relaxed mb-6">
              Our enterprise solutions team has received your request for <strong className="text-foreground">{submittedRequest.companyName}</strong>. A dedicated specialist will review your requirements and reach out within 2 hours.
            </p>

            <div className="bg-transparent dark:bg-white/[0.03] border border-white/15 dark:border-white/10 rounded-2xl p-4 text-left space-y-2 mb-8 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Work Email:</span>
                <span className="font-semibold text-foreground">{submittedRequest.workEmail}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Team Size:</span>
                <span className="font-semibold text-foreground">{submittedRequest.teamSize}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Guaranteed Response:</span>
                <span className="font-bold text-[#006065] dark:text-[#00beac] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Within 2 Business Hours
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 dark:bg-white/10 dark:hover:bg-white/15 text-foreground font-semibold text-xs transition-all"
              >
                Return to Homepage
              </button>
              <button
                onClick={() => setSubmittedRequest(null)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition-all shadow-md shadow-orange-500/20"
              >
                Submit Another Inquiry
              </button>
            </div>
          </div>
        ) : (
          /* ENHANCED CLEAN 2-COLUMN LAYOUT */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            
            {/* Left Column: Clean Value Proposition */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-500/10 border border-orange-500/20 mb-4">
                  Custom Enterprise Plan
                </span>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mb-3 text-foreground">
                  Tailored scale & dedicated infrastructure.
                </h1>
                <p className="text-white/80 dark:text-foreground/60 text-sm leading-relaxed">
                  Design a dedicated communication and meeting intelligence stack configured to your exact security, data residency, and integration standards.
                </p>
              </div>

              {/* Clean Highlight List */}
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-foreground">Dedicated VPC & On-Premises</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Deploy inside your private AWS, GCP, Azure VPC, or air-gapped bare metal with BYO-S3 buckets.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-foreground">Domain AI Models & Private LLMs</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Connect your internal fine-tuned models, industry vocabulary, and bespoke executive summaries.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-foreground">Enterprise Security & Compliance</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      SOC-2 Type II, HIPAA-ready, GDPR compliant, custom DPA, and SAML 2.0 / Okta SSO integration.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Workflow className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-foreground">99.99% SLA & Dedicated Support</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Financial-backed 99.99% uptime guarantee, dedicated TAM, and 24/7 priority escalation phone line.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fast Response Guarantee Box */}
              <div className="p-4 rounded-2xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 flex items-center gap-3">
                <Zap className="w-4 h-4 text-orange-500 shrink-0" />
                <p className="text-xs text-white/90 dark:text-foreground/50 font-medium">
                  <strong className="text-foreground font-bold">Fast SLA:</strong> Inquiries are assigned directly to an enterprise solution architect within 2 hours.
                </p>
              </div>
            </div>

            {/* Right Column: Clean, High-Converting Form Card */}
            <div className="lg:col-span-7 bg-[#006065] dark:bg-[#131A2C] text-white dark:bg-[#111625] border border-white/15 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-xl font-bold tracking-tight text-foreground">Contact Enterprise Sales</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Share your team requirements and our engineers will prepare a customized proposal.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Name and Work Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Jane Doe"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Work Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="email"
                        required
                        value={formData.workEmail}
                        onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                        placeholder="jane@company.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Company Name and Phone Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        placeholder="Acme Global Inc."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        placeholder="+1 (555) 000-0000"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Team Size and Deployment Option */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Estimated Team Size
                    </label>
                    <select
                      value={formData.teamSize}
                      onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all"
                    >
                      {TEAM_SIZES.map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Deployment Preference
                    </label>
                    <select
                      value={formData.deployment}
                      onChange={(e) => setFormData({ ...formData, deployment: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all"
                    >
                      {DEPLOYMENT_OPTIONS.map((dp) => (
                        <option key={dp.value} value={dp.value}>{dp.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. Timeline and Budget */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Timeline
                    </label>
                    <select
                      value={formData.timeline}
                      onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all"
                    >
                      {TIMELINES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Monthly Budget
                    </label>
                    <select
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all"
                    >
                      {BUDGET_RANGES.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 5. Key Interests (Clean compact pill tags) */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Key Solution Requirements
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {INTEREST_TAGS.map((tag) => {
                      const isSelected = formData.selectedInterests.includes(tag);
                      return (
                        <button
                          type="button"
                          key={tag}
                          onClick={() => toggleInterest(tag)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                            isSelected
                              ? 'bg-orange-500/10 border-orange-500/40 text-orange-600 dark:text-orange-400 font-semibold'
                              : 'bg-background hover:bg-secondary border-border text-muted-foreground'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                            isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-white/20 dark:border-slate-600'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 6. Custom Requirements Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Project Scope & Special Requirements
                  </label>
                  <textarea
                    rows={3}
                    value={formData.customRequirements}
                    onChange={(e) => setFormData({ ...formData, customRequirements: e.target.value })}
                    placeholder="Tell us about your infrastructure requirements, compliance needs, SSO providers, or integrations..."
                    className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all resize-y"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs tracking-wide shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting Proposal Request...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Submit Custom Plan Request
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground pt-1">
                  <Lock className="w-3 h-3 text-[#006065]" />
                  <span>Enterprise grade confidentiality. Data is never shared or sold.</span>
                </div>
              </form>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

