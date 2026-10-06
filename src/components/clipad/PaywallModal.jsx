import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, X, Shield, Zap, Video } from 'lucide-react';
import PaystackAPI from '../../api/PaystackAPI';
import { useAuth } from '../../lib/AuthContext';
import { powerSync } from '../../api/PowerSyncConnector';

export const PaywallModal = ({ isOpen, onClose, featureName = "This feature", limitDescription = "You have reached your limit on the free plan." }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    if (!user) {
      setError("You must be logged in to upgrade.");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      await PaystackAPI.initializePayment({
        email: user.email,
        amount: 2900, // Updated to $29 baseline
        metadata: {
          userId: user.id,
          plan: 'pro_monthly'
        }
      }, async (response) => {
        // Payment successful
        try {
          // Update the user's profile to PRO locally. 
          // (In a production environment, this should be done via webhooks from Paystack to a secure backend to prevent client-side manipulation).
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          
          await powerSync.execute(
            `UPDATE profiles SET subscription_tier = ?, paystack_customer_id = ?, subscription_active_until = ? WHERE id = ?`,
            ['pro', response.reference, nextMonth.toISOString(), user.id]
          );

          if (user?.company_id) {
            try {
              await supabase
                .from('companies')
                .update({ subscription_plan: 'pro', subscription_status: 'active' })
                .eq('id', user.company_id);
            } catch (e) {}
          }
          
          setIsLoading(false);
          onClose(true); // true indicates successful upgrade
          window.location.reload();
        } catch (dbError) {
          console.error("Failed to update subscription status:", dbError);
          setError("Payment succeeded but failed to update status. Please contact support.");
          setIsLoading(false);
        }
      }, () => {
        // Payment closed
        setIsLoading(false);
      });
    } catch (err) {
      setError(err.message || "Failed to initialize payment.");
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden bg-white dark:bg-card border shadow-2xl rounded-2xl dark:bg-card border-slate-200 dark:border-border"
        >
          {/* Header Graphic */}
          <div className="relative shrink-0 h-24 overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[radial-gradient(#rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <div className="absolute flex items-center justify-center w-16 h-16 transform -translate-x-1/2 bg-white dark:bg-card rounded-full shadow-lg left-1/2 -bottom-8 dark:bg-card">
              <Sparkles className="w-8 h-8 text-indigo-500" />
            </div>
          </div>

          {/* Close button */}
          <button 
            onClick={() => onClose(false)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="px-6 pt-10 pb-6 text-center overflow-y-auto">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-foreground mb-2">
              Upgrade to Clipad Pro
            </h2>
            <p className="text-sm text-slate-600 dark:text-muted-foreground mb-6">
              {limitDescription} Upgrade to unlock unlimited access.
            </p>

            <div className="space-y-3 text-left mb-8">
              {[
                { icon: Video, text: "Unlimited recording duration" },
                { icon: Shield, text: "Create unlimited spaces & groups" },
                { icon: Zap, text: "Advanced AI summaries & transcriptions" },
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-secondary/50">
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                    <benefit.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-foreground">
                    {benefit.text}
                  </span>
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="relative w-full group overflow-hidden rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-500 disabled:opacity-70"
            >
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                <div className="relative h-full w-8 bg-white/20" />
              </div>
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin text-white/70" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Upgrade Now - $29 / month
                </span>
              )}
            </button>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-500 dark:text-muted-foreground">
              Secured by Paystack. Cancel anytime.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PaywallModal;
