import { PowerSyncDatabase } from '@powersync/web';
import { supabase } from './supabaseClient';
import { AppSchema } from './AppSchema';

class SupabaseConnector {
  constructor() {
    this.client = supabase;
  }

  async safeUpsert(table, payload, onConflict = 'id') {
    let currentPayload = { ...payload };
    let attempts = 0;
    while (attempts < 20) {
      if (Object.keys(currentPayload).length === 0) return { error: null };
      attempts++;
      const { error } = await table.upsert(currentPayload, { onConflict });
      if (!error) return { error: null };

      // Check if error is PGRST204 (missing column in schema cache) or column not in table
      const match = error.message?.match(/Could not find the '([^']+)' column of '([^']+)' in the schema cache/i)
        || error.message?.match(/Could not find the '([^']+)' column/i)
        || error.message?.match(/column "([^"]+)" of relation "([^"]+)" does not exist/i)
        || error.details?.match(/column "([^"]+)" of relation "([^"]+)" does not exist/i);

      if (match && match[1] && currentPayload.hasOwnProperty(match[1])) {
        const missingCol = match[1];
        console.warn(`[PowerSync Auto-Healing] Table '${match[2] || 'unknown'}' missing column '${missingCol}' in schema cache. Retrying upsert without it.`);
        delete currentPayload[missingCol];
        continue;
      }

      throw error;
    }
    return { error: null };
  }

  async safeUpdate(table, payload, recordId) {
    let currentPayload = { ...payload };
    let attempts = 0;
    while (attempts < 20) {
      if (Object.keys(currentPayload).length === 0) return { error: null };
      attempts++;
      const { error } = await table.update(currentPayload).eq('id', recordId);
      if (!error) return { error: null };

      const match = error.message?.match(/Could not find the '([^']+)' column of '([^']+)' in the schema cache/i)
        || error.message?.match(/Could not find the '([^']+)' column/i)
        || error.message?.match(/column "([^"]+)" of relation "([^"]+)" does not exist/i)
        || error.details?.match(/column "([^"]+)" of relation "([^"]+)" does not exist/i);

      if (match && match[1] && currentPayload.hasOwnProperty(match[1])) {
        const missingCol = match[1];
        console.warn(`[PowerSync Auto-Healing] Table '${match[2] || 'unknown'}' missing column '${missingCol}' in schema cache. Retrying update without it.`);
        delete currentPayload[missingCol];
        continue;
      }

      throw error;
    }
    return { error: null };
  }

  async fetchCredentials() {
    try {
      const { data: { session }, error } = await this.client.auth.getSession();
      if (error || !session) return null;
      return {
        endpoint: import.meta.env.VITE_POWERSYNC_URL || 'https://6a1a95798d064eb85eea17a5.powersync.journeyapps.com',
        token: session.access_token
      };
    } catch (ex) {
      if (ex.message && (ex.message.includes('Failed to fetch') || ex.message.includes('timeout') || ex.message.includes('Offline'))) {
        console.warn("[PowerSync] Offline during fetchCredentials. PowerSync will retry later.");
        throw ex; // Let PowerSync's backoff handle this
      }
      return null;
    }
  }

  async uploadData(database) {
    const { data: { session }, error: sessionError } = await this.client.auth.getSession();
    if (sessionError || !session) {
      console.warn('[PowerSync] Skipping upload: No active session.');
      return;
    }
    
    // Auto-refresh token if expired or expiring within 30 seconds
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    if (expiresAt && expiresAt - now < 30) {
      try {
        console.log('[PowerSync] Token expiring soon, refreshing session...');
        await this.client.auth.refreshSession();
      } catch (e) {
        console.error('[PowerSync] Failed to refresh session, postponing upload:', e);
        return;
      }
    }

    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      for (const op of transaction.crud) {
        const table = this.client.from(op.table);
        try {
          switch (op.op) {
            case 'PUT': {
              let payload = { ...op.opData, id: op.id };
              
              if (op.table === 'industry_records' && op.id && op.id.includes('_orbitbuild')) {
                console.warn('[v0] PowerSync SKIPPED: Invalid ID for industry_records:', op.id);
                continue; // Skip this operation to prevent UUID errors and clear the queue
              }
              
              // Validate that ID is not empty for UUID-based tables
              const realEstatateTables = ['univ_re_properties', 'univ_re_clients', 'univ_re_viewings', 
                'univ_re_offers', 'univ_re_transactions', 'univ_re_commissions', 'univ_re_documents', 
                'univ_re_leases', 'univ_re_rent_payments', 'univ_re_maintenance_requests'];
              
              if (realEstatateTables.includes(op.table)) {
                // For Real Estate tables, ensure ID exists and is valid
                if (!op.id || op.id === '' || op.id === null || op.id === undefined) {
                  console.error('[v0] PowerSync SKIPPED: Empty ID for table:', op.table, {id: op.id, data: op.opData});
                  continue; // Skip this operation to prevent UUID errors
                }
                // For RE tables, build payload without the potentially-empty id from opData
                payload = {};
                if (op.opData) {
                  for (const [k, v] of Object.entries(op.opData)) {
                    // Skip empty id fields from opData, we'll use op.id instead
                    if (k === 'id' && (!v || v === '')) continue;
                    // For fields that end in _id, allow them even if they're not valid UUIDs (now stored as TEXT)
                    payload[k] = v;
                  }
                }
                // Ensure the correct op.id is used
                payload.id = op.id;
              }
              
              if (op.table === 'profiles') {
                const allowed = ['id', 'created_at', 'updated_at', 'created_by', 'role', 'company_id', 'company_name', 'phone', 'avatar_url', 'department', 'bar_number'];
                payload = Object.fromEntries(Object.entries(payload).filter(([k]) => allowed.includes(k)));
              }
              if (op.table === 'automation_logs') {
                const allowed = ['id', 'company_id', 'created_at', 'status', 'rule_id'];
                payload = Object.fromEntries(Object.entries(payload).filter(([k]) => allowed.includes(k)));
              }

              if (op.table === 'univ_appointments') {
                payload.attendee_name = payload.attendee_name || payload.client_name || payload.title || 'Appointment attendee';
                payload.title = payload.title || payload.attendee_name || 'Appointment';
                payload.start_time = payload.time || '09:00';
              }
              
              if (op.table === 'univ_lab_results') {
                delete payload.document_url;
              }
              
              if (op.table === 'univ_admissions') {
                payload.bed_number = payload.bed_number || 'TBD';
              }
              
              if (op.table === 'univ_prescriptions') {
                payload.medication = payload.medication || 'Unspecified';
              }
              
              if (op.table === 'univ_wards') {
                payload.ward_name = payload.ward_name || 'Ward';
              }
              
              if (op.table === 'companies') {
                // Strip out columns that might not exist in Supabase to prevent 400 Bad Request errors
                // This guarantees the offline-first sync succeeds for the standard columns
                const safeColumns = [
                  'id', 'created_at', 'updated_at', 'created_by', 'name', 'subdomain',
                  'custom_domain', 'email', 'phone', 'country', 'city', 'address',
                  'logo_url', 'logo_light_url', 'favicon_url', 'tagline', 'primary_color',
                  'subscription_plan', 'subscription_status', 'max_users', 'max_cases',
                  'max_storage_gb', 'admin_email', 'status', 'currency'
                ];
                payload = Object.fromEntries(Object.entries(payload).filter(([k]) => safeColumns.includes(k)));
              }
              
              // Cast text id to UUID for tables that use UUID primary keys
              if (op.table === 'invoices' && payload.id && typeof payload.id === 'string') {
                payload.id = String(payload.id).trim();
              }
              
              if (op.table === 'companies') {
                // Companies require update instead of upsert due to RLS INSERT restrictions for standard users
                const { error } = await this.safeUpdate(table, payload, op.id);
                if (error) throw error;
              } else {
                const { error } = await this.safeUpsert(table, payload, 'id');
                if (error) throw error;
              }
              break;
            }
            case 'PATCH': {
              let payload = { ...op.opData };
              if (op.table === 'profiles') {
                const allowed = ['id', 'created_at', 'updated_at', 'created_by', 'role', 'company_id', 'company_name', 'phone', 'avatar_url', 'department', 'bar_number'];
                payload = Object.fromEntries(Object.entries(payload).filter(([k]) => allowed.includes(k)));
              }
              if (op.table === 'automation_logs') {
                const allowed = ['id', 'company_id', 'created_at', 'status', 'rule_id'];
                payload = Object.fromEntries(Object.entries(payload).filter(([k]) => allowed.includes(k)));
              }
              if (op.table === 'univ_appointments') {
                if (!payload.attendee_name && (payload.client_name || payload.title)) {
                  payload.attendee_name = payload.client_name || payload.title;
                }
                if (!payload.title && payload.attendee_name) {
                  payload.title = payload.attendee_name;
                }
                if (payload.time) {
                  payload.start_time = payload.time;
                }
              }
              
              if (op.table === 'univ_lab_results') {
                delete payload.document_url;
              }
              
              if (op.table === 'univ_admissions') {
                if (payload.bed_number === '' || payload.bed_number === null) {
                  payload.bed_number = 'TBD';
                }
              }
              
              if (op.table === 'univ_prescriptions') {
                if (payload.medication === '' || payload.medication === null) {
                  payload.medication = 'Unspecified';
                }
              }
              
              if (op.table === 'univ_wards') {
                if (payload.ward_name === '' || payload.ward_name === null) {
                  payload.ward_name = 'Ward';
                }
              }
              if (op.table === 'companies') {
                const safeColumns = [
                  'id', 'created_at', 'updated_at', 'created_by', 'name', 'subdomain',
                  'custom_domain', 'email', 'phone', 'country', 'city', 'address',
                  'logo_url', 'logo_light_url', 'favicon_url', 'tagline', 'primary_color',
                  'subscription_plan', 'subscription_status', 'max_users', 'max_cases',
                  'max_storage_gb', 'admin_email', 'status', 'currency'
                ];
                payload = Object.fromEntries(Object.entries(payload).filter(([k]) => safeColumns.includes(k)));
                
                // Use update instead of upsert because upsert requires INSERT privileges which might fail due to RLS
                const { error } = await this.safeUpdate(table, payload, op.id);
                if (error) throw error;
                break;
              }
              // Real Estate tables - allow all fields for PATCH
              const realtEstateTablesForPatch = ['univ_re_properties', 'univ_re_clients', 'univ_re_viewings', 
                'univ_re_offers', 'univ_re_transactions', 'univ_re_commissions', 'univ_re_documents', 
                'univ_re_leases', 'univ_re_rent_payments', 'univ_re_maintenance_requests', 'univ_re_leads'];
              
              if (Object.keys(payload).length > 0) {
                const { error } = await this.safeUpdate(table, payload, op.id);
                if (error) throw error;
              }
              break;
            }
            case 'DELETE': {
              const { error } = await table.delete().eq('id', op.id);
              if (error) throw error;
              break;
            }
          }
        } catch (opEx) {
          // TIER 1: Network / transient errors
          if (opEx.message && (opEx.message.includes('Failed to fetch') || opEx.message.includes('timeout') || opEx.message.includes('Offline'))) {
            throw opEx;
          }

          // TIER 2: Soft conflicts (e.g., 409 or Unique Constraint Violation)
          if (opEx.status === 409 || opEx.code === '23505') {
            const { data: serverRecord } = await this.client.from(op.table).select('updated_at').eq('id', op.id).single();
            if (serverRecord && op.opData && op.opData.updated_at) {
              const serverTime = new Date(serverRecord.updated_at).getTime();
              const localTime = new Date(op.opData.updated_at).getTime();
              
              if (localTime > serverTime) {
                console.warn(`[PowerSync] Conflict on ${op.table} - Local wins. Retrying upsert.`);
                // We could retry here with an override flag, but simply letting it pass or ignoring isn't fully resolving it.
                // For now, we fall through to skip this op, or ideally we'd attempt another upsert.
              } else {
                console.warn(`[PowerSync] Conflict on ${op.table} - Server wins. Discarding local op.`);
              }
            } else {
              console.warn(`[PowerSync] Conflict on ${op.table} without updated_at. Discarding local op.`);
            }
            continue; // Skip the rest of the loop for this op
          }

          // TIER 3: Hard errors (401, 403, 404, 422, or 400 with PG code)
          if ([401, 403, 404, 422, 400].includes(opEx.status) || (opEx.code && typeof opEx.code === 'string')) {
            console.error(`[v0] PowerSync hard error ${op.op} on ${op.table}:`, {status: opEx.status, code: opEx.code, msg: opEx.message, data: op.opData});
            
            // Write to sync_errors table
            if (op.table !== 'sync_errors') {
              try {
                await database.execute(
                  `INSERT INTO sync_errors (id, table_name, operation, record_id, error_code, error_message, failed_at, raw_payload) 
                   VALUES (uuid(), ?, ?, ?, ?, ?, datetime('now'), ?)`,
                  [
                    op.table, 
                    op.op, 
                    op.id, 
                    opEx.code || opEx.status?.toString() || 'UNKNOWN', 
                    opEx.message || 'Unknown error',
                    JSON.stringify(op.opData || {})
                  ]
                );
              } catch (errWrite) {
                console.error('[PowerSync] Failed to log sync error locally:', errWrite);
              }
            }

            // Emit custom DOM event
            const eventPayload = {
              table: op.table,
              operation: op.op,
              recordId: op.id,
              errorCode: opEx.code || opEx.status,
              errorMessage: opEx.message};
            window.dispatchEvent(new CustomEvent('sync:hard-error', { detail: eventPayload }));
            
            continue; // Skip this operation in the queue
          }

          // Fallback catch-all for unknown errors
          console.error(`[PowerSync] Unknown error uploading operation ${op.op} on ${op.table}:`, opEx);
        }
      }
      await transaction.complete();
    } catch (ex) {
      console.warn(`[PowerSync] Network error during uploadData, will retry later.`, ex);
      throw ex;
    }
  }
}

