import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/api/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Send, CheckCircle } from 'lucide-react';

export default function ContactSalesModal({ isOpen, onClose }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Assuming a generic clipad_contact_requests table or support table
      const { error } = await supabase.from('clipad_contact_requests').insert([{
        name: form.name,
        email: form.email,
        company: form.company,
        message: form.message,
        status: 'pending'
      }]);
      
      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setForm({ name: '', email: '', company: '', message: '' });
      }, 3000);
      
    } catch (err) {
      console.error(err);
      toast({
        title: "Error submitting request",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-background border-slate-200 dark:border-border rounded-3xl">
        {success ? (
          <div className="p-10 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Message Sent!</h2>
            <p className="text-slate-500 dark:text-muted-foreground text-sm max-w-[250px]">
              Our sales team will get back to you shortly to discuss a custom plan.
            </p>
          </div>
        ) : (
          <>
            <div className="px-8 pt-8 pb-4">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Contact Sales</DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-muted-foreground">
                  Fill out the form below and we'll be in touch to build a custom enterprise plan for your team.
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-card border border-slate-200 dark:border-border text-sm focus:outline-none focus:border-primary transition-all"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-card border border-slate-200 dark:border-border text-sm focus:outline-none focus:border-primary transition-all"
                  placeholder="jane@company.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Company</label>
                <input
                  required
                  value={form.company}
                  onChange={e => setForm({...form, company: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-card border border-slate-200 dark:border-border text-sm focus:outline-none focus:border-primary transition-all"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">How can we help?</label>
                <textarea
                  required
                  value={form.message}
                  onChange={e => setForm({...form, message: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-card border border-slate-200 dark:border-border text-sm focus:outline-none focus:border-primary transition-all resize-none"
                  placeholder="Tell us about your team's needs..."
                />
              </div>
              
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all disabled:opacity-70 shadow-sm"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Send Request <Send className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
