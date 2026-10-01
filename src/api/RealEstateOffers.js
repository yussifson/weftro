/**
 * RealEstateOffers.js
 * 
 * Offer management, counter-offers, and commission handling
 */

import { powerSync } from '@/api/PowerSyncConnector';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getSafeISO8601() {
  try {
    const date = new Date();
    if (isNaN(date.getTime())) {
      return new Date(Date.now()).toISOString();
    }
    return date.toISOString();
  } catch (e) {
    return new Date().toISOString();
  }
}

export const RealEstateOffers = {
  // ────────────────────────────────────────────────────────
  // OFFER MANAGEMENT (Enhanced)
  // ────────────────────────────────────────────────────────

  async updateOfferStatus(companyId, offerId, newStatus, data = {}, userId) {
    try {
      const now = getSafeISO8601();
      
      await powerSync.execute(
        `UPDATE univ_re_offers SET status = ?, notes = ?, last_updated = ? 
         WHERE id = ? AND company_id = ?`,
        [newStatus, data.notes || '', now, offerId, companyId]
      );

      // Log status change
      await this.logOfferActivity(companyId, offerId, 'status_changed', {
        from: data.previousStatus,
        to: newStatus,
        reason: data.reason
      });

      return true;
    } catch (e) {
      console.error('[Offers] updateOfferStatus failed:', e);
      throw e;
    }
  },

  async getOfferDetails(companyId, offerId) {
    try {
      const result = await powerSync.execute(
        `SELECT * FROM univ_re_offers WHERE id = ? AND company_id = ?`,
        [offerId, companyId]
      );

      if (result.rows._array && result.rows._array.length > 0) {
        const offer = result.rows._array[0];
        
        // Get all counter-offers
        const counterOffers = await this.getCounterOffers(companyId, offerId);
        
        return {
          ...offer,
          counterOffers,
          contingencies: offer.contingencies ? JSON.parse(offer.contingencies) : [],
          totalCounterOffers: counterOffers.length
        };
      }
      return null;
    } catch (e) {
      console.error('[Offers] getOfferDetails failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // COUNTER-OFFERS
  // ────────────────────────────────────────────────────────

  async createCounterOffer(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_counter_offers 
         (id, company_id, original_offer_id, counter_offer_by, counter_offer_price,
          closing_date, contingencies, inspection_period_days, appraisal_contingency,
          financing_contingency, earnest_money_change, additional_terms, counter_offer_status,
          created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.originalOfferId, data.counterOfferBy, data.counterOfferPrice,
         data.closingDate, JSON.stringify(data.contingencies || []), data.inspectionPeriodDays,
         data.appraisalContingency ? 1 : 0, data.financingContingency ? 1 : 0,
         data.earnestMoneyChange, JSON.stringify(data.additionalTerms || {}),
         'pending', now, now]
      );

      // Update original offer status
      await this.updateOfferStatus(companyId, data.originalOfferId, 'counter_offered', 
        { previousStatus: 'pending' }, userId);

      // Log activity
      await this.logOfferActivity(companyId, data.originalOfferId, 'counter_offer_created', {
        counterId: id,
        price: data.counterOfferPrice,
        by: data.counterOfferBy
      });

      return id;
    } catch (e) {
      console.error('[Offers] createCounterOffer failed:', e);
      throw e;
    }
  },

  async getCounterOffers(companyId, originalOfferId) {
    try {
      const result = await powerSync.execute(
        `SELECT * FROM univ_re_counter_offers WHERE company_id = ? AND original_offer_id = ? 
         ORDER BY created_at DESC`,
        [companyId, originalOfferId]
      );

      return result.rows._array || [];
    } catch (e) {
      console.error('[Offers] getCounterOffers failed:', e);
      throw e;
    }
  },

  async respondToCounterOffer(companyId, counterOfferId, response, responderId, data = {}) {
    try {
      const now = getSafeISO8601();
      
      // Update counter offer status
      await powerSync.execute(
        `UPDATE univ_re_counter_offers SET counter_offer_status = ?, responded_at = ?, updated_at = ? 
         WHERE id = ? AND company_id = ?`,
        [response, now, now, counterOfferId, companyId]
      );

      // Get counter offer details
      const counterOfferResult = await powerSync.execute(
        `SELECT * FROM univ_re_counter_offers WHERE id = ?`,
        [counterOfferId]
      );

      if (counterOfferResult.rows._array && counterOfferResult.rows._array.length > 0) {
        const counterOffer = counterOfferResult.rows._array[0];
        
        if (response === 'accepted') {
          // Update original offer to accepted
          await powerSync.execute(
            `UPDATE univ_re_offers SET status = ? WHERE id = ?`,
            ['accepted', counterOffer.original_offer_id]
          );
        }

        // Log activity
        await this.logOfferActivity(companyId, counterOffer.original_offer_id, 
          'counter_offer_response', {
            counterId: counterOfferId,
            response,
            responderId
          });
      }

      return true;
    } catch (e) {
      console.error('[Offers] respondToCounterOffer failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // COMMISSION RULES ENGINE
  // ────────────────────────────────────────────────────────

  async evaluateCommissionRules(companyId, transactionData) {
    try {
      const { propertyType, salePrice, buyerAgentId, sellerAgentId } = transactionData;

      // Get applicable rules
      let query = `SELECT * FROM univ_re_commission_rules 
                   WHERE company_id = ? AND is_active = ?`;
      const params = [companyId, 1];

      if (propertyType) {
        query += ` AND (property_types LIKE ? OR property_types = '[]')`;
        params.push(`%${propertyType}%`);
      }

      if (salePrice) {
        query += ` AND (price_range_min IS NULL OR price_range_min <= ?)
                   AND (price_range_max IS NULL OR price_range_max >= ?)`;
        params.push(salePrice, salePrice);
      }

      const result = await powerSync.execute(query, params);
      const rules = result.rows._array || [];

      // Calculate commissions for all applicable rules
      const calculations = rules.map(rule => {
        let buyerCommission = 0;
        let sellerCommission = 0;

        if (rule.rule_type === 'percentage_based' && rule.commission_percentage) {
          buyerCommission = rule.applies_to_buyer_side 
            ? (salePrice * rule.commission_percentage / 100)
            : 0;
          sellerCommission = rule.applies_to_seller_side
            ? (salePrice * rule.commission_percentage / 100)
            : 0;
        } else if (rule.rule_type === 'flat_fee') {
          buyerCommission = rule.applies_to_buyer_side ? rule.flat_fee : 0;
          sellerCommission = rule.applies_to_seller_side ? rule.flat_fee : 0;
        }

        return {
          ruleId: rule.id,
          ruleName: rule.rule_name,
          ruleType: rule.rule_type,
          buyerCommission,
          sellerCommission,
          totalCommission: buyerCommission + sellerCommission,
          buyerCommissionPercentage: rule.applies_to_buyer_side ? rule.commission_percentage : 0,
          sellerCommissionPercentage: rule.applies_to_seller_side ? rule.commission_percentage : 0
        };
      });

      // Return the most advantageous rule (highest commission)
      return calculations.length > 0 
        ? calculations.reduce((prev, curr) => 
            curr.totalCommission > prev.totalCommission ? curr : prev)
        : null;
    } catch (e) {
      console.error('[Offers] evaluateCommissionRules failed:', e);
      throw e;
    }
  },

  async applyCommissionAdjustments(companyId, commissionId, adjustments, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      // Get current commission
      const result = await powerSync.execute(
        `SELECT * FROM univ_re_commission_details WHERE id = ? AND company_id = ?`,
        [commissionId, companyId]
      );

      if (!result.rows._array || result.rows._array.length === 0) {
        throw new Error('Commission not found');
      }

      const current = result.rows._array[0];
      let newTotal = current.total_commission_amount || 0;

      // Apply adjustments
      let adjustmentEntries = [];
      adjustments.forEach(adj => {
        newTotal += adj.amount;
        adjustmentEntries.push({
          id: generateUUID(),
          type: adj.type,
          amount: adj.amount,
          reason: adj.reason,
          appliedBy: userId,
          appliedAt: now
        });
      });

      // Update commission with adjustments
      await powerSync.execute(
        `UPDATE univ_re_commission_details SET total_commission_amount = ?, adjustments = ?, updated_at = ? 
         WHERE id = ? AND company_id = ?`,
        [newTotal, JSON.stringify(adjustmentEntries), now, commissionId, companyId]
      );

      return {
        commissionId,
        previousAmount: current.total_commission_amount,
        newAmount: newTotal,
        adjustments: adjustmentEntries
      };
    } catch (e) {
      console.error('[Offers] applyCommissionAdjustments failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // OFFER NEGOTIATION TRACKING
  // ────────────────────────────────────────────────────────

  async getOfferNegotiationTimeline(companyId, offerId) {
    try {
      // Get main offer
      const offer = await this.getOfferDetails(companyId, offerId);
      
      // Get all counter-offers and responses
      const timeline = [{
        event: 'offer_created',
        timestamp: offer.created_at,
        price: offer.offer_amount,
        details: {
          buyer: offer.buyer_name,
          earnestMoney: offer.earnest_money
        }
      }];

      // Add counter offers to timeline
      if (offer.counterOffers && offer.counterOffers.length > 0) {
        offer.counterOffers.forEach(co => {
          timeline.push({
            event: 'counter_offer',
            timestamp: co.created_at,
            price: co.counter_offer_price,
            details: {
              counterOfferBy: co.counter_offer_by,
              response: co.counter_offer_status,
              respondedAt: co.responded_at
            }
          });
        });
      }

      return timeline.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
    } catch (e) {
      console.error('[Offers] getOfferNegotiationTimeline failed:', e);
      throw e;
    }
  },

  async getNegotiationStats(companyId, dateRange = {}) {
    try {
      let query = `SELECT COUNT(*) as total_offers, 
                         SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_count,
                         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
                         SUM(CASE WHEN status = 'counter_offered' THEN 1 ELSE 0 END) as counter_offered_count,
                         AVG(offer_amount) as average_offer_price
                   FROM univ_re_offers 
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
        totalOffers: stats.total_offers || 0,
        acceptedCount: stats.accepted_count || 0,
        rejectedCount: stats.rejected_count || 0,
        counterOfferedCount: stats.counter_offered_count || 0,
        averageOfferPrice: stats.average_offer_price || 0,
        acceptanceRate: stats.total_offers 
          ? ((stats.accepted_count || 0) / stats.total_offers * 100).toFixed(2)
          : 0
      };
    } catch (e) {
      console.error('[Offers] getNegotiationStats failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // ACTIVITY LOGGING
  // ────────────────────────────────────────────────────────

  async logOfferActivity(companyId, offerId, activityType, details = {}) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      // This could be extended to a separate offer_activities table
      // For now, we log via audit system
      await powerSync.execute(
        `INSERT INTO univ_re_audit_log 
         (id, company_id, action, resource_type, resource_id, changes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, activityType, 'offer', offerId, JSON.stringify(details), now]
      );
    } catch (e) {
      console.warn('[Offers] logOfferActivity failed:', e);
    }
  }
};
