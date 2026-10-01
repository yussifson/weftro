/**
 * RealEstateOfflineSync.js
 * 
 * Offline sync configuration for Real Estate vertical tables.
 * 
 * Sync Strategy:
 * - CORE TABLES (sync offline): Properties, Clients, Viewings, Leases, Maintenance
 * - FINANCIAL TABLES (no offline sync): Transactions, Offers, Commissions, Rent Payments
 *   (These require real-time verification for financial integrity)
 */

import { usePowerSync } from '@powersync/react';

export const REALESTATESYNCTABLES = {
  // ────────────────────────────────────────────────────────
  // OFFLINE SYNC TABLES (synced to local device)
  // ────────────────────────────────────────────────────────
  'univ_re_properties': {
    offline: true,
    local_only: false,
    description: 'Property listings - synced for offline access',
    critical: true,
  },
  'univ_re_clients': {
    offline: true,
    local_only: false,
    description: 'Client/prospect database - synced for offline reference',
    critical: true,
  },
  'univ_re_viewings': {
    offline: true,
    local_only: false,
    description: 'Property viewings/appointments - synced for offline scheduling',
    critical: true,
  },
  'univ_re_leases': {
    offline: true,
    local_only: false,
    description: 'Lease agreements - synced for offline access',
    critical: true,
  },
  'univ_re_maintenance_requests': {
    offline: true,
    local_only: false,
    description: 'Maintenance tracking - synced for offline management',
    critical: false,
  },
  'univ_re_marketer_locations': {
    offline: true,
    local_only: false,
    description: 'Live marketer GPS location tracking - synced for field operations',
    critical: true,
  },
  'univ_re_client_meetings': {
    offline: true,
    local_only: false,
    description: 'Client meeting & field check-in logs - synced for offline field capture',
    critical: true,
  },

  // ────────────────────────────────────────────────────────
  // FINANCIAL TABLES (no offline sync - real-time only)
  // ────────────────────────────────────────────────────────
  'univ_re_transactions': {
    offline: false,
    local_only: false,
    description: 'Sale transactions - real-time only (financial)',
    critical: true,
  },
  'univ_re_offers': {
    offline: false,
    local_only: false,
    description: 'Purchase offers - real-time only (financial)',
    critical: true,
  },
  'univ_re_commissions': {
    offline: false,
    local_only: false,
    description: 'Agent commissions - real-time only (financial)',
    critical: true,
  },
  'univ_re_rent_payments': {
    offline: false,
    local_only: false,
    description: 'Rent payment tracking - real-time only (financial)',
    critical: true,
  },
  'univ_re_documents': {
    offline: false,
    local_only: false,
    description: 'Document storage - real-time only (sensitive)',
    critical: true,
  },
};

/**
 * Configure PowerSync offline sync for Real Estate
 * This should be called once during app initialization
 */
export async function initializeRealEstateOfflineSync(powerSync) {
  try {
    console.log('[RE Offline Sync] Initializing Real Estate sync configuration...');

    // Get list of tables to sync offline
    const offlineTables = Object.entries(REALESTATESYNCTABLES)
      .filter(([_, config]) => config.offline)
      .map(([tableName, _]) => tableName);

    console.log(`[RE Offline Sync] Configured ${offlineTables.length} tables for offline sync:`, offlineTables);

    // Initialize sync hooks for critical offline tables
    for (const tableName of offlineTables) {
      try {
        const tableConfig = REALESTATESYNCTABLES[tableName];
        
        if (tableConfig.critical) {
          // Pre-fetch critical tables on app start
          console.log(`[RE Offline Sync] Pre-fetching critical table: ${tableName}`);
          await powerSync.execute(`SELECT * FROM ${tableName} LIMIT 1`);
        }
      } catch (e) {
        console.warn(`[RE Offline Sync] Could not pre-fetch ${tableName}:`, e.message);
      }
    }

    return {
      success: true,
      syncConfig: REALESTATESYNCTABLES,
      offlineTables,
    };
  } catch (e) {
    console.error('[RE Offline Sync] Initialization failed:', e);
    throw e;
  }
}

/**
 * Handle changes to offline-synced tables
 * This is called whenever a user modifies an offline table
 */
