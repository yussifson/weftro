/**
 * RealEstateTrustAccounting.js
 * 
 * Trust accounting, escrow management, and Paystack payment integration
 * for real estate transactions, commissions, and rent payments
 */

import { powerSync } from '@/api/PowerSyncConnector';
import { supabase } from '@/api/supabaseClient';

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
    console.warn('[Trust Accounting] Date formatting error:', e);
    return new Date(Date.now()).toISOString();
  }
}

export const RealEstateTrustAccounting = {
  // ────────────────────────────────────────────────────────
  // TRUST ACCOUNT MANAGEMENT
  // ────────────────────────────────────────────────────────

  async createTrustAccount(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_trust_accounts 
         (id, company_id, account_name, account_type, bank_name, account_number, routing_number,
          account_holder_name, account_holder_id, balance, currency, reconciliation_status, 
          is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.accountName, data.accountType, data.bankName, 
         data.accountNumber, data.routingNumber, data.accountHolderName, 
         data.accountHolderId, 0, data.currency || 'USD', 'pending', 1, now, now]
      );

      // Log to audit
      await this.logAudit(companyId, userId, 'create', 'trust_account', id, { account: data.accountName });
      return id;
    } catch (e) {
      console.error('[Trust Accounting] createTrustAccount failed:', e);
      throw e;
    }
  },

  async getTrustAccounts(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_trust_accounts WHERE company_id = ?';
      const params = [companyId];

      if (filters.accountType) {
        query += ' AND account_type = ?';
        params.push(filters.accountType);
      }
      if (filters.isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.isActive ? 1 : 0);
      }

      query += ' ORDER BY created_at DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[Trust Accounting] getTrustAccounts failed:', e);
      throw e;
    }
  },

  async updateTrustAccountBalance(companyId, accountId, newBalance) {
    try {
      const now = getSafeISO8601();
      await powerSync.execute(
        `UPDATE univ_re_trust_accounts SET balance = ?, updated_at = ? WHERE id = ? AND company_id = ?`,
        [newBalance, now, accountId, companyId]
      );
    } catch (e) {
      console.error('[Trust Accounting] updateTrustAccountBalance failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // TRUST LEDGER ENTRIES
  // ────────────────────────────────────────────────────────

  async recordTrustTransaction(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      // Insert ledger entry
      await powerSync.execute(
        `INSERT INTO univ_re_trust_ledger 
         (id, company_id, trust_account_id, transaction_type, amount, related_entity_type,
          related_entity_id, description, transaction_date, reference_number, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.trustAccountId, data.transactionType, data.amount,
         data.relatedEntityType, data.relatedEntityId, data.description,
         data.transactionDate || now, data.referenceNumber, userId, now]
      );

      // Update account balance
      const account = await powerSync.execute(
        'SELECT balance FROM univ_re_trust_accounts WHERE id = ?',
        [data.trustAccountId]
      );

      if (account.rows._array && account.rows._array.length > 0) {
        const currentBalance = account.rows._array[0].balance || 0;
        let newBalance = currentBalance;

        if (data.transactionType === 'deposit' || data.transactionType === 'interest') {
          newBalance = currentBalance + data.amount;
        } else if (data.transactionType === 'withdrawal' || data.transactionType === 'fee') {
          newBalance = currentBalance - data.amount;
        }

        await this.updateTrustAccountBalance(companyId, data.trustAccountId, newBalance);
      }

      // Log to audit
      await this.logAudit(companyId, userId, 'create', 'trust_ledger', id, 
        { type: data.transactionType, amount: data.amount });

      return id;
    } catch (e) {
      console.error('[Trust Accounting] recordTrustTransaction failed:', e);
      throw e;
    }
  },

  async getTrustLedger(companyId, trustAccountId, dateRange = {}) {
    try {
      let query = `SELECT * FROM univ_re_trust_ledger 
                   WHERE company_id = ? AND trust_account_id = ?`;
      const params = [companyId, trustAccountId];

      if (dateRange.startDate) {
        query += ' AND transaction_date >= ?';
        params.push(dateRange.startDate);
      }
      if (dateRange.endDate) {
        query += ' AND transaction_date <= ?';
        params.push(dateRange.endDate);
      }

      query += ' ORDER BY transaction_date DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[Trust Accounting] getTrustLedger failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // ESCROW ACCOUNT MANAGEMENT
  // ────────────────────────────────────────────────────────

  async createEscrowAccount(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_escrow_accounts 
         (id, company_id, transaction_id, buyer_id, seller_id, agent_id, property_id,
          escrow_amount, escrow_type, escrow_agent_company, escrow_agent_name,
          escrow_agent_email, escrow_agent_phone, release_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.transactionId, data.buyerId, data.sellerId, data.agentId,
         data.propertyId, data.escrowAmount, data.escrowType, data.escrowAgentCompany,
         data.escrowAgentName, data.escrowAgentEmail, data.escrowAgentPhone,
         'held', now, now]
      );

      // Log to audit
      await this.logAudit(companyId, userId, 'create', 'escrow_account', id, 
        { amount: data.escrowAmount, type: data.escrowType });

      return id;
    } catch (e) {
      console.error('[Trust Accounting] createEscrowAccount failed:', e);
      throw e;
    }
  },

  async releaseEscrow(companyId, escrowId, userId) {
    try {
      const now = getSafeISO8601();
      
      await powerSync.execute(
        `UPDATE univ_re_escrow_accounts SET release_status = ?, release_date = ?, updated_at = ? 
         WHERE id = ? AND company_id = ?`,
        ['released', now, now, escrowId, companyId]
      );

      // Get escrow details to record ledger entry
      const escrow = await powerSync.execute(
        'SELECT * FROM univ_re_escrow_accounts WHERE id = ?',
        [escrowId]
      );

      if (escrow.rows._array && escrow.rows._array.length > 0) {
        const escrowData = escrow.rows._array[0];
        // Record release in trust ledger
        await this.recordTrustTransaction(companyId, {
          trustAccountId: companyId, // Placeholder - would link to actual trust account
          transactionType: 'withdrawal',
          amount: escrowData.escrow_amount,
          relatedEntityType: 'escrow',
          relatedEntityId: escrowId,
          description: `Escrow release for transaction ${escrowData.transaction_id}`
        }, userId);
      }

      // Log to audit
      await this.logAudit(companyId, userId, 'update', 'escrow_account', escrowId, 
        { status: 'released' });

      return true;
    } catch (e) {
      console.error('[Trust Accounting] releaseEscrow failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // COMMISSION MANAGEMENT
  // ────────────────────────────────────────────────────────

  async createCommissionRule(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_commission_rules 
         (id, company_id, rule_name, rule_type, property_types, price_range_min, price_range_max,
          commission_percentage, flat_fee, tier_config, applies_to_buyer_side, 
          applies_to_seller_side, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.ruleName, data.ruleType, JSON.stringify(data.propertyTypes || []),
         data.priceRangeMin, data.priceRangeMax, data.commissionPercentage, data.flatFee,
         JSON.stringify(data.tierConfig), 1, 1, 1, now, now]
      );

      // Log to audit
      await this.logAudit(companyId, userId, 'create', 'commission_rule', id, 
        { rule: data.ruleName });

      return id;
    } catch (e) {
      console.error('[Trust Accounting] createCommissionRule failed:', e);
      throw e;
    }
  },

  async calculateCommission(companyId, transactionData) {
    try {
      const { salePrice, buyerAgentId, sellerAgentId, ruleId } = transactionData;
      
      let rule = null;
      if (ruleId) {
        const ruleResult = await powerSync.execute(
          'SELECT * FROM univ_re_commission_rules WHERE id = ? AND company_id = ?',
          [ruleId, companyId]
        );
        if (ruleResult.rows._array && ruleResult.rows._array.length > 0) {
          rule = ruleResult.rows._array[0];
        }
      }

      let buyerCommission = 0, sellerCommission = 0;

      if (rule) {
        if (rule.rule_type === 'percentage_based') {
          buyerCommission = salePrice * (rule.commission_percentage / 100);
          sellerCommission = salePrice * (rule.commission_percentage / 100);
        } else if (rule.rule_type === 'flat_fee') {
          buyerCommission = sellerCommission = rule.flat_fee;
        }
      }

      return {
        buyerCommission,
        sellerCommission,
        totalCommission: buyerCommission + sellerCommission,
        breakdownByAgent: {
          buyerAgentId,
          buyerAgentCommission: buyerCommission,
          sellerAgentId,
          sellerAgentCommission: sellerCommission
        }
      };
    } catch (e) {
      console.error('[Trust Accounting] calculateCommission failed:', e);
      throw e;
    }
  },

  async recordCommissionPayout(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      const commissionDetails = await this.calculateCommission(companyId, data);

      await powerSync.execute(
        `INSERT INTO univ_re_commission_details 
         (id, company_id, transaction_id, commission_rule_id, buyer_agent_id, seller_agent_id,
          sale_price, buyer_commission_percentage, seller_commission_percentage,
          buyer_commission_amount, seller_commission_amount, total_commission_amount,
          broker_commission, agent_commission, payout_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.transactionId, data.ruleId, data.buyerAgentId, data.sellerAgentId,
         commissionDetails.buyerCommission + commissionDetails.sellerCommission,
         data.buyerCommissionPercentage, data.sellerCommissionPercentage,
         commissionDetails.buyerCommission, commissionDetails.sellerCommission,
         commissionDetails.totalCommission, data.brokerCommission || 0,
         data.agentCommission || 0, 'pending', now, now]
      );

      // Log to audit
      await this.logAudit(companyId, userId, 'create', 'commission', id, 
        { amount: commissionDetails.totalCommission });

      return id;
    } catch (e) {
      console.error('[Trust Accounting] recordCommissionPayout failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // PAYSTACK INTEGRATION
  // ────────────────────────────────────────────────────────

  async initializePaystackPayment(paymentData) {
    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: paymentData.email,
          amount: Math.round(paymentData.amount * 100), // Paystack uses cents
          reference: paymentData.reference || `RE-${generateUUID()}`,
          metadata: {
            entityType: paymentData.entityType, // 'commission', 'rent_payment', etc.
            entityId: paymentData.entityId,
            companyId: paymentData.companyId,
            description: paymentData.description
          }
        })
      });

      const result = await response.json();
      if (result.status) {
        return {
          success: true,
          authorizationUrl: result.data.authorization_url,
          reference: result.data.reference,
          accessCode: result.data.access_code
        };
      }
      return { success: false, error: result.message };
    } catch (e) {
      console.error('[Trust Accounting] initializePaystackPayment failed:', e);
      throw e;
    }
  },

  async verifyPaystackPayment(reference) {
    try {
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY}`
          }
        }
      );

      const result = await response.json();
      return {
        success: result.status,
        data: result.data,
        message: result.message
      };
    } catch (e) {
      console.error('[Trust Accounting] verifyPaystackPayment failed:', e);
      throw e;
    }
  },

  async recordPaystackTransaction(companyId, paymentData, userId) {
    try {
      const verification = await this.verifyPaystackPayment(paymentData.reference);

      if (!verification.success) {
        throw new Error('Payment verification failed');
      }

      const verified = verification.data;
      
      // Record transaction based on entity type
      if (paymentData.entityType === 'commission') {
        await powerSync.execute(
          `UPDATE univ_re_commission_details SET payout_status = ?, payout_date = ? 
           WHERE id = ? AND company_id = ?`,
          ['paid', getSafeISO8601(), paymentData.entityId, companyId]
        );
      } else if (paymentData.entityType === 'rent_payment') {
        await powerSync.execute(
          `UPDATE univ_re_rent_payment_history SET payment_status = ?, payment_date = ? 
           WHERE id = ? AND company_id = ?`,
          ['paid', getSafeISO8601(), paymentData.entityId, companyId]
        );
      }

      // Log to audit
      await this.logAudit(companyId, userId, 'payment', paymentData.entityType, 
        paymentData.entityId, { 
          status: 'verified',
          amount: verified.amount / 100,
          reference: verified.reference
        });

      return true;
    } catch (e) {
      console.error('[Trust Accounting] recordPaystackTransaction failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // AUDIT LOGGING
  // ────────────────────────────────────────────────────────

  async logAudit(companyId, userId, action, resourceType, resourceId, changes) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_audit_log 
         (id, company_id, user_id, action, resource_type, resource_id, changes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, userId, action, resourceType, resourceId, 
         JSON.stringify(changes), now]
      );
    } catch (e) {
      console.warn('[Trust Accounting] logAudit failed:', e);
      // Don't throw - audit logging shouldn't break main operations
    }
  },

  // ────────────────────────────────────────────────────────
  // RECONCILIATION
  // ────────────────────────────────────────────────────────

  async reconcileTrustAccount(companyId, accountId, bankBalance, userId) {
    try {
      const ledger = await this.getTrustLedger(companyId, accountId);
      
      let calculatedBalance = 0;
      ledger.forEach(entry => {
        if (entry.transaction_type === 'deposit' || entry.transaction_type === 'interest') {
          calculatedBalance += entry.amount;
        } else if (entry.transaction_type === 'withdrawal' || entry.transaction_type === 'fee') {
          calculatedBalance -= entry.amount;
        }
      });

      const variance = Math.abs(bankBalance - calculatedBalance);
      const status = variance < 0.01 ? 'reconciled' : 'discrepancy';

      const now = getSafeISO8601();
      await powerSync.execute(
        `UPDATE univ_re_trust_accounts SET reconciliation_status = ?, last_reconciliation_at = ? 
         WHERE id = ? AND company_id = ?`,
        [status, now, accountId, companyId]
      );

      // Log audit
      await this.logAudit(companyId, userId, 'reconcile', 'trust_account', accountId, {
        calculatedBalance,
        bankBalance,
        variance,
        status
      });

      return {
        status,
        calculatedBalance,
        bankBalance,
        variance,
        reconciled: status === 'reconciled'
      };
    } catch (e) {
      console.error('[Trust Accounting] reconcileTrustAccount failed:', e);
      throw e;
    }
  }
};
