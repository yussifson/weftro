import { powerSync } from '@/api/PowerSyncConnector';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

export function useLogActivity() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ action, recordType, recordId, changes }) => {
      const error = await (async () => {
        const _payload = {
          id: crypto.randomUUID(),
          user_id: user?.id || null,
          user_email: user?.email || 'Unknown User',
          user_name: user?.full_name || 'Unknown User',
          company_id: user?.company_id || null,
          action: action || 'create',
          record_type: recordType || null,
          record_id: recordId || null,
          changes: changes || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ip_address: 'Unknown IP', // Server will override or log this later if needed
          details: null
        };
        const _keys = Object.keys(_payload);
        const _vals = Object.values(_payload).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
        try {
          await powerSync.execute(`INSERT INTO audit_logs (${_keys.join(', ')}) VALUES (${_keys.map(()=>'?').join(', ')})`, _vals);
          return null;
        } catch(e) { return e; }
      })();
      if (error) console.warn('Audit log error (non-fatal):', error);
    }
  });
}