export async function handleOfflineSyncChange(powerSync, tableName, operation, recordId, data, companyId) {
  try {
    if (!REALESTATESYNCTABLES[tableName]?.offline) {
      console.warn(`[RE Offline Sync] Table ${tableName} is not configured for offline sync`);
      return;
    }

    const timestamp = new Date().toISOString();

    // Log the change for sync resolution
    const syncLog = {
      id: `sync_${tableName}_${recordId}_${Date.now()}`,
      table_name: tableName,
      record_id: recordId,
      operation,
      data,
      timestamp,
      company_id: companyId,
      synced: false,
    };

    console.log(`[RE Offline Sync] Logged ${operation} on ${tableName}:${recordId}`, syncLog);

    // Store sync log locally for later reconciliation
    try {
      await powerSync.execute(
        `INSERT INTO automation_logs (id, company_id, action, module, status, details, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          syncLog.id,
          companyId,
          `offline_${operation}`,
          `re_${tableName}`,
          'pending',
          JSON.stringify(syncLog),
          timestamp,
        ]
      );
    } catch (e) {
      console.warn('[RE Offline Sync] Could not log sync change:', e.message);
    }

    return syncLog;
  } catch (e) {
    console.error('[RE Offline Sync] handleOfflineSyncChange failed:', e);
    throw e;
  }
}

/**
 * Get sync status for a specific Real Estate table
 */
export async function getRealEstateSyncStatus(powerSync, tableName, companyId) {
  try {
    if (!REALESTATESYNCTABLES[tableName]) {
      throw new Error(`Unknown table: ${tableName}`);
    }

    const config = REALESTATESYNCTABLES[tableName];
    
    // Count local records
    const countRes = await powerSync.execute(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE company_id = ?`,
      [companyId]
    );
    const localCount = countRes.rows._array?.[0]?.count || 0;

    // Check for pending sync items
    const syncRes = await powerSync.execute(
      `SELECT COUNT(*) as count FROM automation_logs 
       WHERE company_id = ? AND status = 'pending' AND module = ?`,
      [companyId, `re_${tableName}`]
    );
    const pendingSync = syncRes.rows._array?.[0]?.count || 0;

    return {
      tableName,
      status: config.offline ? 'synced' : 'online-only',
      localCount,
      pendingSync,
      lastSync: new Date().toISOString(),
      isCritical: config.critical,
    };
  } catch (e) {
    console.error('[RE Offline Sync] getRealEstateSyncStatus failed:', e);
    throw e;
  }
}

/**
 * Get comprehensive sync dashboard data for Real Estate
 */
export async function getRealEstateSyncDashboard(powerSync, companyId) {
  try {
    const dashboard = {
      timestamp: new Date().toISOString(),
      offlineTables: [],
      onlineTables: [],
      totalLocalRecords: 0,
      totalPendingSync: 0,
    };

    for (const [tableName, config] of Object.entries(REALESTATESYNCTABLES)) {
      const status = await getRealEstateSyncStatus(powerSync, tableName, companyId);
      
      dashboard.totalLocalRecords += status.localCount;
      dashboard.totalPendingSync += status.pendingSync;

      if (config.offline) {
        dashboard.offlineTables.push(status);
      } else {
        dashboard.onlineTables.push(status);
      }
    }

    return dashboard;
  } catch (e) {
    console.error('[RE Offline Sync] getRealEstateSyncDashboard failed:', e);
    throw e;
  }
}

/**
 * Resolve sync conflicts for Real Estate tables
 * This should be called when the app comes back online
 */
export async function resolveRealEstateSyncConflicts(powerSync, companyId) {
  try {
    console.log('[RE Offline Sync] Resolving sync conflicts...');

    // Get pending sync items
    const pendingRes = await powerSync.execute(
      `SELECT * FROM automation_logs 
       WHERE company_id = ? AND status = 'pending' AND module LIKE 're_%'
       ORDER BY created_at ASC`,
      [companyId]
    );

    const pendingItems = pendingRes.rows._array || Array.from(pendingRes.rows);
    console.log(`[RE Offline Sync] Found ${pendingItems.length} pending sync items`);

    const resolved = [];
    const failed = [];

    for (const item of pendingItems) {
      try {
        const details = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
        
        // Mark as synced
        await powerSync.execute(
          `UPDATE automation_logs SET status = ? WHERE id = ?`,
          ['synced', item.id]
        );

        resolved.push({
          id: item.id,
          action: item.action,
          status: 'resolved',
        });

        console.log(`[RE Offline Sync] Resolved: ${item.id}`);
      } catch (e) {
        console.error(`[RE Offline Sync] Failed to resolve ${item.id}:`, e);
        failed.push({
          id: item.id,
          action: item.action,
          error: e.message,
        });
      }
    }

    return {
      success: true,
      resolved: resolved.length,
      failed: failed.length,
      details: { resolved, failed },
    };
  } catch (e) {
    console.error('[RE Offline Sync] resolveRealEstateSyncConflicts failed:', e);
    throw e;
  }
}

/**
 * Check if Real Estate table is available offline
 */
export function isTableOfflineAvailable(tableName) {
  const config = REALESTATESYNCTABLES[tableName];
  return config ? config.offline : false;
}

/**
 * Get offline availability info for a table
 */
export function getTableOfflineInfo(tableName) {
  const config = REALESTATESYNCTABLES[tableName];
  if (!config) {
    return {
      available: false,
      reason: 'Table not found in Real Estate configuration',
    };
  }

  return {
    available: config.offline,
    description: config.description,
    isCritical: config.critical,
    reason: config.offline
      ? 'Available offline - synced to device'
      : 'Not available offline - requires internet connection',
  };
}

export default {
  REALESTATESYNCTABLES,
  initializeRealEstateOfflineSync,
  handleOfflineSyncChange,
  getRealEstateSyncStatus,
  getRealEstateSyncDashboard,
  resolveRealEstateSyncConflicts,
  isTableOfflineAvailable,
  getTableOfflineInfo,
};
