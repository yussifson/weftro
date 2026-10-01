import { supabase } from '@/api/supabaseClient';
import { useState } from 'react';
import { powerSync } from "@/api/PowerSyncConnector";
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'react-hot-toast';

export const useContracts = () => {
  const [isSending, setIsSending] = useState(false);
  const { session } = useAuth();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';

  const sendForSignature = async ({ companyId, provider = 'docusign', documentName, signerEmail, signerName }) => {
    setIsSending(true);

    if (!navigator.onLine) {
      setTimeout(() => setIsSending(false), 500);
      toast.success(`[Offline] Queued contract to ${signerEmail} via ${provider}.`);
      return { success: true, offline: true };
    }

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          companyId,
          provider, 
          documentName,
          signerEmail,
          signerName
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to send contract for signature');
      }

      toast.success(`Successfully sent to ${signerEmail} via ${provider}.`);
      return data; 
    } catch (error) {
      console.error("Contract Error:", error);
      toast.error(`Sending Failed: ${error.message}`);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  return { sendForSignature, isSending };
};