let dbName = 'slate.db';
let powerSyncDb;

try {
  powerSyncDb = new PowerSyncDatabase({
    database: { dbFilename: dbName },
    schema: AppSchema
  });
} catch (e) {
  console.warn('[PowerSync] Primary IndexedDB store open failed, initializing with fallback store:', e);
  dbName = `slate_${Date.now()}.db`;
  try {
    powerSyncDb = new PowerSyncDatabase({
      database: { dbFilename: dbName },
      schema: AppSchema
    });
  } catch (e2) {
    console.error('[PowerSync] IndexedDB disabled or corrupted in this browser session:', e2);
  }
}

export const powerSync = powerSyncDb || new PowerSyncDatabase({
  database: { dbFilename: 'slate_fallback.db' },
  schema: AppSchema
});

// ------------------------------------------------------------------------------------------------
// GLOBAL DATABASE INTERCEPTOR
// Hook into the raw execution pipeline to automatically trigger global React Query invalidations
// and UI Success/Error toasts without writing manual try/catch blocks in every UI component.
// ------------------------------------------------------------------------------------------------
const originalExecute = powerSync.execute.bind(powerSync);
powerSync.execute = async (sql, parameters) => {
  try {
    const res = await originalExecute(sql, parameters);
    
    // Determine if this is a mutation (write) query
    const upperSql = typeof sql === 'string' ? sql.trim().toUpperCase() : '';
    if (upperSql.startsWith('INSERT') || upperSql.startsWith('UPDATE') || upperSql.startsWith('DELETE')) {
      // Exclude noisy background tables from visual popups, but they will STILL trigger query invalidations
      const isNoisy = upperSql.includes('USAGE_METRICS') || 
                      upperSql.includes('NOTIFICATIONS') || 
                      upperSql.includes('SYNC_ERRORS') || 
                      upperSql.includes('CHAT_MESSAGES');
                      
      window.dispatchEvent(new CustomEvent('db:local-mutation-success', { 
        detail: { sql, isNoisy } 
      }));
    }
    return res;
  } catch (err) {
    const upperSql = typeof sql === 'string' ? sql.trim().toUpperCase() : '';
    if (upperSql.startsWith('INSERT') || upperSql.startsWith('UPDATE') || upperSql.startsWith('DELETE')) {
      window.dispatchEvent(new CustomEvent('db:local-mutation-error', { 
        detail: { sql, error: err } 
      }));
    }
    throw err;
  }
};

let initPromise = null;
export const initPowerSync = () => {
  if (!initPromise) {
    initPromise = (async () => {
      const connector = new SupabaseConnector();
      await powerSync.init();
      await powerSync.connect(connector);
    })();
  }
  return initPromise;
};
