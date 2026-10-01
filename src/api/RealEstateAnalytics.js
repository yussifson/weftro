/**
 * RealEstateAnalytics.js
 * 
 * Comprehensive analytics, reporting, audit logs, and KPI tracking
 */

import { powerSync } from '@/api/PowerSyncConnector';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const RealEstateAnalytics = {
  // ────────────────────────────────────────────────────────
  // AUDIT LOGGING
  // ────────────────────────────────────────────────────────

  async logAuditEvent(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_audit_log 
         (id, company_id, user_id, action, resource_type, resource_id, changes,
          ip_address, user_agent, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, userId, data.action, data.resourceType, data.resourceId,
         JSON.stringify(data.changes || {}), data.ipAddress || null,
         data.userAgent || null, data.status || 'success', now]
      );

      return id;
    } catch (e) {
      console.warn('[Analytics] logAuditEvent failed:', e);
    }
  },

  async getAuditLog(companyId, filters = {}) {
    try {
      let query = `SELECT * FROM univ_re_audit_log WHERE company_id = ?`;
      const params = [companyId];

      if (filters.userId) {
        query += ' AND user_id = ?';
        params.push(filters.userId);
      }
      if (filters.resourceType) {
        query += ' AND resource_type = ?';
        params.push(filters.resourceType);
      }
      if (filters.action) {
        query += ' AND action = ?';
        params.push(filters.action);
      }
      if (filters.startDate) {
        query += ' AND created_at >= ?';
        params.push(filters.startDate);
      }
      if (filters.endDate) {
        query += ' AND created_at <= ?';
        params.push(filters.endDate);
      }

      query += ' ORDER BY created_at DESC LIMIT 1000';
      const result = await powerSync.execute(query, params);
      return result.rows._array || [];
    } catch (e) {
      console.error('[Analytics] getAuditLog failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // PORTFOLIO ANALYTICS
  // ────────────────────────────────────────────────────────

  async getPortfolioAnalytics(companyId) {
    try {
      // Total properties
      const propertyResult = await powerSync.execute(
        `SELECT COUNT(*) as total_properties,
                SUM(estimated_value) as total_portfolio_value,
                AVG(estimated_value) as avg_property_value
         FROM univ_re_properties WHERE company_id = ?`,
        [companyId]
      );

      const propertyStats = propertyResult.rows._array ? propertyResult.rows._array[0] : {};

      // Active leases
      const leaseResult = await powerSync.execute(
        `SELECT COUNT(*) as active_leases,
                SUM(monthly_rent) as total_monthly_rent
         FROM univ_re_leases WHERE company_id = ? AND status = 'active'`,
        [companyId]
      );

      const leaseStats = leaseResult.rows._array ? leaseResult.rows._array[0] : {};

      // Portfolio by type
      const typeResult = await powerSync.execute(
        `SELECT property_type, COUNT(*) as count, SUM(estimated_value) as total_value
         FROM univ_re_properties WHERE company_id = ? GROUP BY property_type`,
        [companyId]
      );

      const typeBreakdown = typeResult.rows._array || [];

      return {
        totalProperties: propertyStats.total_properties || 0,
        totalPortfolioValue: propertyStats.total_portfolio_value || 0,
        averagePropertyValue: propertyStats.avg_property_value || 0,
        activeLeases: leaseStats.active_leases || 0,
        totalMonthlyRent: leaseStats.total_monthly_rent || 0,
        portfolioByType: typeBreakdown.map(t => ({
          type: t.property_type,
          count: t.count,
          value: t.total_value
        }))
      };
    } catch (e) {
      console.error('[Analytics] getPortfolioAnalytics failed:', e);
      throw e;
    }
  },

  
  async getClientScoring(companyId) {
    try {
      const result = await powerSync.execute(
        'SELECT * FROM univ_re_client_scoring WHERE company_id = ? ORDER BY created_at DESC LIMIT 100',
        [companyId]
      );
      return result.rows._array || [];
    } catch (e) {
      console.error('[Analytics] getClientScoring failed:', e);
      return [];
    }
  },

  // ────────────────────────────────────────────────────────
  // AGENT METRICS
  // ────────────────────────────────────────────────────────

  async getAgentMetrics(companyId) {
    try {
      // Get agent performance data
      const result = await powerSync.execute(
        `SELECT 
           u.id,
           u.name as agent_name,
           COUNT(DISTINCT CASE WHEN t.status = 'closed' THEN t.id END) as listings_sold_count,
           COUNT(DISTINCT CASE WHEN p.agent_id = u.id THEN p.id END) as listings_taken_count,
           COUNT(DISTINCT c.id) as client_count,
           COALESCE(SUM(CASE WHEN t.status = 'closed' THEN t.sale_price ELSE 0 END), 0) as sales_volume,
           COALESCE(AVG(CASE WHEN t.status = 'closed' THEN t.sale_price ELSE 0 END), 0) as average_sale_price,
           0 as commission_earned,
           0 as return_client_rate,
           'monthly' as metric_period
         FROM univ_re_team_members u
         LEFT JOIN univ_re_properties p ON u.id = p.agent_id AND p.company_id = ?
         LEFT JOIN univ_re_clients c ON u.id = c.assigned_agent AND c.company_id = ?
         LEFT JOIN univ_re_transactions t ON u.id = t.agent_id AND t.company_id = ?
         WHERE u.company_id = ? AND u.role IN ('agent', 'team_lead')
         GROUP BY u.id, u.name
         ORDER BY sales_volume DESC`,
        [companyId, companyId, companyId, companyId]
      );

      return (result.rows._array || []).map(row => ({
        id: row.id,
        agent_id: row.id,
        agent_name: row.agent_name,
        listings_sold_count: row.listings_sold_count || 0,
        listings_taken_count: row.listings_taken_count || 0,
        client_count: row.client_count || 0,
        sales_volume: row.sales_volume || 0,
        average_sale_price: row.average_sale_price || 0,
        commission_earned: row.commission_earned || 0,
        return_client_rate: row.return_client_rate || 0,
        metric_period: row.metric_period
      }));
    } catch (e) {
      console.error('[Analytics] getAgentMetrics failed:', e);
      return [];
    }
  },

  // ────────────────────────────────────────────────────────
  // TRANSACTION ANALYTICS
  // ────────────────────────────────────────────────────────

  async getTransactionAnalytics(companyId, dateRange = {}) {
    try {
      let query = `SELECT 
                     COUNT(*) as total_transactions,
                     SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as sales_count,
                     SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as leases_count,
                     SUM(transaction_amount) as total_value,
                     AVG(transaction_amount) as avg_transaction_value
                   FROM univ_re_transactions
                   WHERE company_id = ?`;
      const params = [companyId];

      if (dateRange.startDate) {
        query += ' AND transaction_date >= ?';
        params.push(dateRange.startDate);
      }
      if (dateRange.endDate) {
        query += ' AND transaction_date <= ?';
        params.push(dateRange.endDate);
      }

      const result = await powerSync.execute(query, params);
      const stats = result.rows._array ? result.rows._array[0] : {};

      return {
        totalTransactions: stats.total_transactions || 0,
        salesCount: stats.sales_count || 0,
        leasesCount: stats.leases_count || 0,
        totalValue: stats.total_value || 0,
        averageTransactionValue: stats.avg_transaction_value || 0
      };
    } catch (e) {
      console.error('[Analytics] getTransactionAnalytics failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // REVENUE ANALYTICS
  // ────────────────────────────────────────────────────────

  async getRevenueAnalytics(companyId, dateRange = {}) {
    try {
      let query = `SELECT 
                     COUNT(*) as total_commissions_earned,
                     SUM(total_commission_amount) as total_commission_value,
                     AVG(total_commission_amount) as avg_commission,
                     SUM(CASE WHEN payout_status = 'paid' THEN total_commission_amount ELSE 0 END) as paid_commissions,
                     SUM(CASE WHEN payout_status = 'pending' THEN total_commission_amount ELSE 0 END) as pending_commissions
                   FROM univ_re_commission_details
                   WHERE company_id = ?`;
      const params = [companyId];

      if (dateRange.startDate) {
        query += ' AND created_at >= ?';
        params.push(dateRange.startDate);
      }
      if (dateRange.endDate) {
        query += ' AND created_at <= ?';
        params.push(dateRange.endDate);
      }

      const result = await powerSync.execute(query, params);
      const stats = result.rows._array ? result.rows._array[0] : {};

      return {
        totalCommissionsEarned: stats.total_commissions_earned || 0,
        totalCommissionValue: stats.total_commission_value || 0,
        averageCommission: stats.avg_commission || 0,
        paidCommissions: stats.paid_commissions || 0,
        pendingCommissions: stats.pending_commissions || 0
      };
    } catch (e) {
      console.error('[Analytics] getRevenueAnalytics failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // KEY PERFORMANCE INDICATORS
  // ────────────────────────────────────────────────────────

  async recordKPI(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();
      const kpiDate = now.split('T')[0];

      await powerSync.execute(
        `INSERT INTO univ_re_kpi_tracking 
         (id, company_id, kpi_name, kpi_category, kpi_value, target_value,
          measurement_unit, measurement_period, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.kpiName, data.kpiCategory, data.kpiValue,
         data.targetValue, data.measurementUnit, data.measurementPeriod,
         data.kpiValue >= data.targetValue ? 'on_track' : 'at_risk', now]
      );

      return id;
    } catch (e) {
      console.error('[Analytics] recordKPI failed:', e);
      throw e;
    }
  },

  async getKPIMetrics(companyId, category = null) {
    try {
      let query = `SELECT * FROM univ_re_kpi_tracking WHERE company_id = ?`;
      const params = [companyId];

      if (category) {
        query += ' AND kpi_category = ?';
        params.push(category);
      }

      query += ' ORDER BY created_at DESC';
      const result = await powerSync.execute(query, params);
      return result.rows._array || [];
    } catch (e) {
      console.error('[Analytics] getKPIMetrics failed:', e);
      throw e;
    }
  },

  async calculateCompanyKPIs(companyId) {
    try {
      // Sales KPI
      const salesResult = await powerSync.execute(
        `SELECT COUNT(*) as count FROM univ_re_transactions 
         WHERE company_id = ? AND status = 'closed' AND YEAR(transaction_date) = YEAR(CURRENT_DATE)`,
        [companyId]
      );

      const sales = salesResult.rows._array 
        ? salesResult.rows._array[0].count || 0 
        : 0;

      // Revenue KPI
      const revenueResult = await powerSync.execute(
        `SELECT SUM(total_commission_amount) as total FROM univ_re_commission_details 
         WHERE company_id = ? AND YEAR(created_at) = YEAR(CURRENT_DATE)`,
        [companyId]
      );

      const revenue = revenueResult.rows._array 
        ? revenueResult.rows._array[0].total || 0 
        : 0;

      // Portfolio KPI
      const portfolioResult = await powerSync.execute(
        `SELECT SUM(estimated_value) as total FROM univ_re_properties WHERE company_id = ?`,
        [companyId]
      );

      const portfolio = portfolioResult.rows._array 
        ? portfolioResult.rows._array[0].total || 0 
        : 0;

      // Occupancy KPI
      const occupancyResult = await powerSync.execute(
        `SELECT 
           COUNT(*) as total_properties,
           SUM(CASE WHEN status = 'occupied' OR status = 'active' THEN 1 ELSE 0 END) as occupied
         FROM univ_re_properties WHERE company_id = ?`,
        [companyId]
      );

      const occupancyData = occupancyResult.rows._array ? occupancyResult.rows._array[0] : {};
      const occupancyRate = occupancyData.total_properties > 0
        ? ((occupancyData.occupied / occupancyData.total_properties) * 100).toFixed(2)
        : 0;

      return {
        yearsales: sales,
        annualRevenue: revenue,
        totalPortfolioValue: portfolio,
        occupancyRate: occupancyRate
      };
    } catch (e) {
      console.error('[Analytics] calculateCompanyKPIs failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // REPORT GENERATION
  // ────────────────────────────────────────────────────────

  async generateCompanyReport(companyId, reportType = 'monthly', dateRange = {}) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      // Gather all analytics data
      const portfolio = await this.getPortfolioAnalytics(companyId);
      const transactions = await this.getTransactionAnalytics(companyId, dateRange);
      const revenue = await this.getRevenueAnalytics(companyId, dateRange);
      const kpis = await this.calculateCompanyKPIs(companyId);

      const reportData = {
        portfolio,
        transactions,
        revenue,
        kpis,
        generatedAt: now,
        reportType,
        dateRange
      };

      // Store report
      await powerSync.execute(
        `INSERT INTO univ_re_reports 
         (id, company_id, report_type, report_data, generated_by, generated_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, reportType, JSON.stringify(reportData), 'system', now, now]
      );

      return {
        reportId: id,
        ...reportData
      };
    } catch (e) {
      console.error('[Analytics] generateCompanyReport failed:', e);
      throw e;
    }
  },

  async getCompanyReports(companyId, limit = 20) {
    try {
      const result = await powerSync.execute(
        `SELECT * FROM univ_re_reports WHERE company_id = ? ORDER BY generated_at DESC LIMIT ?`,
        [companyId, limit]
      );

      return result.rows._array || [];
    } catch (e) {
      console.error('[Analytics] getCompanyReports failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // USER ACTIVITY TRACKING
  // ────────────────────────────────────────────────────────

  async trackUserActivity(companyId, userId, activityData) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_user_activity 
         (id, company_id, user_id, activity_type, module_name, action_details,
          session_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, userId, activityData.activityType, activityData.moduleName,
         JSON.stringify(activityData.actionDetails || {}), activityData.sessionId || null, now]
      );

      return id;
    } catch (e) {
      console.warn('[Analytics] trackUserActivity failed:', e);
    }
  },

  async getUserActivity(companyId, userId, limit = 100) {
    try {
      const result = await powerSync.execute(
        `SELECT * FROM univ_re_user_activity WHERE company_id = ? AND user_id = ?
         ORDER BY created_at DESC LIMIT ?`,
        [companyId, userId, limit]
      );

      return result.rows._array || [];
    } catch (e) {
      console.error('[Analytics] getUserActivity failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // SYSTEM HEALTH & MONITORING
  // ────────────────────────────────────────────────────────

  async recordSystemMetric(companyId, metricData) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_system_metrics 
         (id, company_id, metric_name, metric_value, metric_unit, threshold_warning,
          threshold_critical, current_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, metricData.metricName, metricData.metricValue,
         metricData.metricUnit, metricData.thresholdWarning,
         metricData.thresholdCritical, metricData.currentStatus, now]
      );

      return id;
    } catch (e) {
      console.warn('[Analytics] recordSystemMetric failed:', e);
    }
  },

  async getSystemHealth(companyId) {
    try {
      const result = await powerSync.execute(
        `SELECT * FROM univ_re_system_metrics WHERE company_id = ?
         ORDER BY created_at DESC LIMIT 10`,
        [companyId]
      );

      const metrics = result.rows._array || [];

      const statusSummary = {
        healthy: metrics.filter(m => m.current_status === 'healthy').length,
        warning: metrics.filter(m => m.current_status === 'warning').length,
        critical: metrics.filter(m => m.current_status === 'critical').length
      };

      return {
        metrics,
        statusSummary,
        overallHealth: statusSummary.critical === 0 && statusSummary.warning === 0 
          ? 'healthy' 
          : statusSummary.critical > 0 
          ? 'critical' 
          : 'warning'
      };
    } catch (e) {
      console.error('[Analytics] getSystemHealth failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // CROSS-DEPARTMENT ROLLUP ANALYTICS
  // ────────────────────────────────────────────────────────

  async getExecutiveCrossDepartmentRollup(companyId) {
    try {
      const rollup = {
        land: { totalParcels: 0, totalAcres: 0, estimatedLandValue: 0 },
        civil: { totalBoqs: 0, totalContractValue: 0, activeProjects: 0 },
        sales: { totalTransactions: 0, grossSalesVolume: 0 },
        maintenance: { totalRequests: 0, pendingRequests: 0, totalCost: 0 }
      };

      // 1. Land Holdings
      try {
        const landRes = await powerSync.execute(
          `SELECT COUNT(*) as total_parcels, COALESCE(SUM(area_acres), 0) as total_acres, COALESCE(SUM(estimated_value), 0) as total_val FROM univ_land_parcels WHERE company_id = ?`,
          [companyId]
        );
        const landRow = landRes.rows._array?.[0] || landRes.rows?.[0];
        if (landRow) {
          rollup.land.totalParcels = Number(landRow.total_parcels || 0);
          rollup.land.totalAcres = Number(landRow.total_acres || 0);
          rollup.land.estimatedLandValue = Number(landRow.total_val || 0);
        }
      } catch (_e) {
        console.warn('[Analytics] Land rollup fetch skipped/failed:', _e?.message);
      }

      // 2. Civil Engineering & BOQ
      try {
        const civilRes = await powerSync.execute(
          `SELECT COUNT(*) as total_boqs, COALESCE(SUM(total_amount), 0) as total_val FROM univ_boqs WHERE company_id = ?`,
          [companyId]
        );
        const civilRow = civilRes.rows._array?.[0] || civilRes.rows?.[0];
        if (civilRow) {
          rollup.civil.totalBoqs = Number(civilRow.total_boqs || 0);
          rollup.civil.totalContractValue = Number(civilRow.total_val || 0);
        }
      } catch (_e) {
        console.warn('[Analytics] Civil rollup fetch skipped/failed:', _e?.message);
      }

      // 3. Sales & Transactions
      try {
        const salesRes = await powerSync.execute(
          `SELECT COUNT(*) as total_txns, COALESCE(SUM(sale_price), 0) as total_val FROM univ_re_transactions WHERE company_id = ?`,
          [companyId]
        );
        const salesRow = salesRes.rows._array?.[0] || salesRes.rows?.[0];
        if (salesRow) {
          rollup.sales.totalTransactions = Number(salesRow.total_txns || 0);
          rollup.sales.grossSalesVolume = Number(salesRow.total_val || 0);
        }
      } catch (_e) {
        console.warn('[Analytics] Sales rollup fetch skipped/failed:', _e?.message);
      }

      // 4. Maintenance & Property Ops
      try {
        const maintRes = await powerSync.execute(
          `SELECT COUNT(*) as total_reqs, 
                  SUM(CASE WHEN status IN ('pending', 'in_progress', 'open') THEN 1 ELSE 0 END) as pending_reqs,
                  COALESCE(SUM(actual_cost), 0) as total_cost 
           FROM univ_re_maintenance_requests WHERE company_id = ?`,
          [companyId]
        );
        const maintRow = maintRes.rows._array?.[0] || maintRes.rows?.[0];
        if (maintRow) {
          rollup.maintenance.totalRequests = Number(maintRow.total_reqs || 0);
          rollup.maintenance.pendingRequests = Number(maintRow.pending_reqs || 0);
          rollup.maintenance.totalCost = Number(maintRow.total_cost || 0);
        }
      } catch (_e) {
        console.warn('[Analytics] Maintenance rollup fetch skipped/failed:', _e?.message);
      }

      return rollup;
    } catch (e) {
      console.error('[Analytics] getExecutiveCrossDepartmentRollup failed:', e);
      return {
        land: { totalParcels: 0, totalAcres: 0, estimatedLandValue: 0 },
        civil: { totalBoqs: 0, totalContractValue: 0, activeProjects: 0 },
        sales: { totalTransactions: 0, grossSalesVolume: 0 },
        maintenance: { totalRequests: 0, pendingRequests: 0, totalCost: 0 }
      };
    }
  }
};
