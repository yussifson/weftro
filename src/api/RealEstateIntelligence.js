/**
 * RealEstateIntelligence.js
 * 
 * Market intelligence, comparable properties analysis, and agent/client scoring
 */

import { powerSync } from '@/api/PowerSyncConnector';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const RealEstateIntelligence = {
  // ────────────────────────────────────────────────────────
  // MARKET DATA MANAGEMENT
  // ────────────────────────────────────────────────────────

  async recordMarketData(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      await powerSync.execute(
        `INSERT INTO univ_re_market_data 
         (id, company_id, market_region, market_level, data_date, average_price,
          median_price, price_per_sqft, days_on_market_average, sold_listings_count,
          active_listings_count, price_change_month_percentage, price_change_year_percentage,
          market_trend, market_absorption_rate, inventory_level, data_source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.marketRegion, data.marketLevel || 'neighborhood', now,
         data.averagePrice, data.medianPrice, data.pricePerSqft, data.daysOnMarketAverage,
         data.soldListingsCount, data.activeListingsCount, data.priceChangeMonthPercentage,
         data.priceChangeYearPercentage, data.marketTrend, data.marketAbsorptionRate,
         data.inventoryLevel || 'normal', data.dataSource || 'manual', now]
      );

      return id;
    } catch (e) {
      console.error('[Intelligence] recordMarketData failed:', e);
      throw e;
    }
  },

  async getMarketData(companyId, region, limit = 12) {
    try {
      const result = await powerSync.execute(
        `SELECT * FROM univ_re_market_data 
         WHERE company_id = ? AND market_region = ? 
         ORDER BY data_date DESC LIMIT ?`,
        [companyId, region, limit]
      );

      return result.rows._array || [];
    } catch (e) {
      console.error('[Intelligence] getMarketData failed:', e);
      throw e;
    }
  },

  async getMarketTrends(companyId, region, months = 12) {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const result = await powerSync.execute(
        `SELECT * FROM univ_re_market_data 
         WHERE company_id = ? AND market_region = ? AND data_date >= ?
         ORDER BY data_date ASC`,
        [companyId, region, startDate.toISOString().split('T')[0]]
      );

      const data = result.rows._array || [];
      
      // Calculate trends
      if (data.length < 2) return { trend: 'insufficient_data', data };

      const first = data[0];
      const last = data[data.length - 1];

      const priceChange = ((last.average_price - first.average_price) / first.average_price * 100).toFixed(2);
      const inventoryChange = ((last.active_listings_count - first.active_listings_count) / first.active_listings_count * 100).toFixed(2);

      return {
        trend: priceChange > 0 ? 'appreciation' : priceChange < 0 ? 'depreciation' : 'stable',
        priceChangePercentage: priceChange,
        inventoryChangePercentage: inventoryChange,
        averageListingPrice: (last.average_price).toFixed(2),
        averageDaysOnMarket: last.days_on_market_average,
        data
      };
    } catch (e) {
      console.error('[Intelligence] getMarketTrends failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // COMPARABLE PROPERTIES ANALYSIS
  // ────────────────────────────────────────────────────────

  async createComparableAnalysis(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = new Date().toISOString();

      // Calculate similarity score based on property characteristics
      const similarityScore = this.calculateSimilarityScore(data);

      await powerSync.execute(
        `INSERT INTO univ_re_comparable_properties 
         (id, company_id, subject_property_id, comparable_property_id, comparable_address,
          price, price_per_sqft, square_footage, bedrooms, bathrooms, lot_size, year_built,
          days_on_market, sale_date, similarity_score, price_adjustment_reason, adjustments, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.subjectPropertyId, data.comparablePropertyId || null,
         data.comparableAddress, data.price, data.pricePerSqft, data.squareFootage,
         data.bedrooms, data.bathrooms, data.lotSize, data.yearBuilt, data.daysOnMarket,
         data.saleDate, similarityScore, data.priceAdjustmentReason || '',
         JSON.stringify(data.adjustments || []), now]
      );

      return {
        id,
        similarityScore,
        adjustments: data.adjustments
      };
    } catch (e) {
      console.error('[Intelligence] createComparableAnalysis failed:', e);
      throw e;
    }
  },

  calculateSimilarityScore(data) {
    let score = 100;

    // Property characteristics comparison
    if (data.subjectBedrooms !== undefined && data.bedrooms !== undefined) {
      score -= Math.abs(data.subjectBedrooms - data.bedrooms) * 5;
    }
    if (data.subjectBathrooms !== undefined && data.bathrooms !== undefined) {
      score -= Math.abs(data.subjectBathrooms - data.bathrooms) * 3;
    }
    if (data.subjectSquareFootage !== undefined && data.squareFootage !== undefined) {
      const sqftDiff = Math.abs(data.subjectSquareFootage - data.squareFootage) / data.subjectSquareFootage;
      score -= sqftDiff * 100 * 0.1;
    }
    if (data.subjectYearBuilt !== undefined && data.yearBuilt !== undefined) {
      score -= Math.abs(data.subjectYearBuilt - data.yearBuilt) / 10;
    }

    return Math.max(0, Math.min(100, score / 100));
  },

  async getComparableProperties(companyId, subjectPropertyId, minSimilarity = 0.7) {
    try {
      const result = await powerSync.execute(
        `SELECT * FROM univ_re_comparable_properties 
         WHERE company_id = ? AND subject_property_id = ? AND similarity_score >= ?
         ORDER BY similarity_score DESC`,
        [companyId, subjectPropertyId, minSimilarity]
      );

      return result.rows._array || [];
    } catch (e) {
      console.error('[Intelligence] getComparableProperties failed:', e);
      throw e;
    }
  },

  async generateValuationReport(companyId, propertyId) {
    try {
      const comparables = await this.getComparableProperties(companyId, propertyId);

      if (comparables.length === 0) {
        return { error: 'Insufficient comparable data for valuation' };
      }

      const prices = comparables.map(c => c.price);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const medianPrice = prices.sort()[Math.floor(prices.length / 2)];
      const lowPrice = Math.min(...prices);
      const highPrice = Math.max(...prices);

      return {
        valuationRange: {
          low: lowPrice,
          high: highPrice,
          average: avgPrice,
          median: medianPrice
        },
        comparablesUsed: comparables.length,
        methodology: 'comparative_market_analysis',
        generatedAt: new Date().toISOString(),
        comparables: comparables.slice(0, 5)
      };
    } catch (e) {
      console.error('[Intelligence] generateValuationReport failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // AGENT METRICS & PERFORMANCE
  // ────────────────────────────────────────────────────────

  async recordAgentMetrics(companyId, agentId, metricData, userId) {
    try {
      const id = generateUUID();
      const now = new Date().toISOString();
      const metricDate = now.split('T')[0];

      await powerSync.execute(
        `INSERT INTO univ_re_agent_metrics 
         (id, company_id, agent_id, metric_period, metric_date, listings_taken_count,
          listings_sold_count, sales_volume, average_sale_price, average_days_on_market,
          commission_earned, client_count, return_client_rate, average_client_rating,
          response_time_hours, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, agentId, metricData.metricPeriod || 'month', metricDate,
         metricData.listingsTakenCount || 0, metricData.listingsSoldCount || 0,
         metricData.salesVolume || 0, metricData.averageSalePrice || 0,
         metricData.averageDaysOnMarket || 0, metricData.commissionEarned || 0,
         metricData.clientCount || 0, metricData.returnClientRate || 0,
         metricData.averageClientRating || 0, metricData.responseTimeHours || 0, now]
      );

      return id;
    } catch (e) {
      console.error('[Intelligence] recordAgentMetrics failed:', e);
      throw e;
    }
  },

  async getAgentPerformance(companyId, agentId, limit = 12) {
    try {
      const result = await powerSync.execute(
        `SELECT * FROM univ_re_agent_metrics 
         WHERE company_id = ? AND agent_id = ? 
         ORDER BY metric_date DESC LIMIT ?`,
        [companyId, agentId, limit]
      );

      return result.rows._array || [];
    } catch (e) {
      console.error('[Intelligence] getAgentPerformance failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // CLIENT SCORING & RECOMMENDATIONS
  // ────────────────────────────────────────────────────────

  async scoreClient(companyId, clientId, data) {
    try {
      const id = generateUUID();
      const now = new Date().toISOString();

      // Calculate composite score
      let score = 0;
      let scoreBreakdown = {};

      if (data.transactionHistoryCount !== undefined) {
        scoreBreakdown.historyScore = Math.min(20, data.transactionHistoryCount * 5);
        score += scoreBreakdown.historyScore;
      }
      if (data.averageTransactionSize !== undefined) {
        scoreBreakdown.sizeScore = Math.min(25, (data.averageTransactionSize / 100000) * 25);
        score += scoreBreakdown.sizeScore;
      }
      if (data.engagementDaysRecent !== undefined) {
        scoreBreakdown.engagementScore = Math.min(20, 20 - (data.engagementDaysRecent / 365) * 20);
        score += scoreBreakdown.engagementScore;
      }
      if (data.referralCount !== undefined) {
        scoreBreakdown.referralScore = Math.min(15, data.referralCount * 3);
        score += scoreBreakdown.referralScore;
      }
      if (data.responsiveness !== undefined) {
        scoreBreakdown.responsivenessScore = data.responsiveness * 20; // 0-1 scale
        score += scoreBreakdown.responsivenessScore;
      }

      score = Math.min(100, Math.max(0, score));

      const category = score >= 80 ? 'hot' : score >= 50 ? 'warm' : score >= 20 ? 'cold' : 'inactive';

      await powerSync.execute(
        `INSERT INTO univ_re_client_scoring 
         (id, company_id, client_id, score, score_category, score_breakdown,
          purchase_propensity, engagement_level, transaction_history_count,
          last_interaction_date, days_since_last_contact, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, clientId, Math.round(score), category, JSON.stringify(scoreBreakdown),
         (score / 100).toFixed(2), score >= 50 ? 'high' : score >= 30 ? 'medium' : 'low',
         data.transactionHistoryCount || 0, new Date().toISOString(),
         data.daysSinceLastContact || 0, now, now]
      );

      return {
        scoreId: id,
        score: Math.round(score),
        category,
        breakdown: scoreBreakdown
      };
    } catch (e) {
      console.error('[Intelligence] scoreClient failed:', e);
      throw e;
    }
  },

  async getHighValueClients(companyId, limit = 20) {
    try {
      const result = await powerSync.execute(
        `SELECT * FROM univ_re_client_scoring 
         WHERE company_id = ? AND score_category IN ('hot', 'warm')
         ORDER BY score DESC LIMIT ?`,
        [companyId, limit]
      );

      return result.rows._array || [];
    } catch (e) {
      console.error('[Intelligence] getHighValueClients failed:', e);
      throw e;
    }
  },

  async createAgentRecommendation(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = new Date().toISOString();

      await powerSync.execute(
        `INSERT INTO univ_re_agent_recommendations 
         (id, company_id, client_id, recommended_agent_id, recommendation_type,
          recommendation_reason, recommendation_score, property_id, recommendation_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.clientId, data.recommendedAgentId,
         data.recommendationType || 'new_listings', data.recommendationReason,
         data.recommendationScore, data.propertyId || null, now, now]
      );

      return id;
    } catch (e) {
      console.error('[Intelligence] createAgentRecommendation failed:', e);
      throw e;
    }
  },

  async trackRecommendationEngagement(companyId, recommendationId, action) {
    try {
      const now = new Date().toISOString();

      await powerSync.execute(
        `UPDATE univ_re_agent_recommendations 
         SET client_action = ?, action_date = ? WHERE id = ? AND company_id = ?`,
        [action, now, recommendationId, companyId]
      );

      return true;
    } catch (e) {
      console.error('[Intelligence] trackRecommendationEngagement failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // DASHBOARD STATISTICS
  // ────────────────────────────────────────────────────────

  async getCompanyDashboardStats(companyId) {
    try {
      // Get market overview
      const marketResult = await powerSync.execute(
        `SELECT COUNT(DISTINCT market_region) as regions_tracked,
                AVG(average_price) as avg_market_price,
                AVG(market_absorption_rate) as avg_absorption_rate
         FROM univ_re_market_data WHERE company_id = ? AND data_date = CURRENT_DATE`,
        [companyId]
      );

      const marketStats = marketResult.rows._array ? marketResult.rows._array[0] : {};

      // Get agent stats
      const agentResult = await powerSync.execute(
        `SELECT COUNT(DISTINCT agent_id) as total_agents,
                SUM(commission_earned) as total_commissions,
                AVG(average_sale_price) as avg_sale_price
         FROM univ_re_agent_metrics WHERE company_id = ?`,
        [companyId]
      );

      const agentStats = agentResult.rows._array ? agentResult.rows._array[0] : {};

      // Get client stats
      const clientResult = await powerSync.execute(
        `SELECT COUNT(*) as total_clients,
                SUM(CASE WHEN score_category = 'hot' THEN 1 ELSE 0 END) as hot_leads,
                AVG(score) as avg_client_score
         FROM univ_re_client_scoring WHERE company_id = ?`,
        [companyId]
      );

      const clientStats = clientResult.rows._array ? clientResult.rows._array[0] : {};

      return {
        market: {
          regionsTracked: marketStats.regions_tracked || 0,
          averagePrice: marketStats.avg_market_price || 0,
          averageAbsorptionRate: marketStats.avg_absorption_rate || 0
        },
        agents: {
          totalAgents: agentStats.total_agents || 0,
          totalCommissions: agentStats.total_commissions || 0,
          averageSalePrice: agentStats.avg_sale_price || 0
        },
        clients: {
          totalClients: clientStats.total_clients || 0,
          hotLeads: clientStats.hot_leads || 0,
          averageScore: clientStats.avg_client_score || 0
        }
      };
    } catch (e) {
      console.error('[Intelligence] getCompanyDashboardStats failed:', e);
      throw e;
    }
  }
};
