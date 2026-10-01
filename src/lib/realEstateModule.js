/**
 * realEstateModule.js
 * 
 * Central export point for the Real Estate vertical.
 * Aggregates all Real Estate functionality for easy importing and initialization.
 */

// API Handlers
export { default as RealEstateAPI } from '@/api/RealEstateAPI';

// Integrations
export {
  RealEstateNotifications,
  RealEstatePayments,
  RealEstateAutomation,
} from '@/api/RealEstateIntegrations';

// Offline Sync
export {
  REALESTATESYNCTABLES,
  initializeRealEstateOfflineSync,
  handleOfflineSyncChange,
  getRealEstateSyncStatus,
  getRealEstateSyncDashboard,
  resolveRealEstateSyncConflicts,
  isTableOfflineAvailable,
  getTableOfflineInfo,
} from '@/api/RealEstateOfflineSync';

// Intelligence Engine
export { realEstateEngine, runRealEstateIntelligence } from '@/lib/intelligence/engines/real-estate';

/**
 * Initialize Real Estate module on app startup
 * Call this once in your main App.tsx or initialization routine
 */
export async function initializeRealEstateModule(powerSync, companyId) {
  console.log('[RE Module] Initializing Real Estate vertical...');

  try {
    // 1. Initialize offline sync configuration
    const syncConfig = await initializeRealEstateOfflineSync(powerSync);
    console.log('[RE Module] Offline sync initialized:', syncConfig);

    // 2. Verify database tables exist
    const tablesVerified = await verifyRealEstateTables(powerSync, companyId);
    console.log('[RE Module] Database tables verified:', tablesVerified);

    // 3. Get sync status dashboard
    const syncDashboard = await getRealEstateSyncDashboard(powerSync, companyId);
    console.log('[RE Module] Current sync status:', syncDashboard);

    // 4. Resolve any pending sync conflicts
    if (syncDashboard.totalPendingSync > 0) {
      const resolved = await resolveRealEstateSyncConflicts(powerSync, companyId);
      console.log('[RE Module] Resolved pending syncs:', resolved);
    }

    return {
      success: true,
      initialized: true,
      syncConfig,
      syncDashboard,
      timestamp: new Date().toISOString(),
    };
  } catch (e) {
    console.error('[RE Module] Initialization failed:', e);
    throw e;
  }
}

/**
 * Verify all Real Estate tables exist in the database
 */
async function verifyRealEstateTables(powerSync, companyId) {
  const tables = Object.keys(REALESTATESYNCTABLES);
  const verification = {};

  for (const tableName of tables) {
    try {
      await powerSync.execute(
        `SELECT 1 FROM ${tableName} WHERE company_id = ? LIMIT 1`,
        [companyId]
      );
      verification[tableName] = 'available';
    } catch (e) {
      verification[tableName] = 'missing';
      console.warn(`[RE Module] Table not accessible: ${tableName}`);
    }
  }

  return verification;
}

/**
 * Get comprehensive Real Estate module status
 */
export async function getRealEstateModuleStatus(powerSync, companyId) {
  try {
    const syncDashboard = await getRealEstateSyncDashboard(powerSync, companyId);
    
    return {
      module: 'real-estate',
      status: 'active',
      sync: syncDashboard,
      timestamp: new Date().toISOString(),
    };
  } catch (e) {
    console.error('[RE Module] Status check failed:', e);
    return {
      module: 'real-estate',
      status: 'error',
      error: e.message,
    };
  }
}

/**
 * Real Estate module configuration
 */
export const REALESTATECONFIG = {
  name: 'Real Estate',
  vertical: 're',
  tables: REALESTATESYNCTABLES,
  features: {
    properties: true,
    clients: true,
    viewings: true,
    offers: true,
    transactions: true,
    leases: true,
    rentPayments: true,
    commissions: true,
    maintenance: true,
    documents: true,
  },
  integrations: {
    novu: true,
    paystack: true,
    automation: true,
  },
  offlineSync: {
    enabled: true,
    criticalTables: [
      'univ_re_properties',
      'univ_re_clients',
      'univ_re_viewings',
      'univ_re_leases',
    ],
  },
  intelligence: {
    enabled: true,
    engines: [
      'propertyValuation',
      'buyerReadiness',
      'agentPerformance',
      'leaseRenewal',
      'maintenancePriority',
    ],
  },
};

/**
 * Batch operations for common Real Estate workflows
 */
export const RealEstateWorkflows = {
  /**
   * Create a new property listing and schedule viewings
   */
  async createPropertyListing(companyId, propertyData, initialViewings = []) {
    try {
      const propertyId = await RealEstateAPI.createProperty(companyId, propertyData);
      const viewingIds = [];

      for (const viewing of initialViewings) {
        const viewingId = await RealEstateAPI.createViewing(companyId, {
          ...viewing,
          propertyId,
        });
        viewingIds.push(viewingId);
      }

      return { propertyId, viewingIds };
    } catch (e) {
      console.error('[RE Workflow] createPropertyListing failed:', e);
      throw e;
    }
  },

  /**
   * Process a complete transaction (offer -> closing)
   */
  async processTransaction(companyId, transactionData, commissionData) {
    try {
      const transactionId = await RealEstateAPI.createTransaction(companyId, transactionData);

      if (commissionData) {
        const commissionId = await RealEstateAPI.createCommission?.(companyId, {
          ...commissionData,
          transaction_id: transactionId,
        });
        return { transactionId, commissionId };
      }

      return { transactionId };
    } catch (e) {
      console.error('[RE Workflow] processTransaction failed:', e);
      throw e;
    }
  },

  /**
   * Create a lease and set up recurring rent reminders
   */
  async createLeaseWithReminders(companyId, leaseData, reminderConfig = {}) {
    try {
      const leaseId = await RealEstateAPI.createLease(companyId, leaseData);

      const { daysBeforeRenewal = 30, daysBeforeRent = 5 } = reminderConfig;

      // Setup lease renewal reminder
      await RealEstateAutomation.setupLeaseRenewalReminder(companyId, leaseData, daysBeforeRenewal);

      // Setup rent payment reminder
      await RealEstateAutomation.setupRentPaymentReminder(companyId, leaseData, daysBeforeRent);

      return { leaseId };
    } catch (e) {
      console.error('[RE Workflow] createLeaseWithReminders failed:', e);
      throw e;
    }
  },
};

/**
 * Export everything as a unified module
 */
export default {
  // Core APIs
  API: RealEstateAPI,
  Integrations: {
    Notifications: RealEstateNotifications,
    Payments: RealEstatePayments,
    Automation: RealEstateAutomation,
  },
  Sync: {
    initialize: initializeRealEstateOfflineSync,
    getStatus: getRealEstateSyncStatus,
    getDashboard: getRealEstateSyncDashboard,
    resolveConflicts: resolveRealEstateSyncConflicts,
  },
  Intelligence: {
    engine: realEstateEngine,
    run: runRealEstateIntelligence,
  },
  Workflows: RealEstateWorkflows,
  Config: REALESTATECONFIG,
  initialize: initializeRealEstateModule,
  getStatus: getRealEstateModuleStatus,
};
