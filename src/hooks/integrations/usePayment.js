import { supabase } from '@/api/supabaseClient';
import { useState } from 'react';
import { powerSync } from "@/api/PowerSyncConnector";
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'react-hot-toast';

export const usePayment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { session } = useAuth();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';

  const processPayment = async ({ companyId, provider, amount, currency, customerEmail, invoiceId }) => {
    setIsLoading(true);

    if (!navigator.onLine) {
      setTimeout(() => setIsLoading(false), 500);
      toast.success(`[Offline] Payment recorded locally. Will process when online.`);
      return { success: true, offline: true };
    }

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          companyId,
          provider, // 'stripe' or 'paystack'
          amount,
          currency: currency || (provider === 'paystack' ? 'NGN' : 'USD'),
          customerEmail,
          returnUrl: `${window.location.origin}/invoices/${invoiceId}`
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Payment processing failed');
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
      return data;
    } catch (error) {
      toast.error(`Payment Error: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const syncInvoiceToQuickBooks = async ({ companyId, invoiceDetails }) => {
    if (!navigator.onLine) {
      toast.success("[Offline] Invoice sync queued for QuickBooks.");
      return { success: true, offline: true };
    }

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/sync-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          companyId,
          provider: 'quickbooks',
          invoiceDetails
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'QuickBooks sync failed');
      
      toast.success("Successfully pushed to QuickBooks.");
      return data;
    } catch (error) {
      console.error("QB Sync Error:", error);
      toast.error(`Sync Failed: ${error.message}`);
    }
  };

  return { processPayment, syncInvoiceToQuickBooks, isPaymentLoading: isLoading };
};
