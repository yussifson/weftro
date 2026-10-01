/**
 * RealEstateIntegration.js
 * 
 * Central integration layer that orchestrates all real estate modules
 * Handles cross-module communication, event triggers, and business logic orchestration
 */

import { RealEstateTrustAccounting } from './RealEstateTrustAccounting';
import { RealEstateOffers } from './RealEstateOffers';
import { RealEstateDocuments } from './RealEstateDocuments';
import { RealEstateContractors } from './RealEstateContractors';
import { RealEstateLeaseAutomation } from './RealEstateLeaseAutomation';
import { RealEstateIntelligence } from './RealEstateIntelligence';

export const RealEstateIntegration = {
  /**
   * TRANSACTION WORKFLOW
   * Complete real estate transaction from offer to closing
   */

  async processTransaction(companyId, data, userId) {
    try {
      console.log('[Integration] Processing transaction:', data.transactionId);

      // 1. Create/update offer
      const offerResult = await RealEstateOffers.updateOfferStatus(
        companyId,
        data.offerId,
        'processing',
        { notes: 'Transaction initiated' },
        userId
      );

      // 2. Calculate commissions
      const commission = await RealEstateOffers.evaluateCommissionRules(
        companyId,
        {
          propertyType: data.propertyType,
          salePrice: data.salePrice,
          buyerAgentId: data.buyerAgentId,
          sellerAgentId: data.sellerAgentId
        }
      );

      if (!commission) {
        throw new Error('No commission rules apply to this transaction');
      }

      // 3. Record commission in trust accounting
      const commissionId = await RealEstateTrustAccounting.recordCommissionPayout(
        companyId,
        {
          transactionId: data.transactionId,
          ruleId: commission.ruleId,
          buyerAgentId: data.buyerAgentId,
          sellerAgentId: data.sellerAgentId,
          buyerCommissionPercentage: commission.buyerCommissionPercentage,
          sellerCommissionPercentage: commission.sellerCommissionPercentage,
          brokerCommission: data.brokerCommission || 0,
          agentCommission: data.agentCommission || 0
        },
        userId
      );

      // 4. Create escrow account
      const escrowId = await RealEstateTrustAccounting.createEscrowAccount(
        companyId,
        {
          transactionId: data.transactionId,
          buyerId: data.buyerId,
          sellerId: data.sellerId,
          agentId: data.buyerAgentId || data.sellerAgentId,
          propertyId: data.propertyId,
          escrowAmount: data.escrowAmount,
          escrowType: 'earnest_money',
          escrowAgentCompany: data.escrowAgentCompany,
          escrowAgentName: data.escrowAgentName,
          escrowAgentEmail: data.escrowAgentEmail,
          escrowAgentPhone: data.escrowAgentPhone
        },
        userId
      );

      // 5. Generate transaction documents
      const documents = [];
      const docTemplates = ['purchase_agreement', 'disclosure', 'inspection_report'];

      for (const templateType of docTemplates) {
        const templates = await RealEstateDocuments.getDocumentTemplates(
          companyId,
          templateType
        );

        if (templates.length > 0) {
          const docId = await RealEstateDocuments.generateDocumentFromTemplate(
            companyId,
            {
              templateId: templates[0].id,
              transactionId: data.transactionId,
              propertyId: data.propertyId,
              variables: {
                buyerName: data.buyerName,
                sellerName: data.sellerName,
                propertyAddress: data.propertyAddress,
                salePrice: data.salePrice,
                closingDate: data.closingDate,
                earnestMoneyAmount: data.escrowAmount
              },
              documentTitle: `${templateType.replace(/_/g, ' ').toUpperCase()} - ${data.transactionId}`
            },
            userId
          );

          documents.push(docId);
        }
      }

      // 6. Trigger notifications
      await this.triggerTransactionNotifications(companyId, {
        eventType: 'transaction_started',
        transactionId: data.transactionId,
        buyerId: data.buyerId,
        sellerId: data.sellerId,
        buyerAgentId: data.buyerAgentId,
        sellerAgentId: data.sellerAgentId,
        propertyAddress: data.propertyAddress,
        salePrice: data.salePrice,
        closingDate: data.closingDate,
        documentIds: documents
      });

      return {
        success: true,
        transactionId: data.transactionId,
        commissionId,
        escrowId,
        documentIds: documents,
        commission: commission,
        nextSteps: [
          'Request signatures on documents',
          'Schedule inspections',
          'Coordinate final walkthrough',
          'Prepare closing statements'
        ]
      };
    } catch (e) {
      console.error('[Integration] processTransaction failed:', e);
      throw e;
    }
  },

  /**
   * OFFER ACCEPTANCE WORKFLOW
   */

  async acceptOffer(companyId, offerId, data, userId) {
    try {
      console.log('[Integration] Accepting offer:', offerId);

      // 1. Update offer status
      await RealEstateOffers.updateOfferStatus(
        companyId,
        offerId,
        'accepted',
        { notes: 'Offer accepted by seller' },
        userId
      );

      // 2. Calculate and record commission
      const commission = await RealEstateOffers.evaluateCommissionRules(
        companyId,
        {
          propertyType: data.propertyType,
          salePrice: data.offerAmount,
          buyerAgentId: data.buyerAgentId,
          sellerAgentId: data.sellerAgentId
        }
      );

      // 3. Create escrow
      const escrowId = await RealEstateTrustAccounting.createEscrowAccount(
        companyId,
        {
          transactionId: offerId,
          buyerId: data.buyerId,
          sellerId: data.sellerId,
          propertyId: data.propertyId,
          escrowAmount: data.earnestMoney,
          escrowType: 'earnest_money'
        },
        userId
      );

      // 4. Trigger notifications
      await this.triggerTransactionNotifications(companyId, {
        eventType: 'offer_accepted',
        offerId,
        buyerId: data.buyerId,
        sellerId: data.sellerId,
        buyerAgentId: data.buyerAgentId,
        sellerAgentId: data.sellerAgentId,
        offerAmount: data.offerAmount,
        earnestMoney: data.earnestMoney
      });

      return {
        success: true,
        offerId,
        escrowId,
        commission,
        message: 'Offer accepted successfully. Escrow created and notifications sent.'
      };
    } catch (e) {
      console.error('[Integration] acceptOffer failed:', e);
      throw e;
    }
  },

  /**
   * COMMISSION PAYOUT WORKFLOW
   */

  async processCommissionPayout(companyId, commissionId, data, userId) {
    try {
      console.log('[Integration] Processing commission payout:', commissionId);

      // 1. Initialize Paystack payment
      const paymentInit = await RealEstateTrustAccounting.initializePaystackPayment({
        email: data.agentEmail,
        amount: data.commissionAmount,
        reference: `COMM-${commissionId}`,
        entityType: 'commission',
        entityId: commissionId,
        companyId,
        description: `Commission payout for transaction ${data.transactionId}`
      });

      if (!paymentInit.success) {
        throw new Error(`Payment initialization failed: ${paymentInit.error}`);
      }

      // 2. Return payment authorization URL
      return {
        success: true,
        authorizationUrl: paymentInit.authorizationUrl,
        reference: paymentInit.reference,
        accessCode: paymentInit.accessCode,
        nextAction: 'Redirect agent to authorization URL to complete payment'
      };
    } catch (e) {
      console.error('[Integration] processCommissionPayout failed:', e);
      throw e;
    }
  },

  /**
   * RENT PAYMENT WORKFLOW
   */

  async processRentPayment(companyId, leaseId, data, userId) {
    try {
      console.log('[Integration] Processing rent payment for lease:', leaseId);

      // 1. Create payment entry
      const paymentId = await RealEstateLeaseAutomation.createRentPaymentEntry(
        companyId,
        {
          leaseId,
          paymentDueDate: data.paymentDueDate,
          amountDue: data.amountDue,
          amountPaid: data.amountPaid || 0,
          lateFeePercentage: data.lateFeePercentage,
          lateFeeAmount: data.lateFeeAmount,
          paymentMethod: data.paymentMethod,
          notes: data.notes
        },
        userId
      );

      // 2. If amount is sufficient, process payment via Paystack
      if (data.amountPaid >= data.amountDue && data.paymentMethod === 'paystack') {
        const paymentInit = await RealEstateTrustAccounting.initializePaystackPayment({
          email: data.tenantEmail,
          amount: data.amountPaid,
          reference: `RENT-${paymentId}`,
          entityType: 'rent_payment',
          entityId: paymentId,
          companyId,
          description: `Rent payment for lease ${leaseId}`
        });

        if (!paymentInit.success) {
          throw new Error(`Rent payment initialization failed: ${paymentInit.error}`);
        }

        return {
          success: true,
          paymentId,
          authorizationUrl: paymentInit.authorizationUrl,
          reference: paymentInit.reference,
          requiresAuthorization: true
        };
      }

      // 3. Trigger notifications
      await this.triggerTransactionNotifications(companyId, {
        eventType: 'rent_payment_recorded',
        leaseId,
        paymentId,
        amountDue: data.amountDue,
        amountPaid: data.amountPaid,
        paymentStatus: data.amountPaid >= data.amountDue ? 'paid' : 'partial'
      });

      return {
        success: true,
        paymentId,
        status: data.amountPaid >= data.amountDue ? 'paid' : 'partial'
      };
    } catch (e) {
      console.error('[Integration] processRentPayment failed:', e);
      throw e;
    }
  },

  /**
   * MAINTENANCE REQUEST WORKFLOW
   */

  async createAndAssignMaintenance(companyId, data, userId) {
    try {
      console.log('[Integration] Creating maintenance request:', data.propertyId);

      // 1. Create maintenance request
      const maintenanceId = await RealEstateContractors.createMaintenanceRequest(
        companyId,
        {
          propertyId: data.propertyId,
          leaseId: data.leaseId,
          tenantId: data.tenantId,
          requestType: data.requestType,
          serviceCategory: data.serviceCategory,
          description: data.description,
          priorityLevel: data.priorityLevel,
          contractorId: data.contractorId
        },
        userId
      );

      // 2. Assign to contractor if specified
      if (data.contractorId) {
        await RealEstateContractors.assignMaintenanceToContractor(
          companyId,
          maintenanceId,
          data.contractorId,
          userId
        );
      }

      // 3. Trigger notifications
      await this.triggerTransactionNotifications(companyId, {
        eventType: 'maintenance_created',
        maintenanceId,
        propertyId: data.propertyId,
        contractorId: data.contractorId,
        priorityLevel: data.priorityLevel,
        description: data.description
      });

      return {
        success: true,
        maintenanceId,
        status: 'created',
        nextSteps: [
          'Contractor will review and provide quote',
          'Schedule work with property manager',
          'Complete work and submit invoice'
        ]
      };
    } catch (e) {
      console.error('[Integration] createAndAssignMaintenance failed:', e);
      throw e;
    }
  },

  /**
   * LEASE RENEWAL WORKFLOW
   */

  async initiateLeaseRenewal(companyId, leaseId, data, userId) {
    try {
      console.log('[Integration] Initiating lease renewal:', leaseId);

      // 1. Create renewal offer
      const renewalResult = await RealEstateLeaseAutomation.createLeaseRenewalOffer(
        companyId,
        {
          leaseId,
          newRentAmount: data.newRentAmount,
          renewalTermMonths: data.renewalTermMonths,
          responseDeadlineDays: data.responseDeadlineDays
        },
        userId
      );

      // 2. Generate renewal document
      const templates = await RealEstateDocuments.getDocumentTemplates(
        companyId,
        'lease_renewal'
      );

      let docId = null;
      if (templates.length > 0) {
        const docResult = await RealEstateDocuments.generateDocumentFromTemplate(
          companyId,
          {
            templateId: templates[0].id,
            leaseId,
            variables: {
              newRentAmount: data.newRentAmount,
              renewalTermMonths: data.renewalTermMonths,
              effectiveDate: new Date().toISOString().split('T')[0]
            },
            documentTitle: `Lease Renewal Offer - ${leaseId}`
          },
          userId
        );

        docId = docResult.documentId;

        // 3. Request tenant signature
        await RealEstateDocuments.requestSignature(
          companyId,
          {
            documentId: docId,
            signerName: data.tenantName,
            signerEmail: data.tenantEmail,
            expirationDays: data.responseDeadlineDays
          },
          userId
        );
      }

      // 4. Trigger notifications
      await this.triggerTransactionNotifications(companyId, {
        eventType: 'lease_renewal_offered',
        leaseId,
        renewalId: renewalResult.renewalId,
        documentId: docId,
        newRentAmount: data.newRentAmount,
        responseDeadline: renewalResult.responseDeadline
      });

      return {
        success: true,
        renewalId: renewalResult.renewalId,
        documentId: docId,
        newRentAmount: renewalResult.newRent,
        rentIncrease: renewalResult.rentIncrease,
        responseDeadline: renewalResult.responseDeadline
      };
    } catch (e) {
      console.error('[Integration] initiateLeaseRenewal failed:', e);
      throw e;
    }
  },

  /**
   * CLIENT ENGAGEMENT WORKFLOW
   */

  async updateClientEngagement(companyId, clientId, data, userId) {
    try {
      console.log('[Integration] Updating client engagement:', clientId);

      // 1. Score client
      const scoreResult = await RealEstateIntelligence.scoreClient(companyId, clientId, {
        transactionHistoryCount: data.transactionCount || 0,
        averageTransactionSize: data.averageTransactionSize || 0,
        engagementDaysRecent: data.daysSinceLastContact || 0,
        referralCount: data.referralCount || 0,
        responsiveness: data.responsiveness || 0.5
      });

      // 2. Find high-value clients for agent recommendations
      if (scoreResult.score >= 80) {
        // Get high-value clients
        const hotClients = await RealEstateIntelligence.getHighValueClients(companyId, 10);

        // Create recommendations if hot client
        if (data.recommendedProperties && data.recommendedProperties.length > 0) {
          for (const propId of data.recommendedProperties) {
            await RealEstateIntelligence.createAgentRecommendation(
              companyId,
              {
                clientId,
                recommendedAgentId: data.recommendedAgentId,
                recommendationType: 'new_listings',
                recommendationReason: `Hot lead - score ${scoreResult.score}/100`,
                recommendationScore: scoreResult.score / 100,
                propertyId: propId
              },
              userId
            );
          }
        }
      }

      // 3. Trigger notifications
      await this.triggerTransactionNotifications(companyId, {
        eventType: 'client_scored',
        clientId,
        score: scoreResult.score,
        category: scoreResult.category
      });

      return {
        success: true,
        clientId,
        score: scoreResult.score,
        category: scoreResult.category,
        breakdown: scoreResult.breakdown
      };
    } catch (e) {
      console.error('[Integration] updateClientEngagement failed:', e);
      throw e;
    }
  },

  /**
   * DOCUMENT EXECUTION WORKFLOW
   */

  async executeDocuments(companyId, documentIds, executionData, userId) {
    try {
      console.log('[Integration] Executing documents:', documentIds);

      const results = [];

      for (const docId of documentIds) {
        try {
          // 1. Verify all signatures
          const sigStatus = await RealEstateDocuments.getSignatureStatus(companyId, docId);

          if (!sigStatus.isComplete) {
            results.push({
              documentId: docId,
              success: false,
              error: `${sigStatus.pending} signatures pending`
            });
            continue;
          }

          // 2. Execute document
          const execResult = await RealEstateDocuments.executeDocument(
            companyId,
            docId,
            executionData,
            userId
          );

          results.push({
            documentId: docId,
            success: true,
            executedAt: execResult.executedAt
          });

          // 3. Trigger notifications
          await this.triggerTransactionNotifications(companyId, {
            eventType: 'document_executed',
            documentId: docId,
            executionData
          });
        } catch (e) {
          console.error(`[Integration] Failed to execute document ${docId}:`, e);
          results.push({
            documentId: docId,
            success: false,
            error: e.message
          });
        }
      }

      return {
        success: results.every(r => r.success),
        results
      };
    } catch (e) {
      console.error('[Integration] executeDocuments failed:', e);
      throw e;
    }
  },

  /**
   * MARKETPLACE ANALYSIS WORKFLOW
   */

  async analyzeMarketAndRecommend(companyId, propertyId, data, userId) {
    try {
      console.log('[Integration] Analyzing market for property:', propertyId);

      // 1. Get comparable properties
      const comparables = await RealEstateIntelligence.getComparableProperties(
        companyId,
        propertyId,
        0.7
      );

      // 2. Generate valuation report
      const valuation = await RealEstateIntelligence.generateValuationReport(
        companyId,
        propertyId
      );

      // 3. Get market trends
      const trends = await RealEstateIntelligence.getMarketTrends(
        companyId,
        data.marketRegion,
        12
      );

      // 4. Prepare recommendations
      const recommendations = {
        valuationRange: valuation.valuationRange,
        marketTrend: trends.trend,
        priceChangePercentage: trends.priceChangePercentage,
        suggestedListingPrice: this.calculateSuggestedPrice(valuation, trends),
        marketAbsorptionRate: trends.averageListingPrice,
        comparables: valuation.comparables
      };

      return {
        success: true,
        propertyId,
        recommendations,
        marketAnalysis: {
          trend: trends.trend,
          priceChangePercentage: trends.priceChangePercentage,
          averageDaysOnMarket: trends.averageDaysOnMarket
        }
      };
    } catch (e) {
      console.error('[Integration] analyzeMarketAndRecommend failed:', e);
      throw e;
    }
  },

  calculateSuggestedPrice(valuation, trends) {
    const avgPrice = valuation.valuationRange.average;
    const trendMultiplier = trends.trend === 'appreciation' ? 1.02 : trends.trend === 'depreciation' ? 0.98 : 1;
    return Math.round(avgPrice * trendMultiplier);
  },

  /**
   * NOTIFICATION TRIGGER SYSTEM
   */

  async triggerTransactionNotifications(companyId, eventData) {
    try {
      // This integrates with the Novu notifications service
      // Post event to notification queue for processing
      const eventQueue = {
        companyId,
        eventType: eventData.eventType,
        timestamp: new Date().toISOString(),
        data: eventData
      };

      // In production, this would be sent to a message queue (e.g., Supabase, Redis)
      // or directly to the Novu service via an edge function
      console.log('[Integration] Queued notification event:', eventQueue);

      // TODO: Post to /api/notifications endpoint or message queue
      return {
        success: true,
        eventQueued: true,
        eventType: eventData.eventType
      };
    } catch (e) {
      console.warn('[Integration] Notification trigger failed (non-blocking):', e);
      // Don't throw - notifications shouldn't block main operations
      return { success: false, error: e.message };
    }
  },

  /**
   * BATCH OPERATIONS
   */

  async processMonthlyRentPaymentReminders(companyId) {
    try {
      console.log('[Integration] Processing monthly rent payment reminders');

      const reminders = await RealEstateLeaseAutomation.getPaymentsRequiringReminders(
        companyId
      );

      for (const payment of reminders) {
        await this.triggerTransactionNotifications(companyId, {
          eventType: 'rent_payment_reminder',
          leaseId: payment.lease_id,
          tenantId: payment.tenant_id,
          tenantName: payment.tenant_name,
          tenantEmail: payment.tenant_email,
          amountDue: payment.amount_due,
          dueDate: payment.payment_due_date,
          paymentStatus: payment.payment_status
        });
      }

      return {
        success: true,
        remindersProcessed: reminders.length
      };
    } catch (e) {
      console.error('[Integration] processMonthlyRentPaymentReminders failed:', e);
      throw e;
    }
  },

  async processLeaseRenewalReminders(companyId, daysAhead = 90) {
    try {
      console.log('[Integration] Processing lease renewal reminders');

      const upcomingRenewals = await RealEstateLeaseAutomation.getUpcomingLeaseRenewals(
        companyId,
        daysAhead
      );

      for (const renewal of upcomingRenewals) {
        await this.triggerTransactionNotifications(companyId, {
          eventType: 'lease_expiring_soon',
          leaseId: renewal.lease_id,
          tenantId: renewal.tenant_id,
          tenantName: renewal.tenant_name,
          expirationDate: renewal.end_date,
          daysUntilExpiration: daysAhead
        });
      }

      return {
        success: true,
        renewalsProcessed: upcomingRenewals.length
      };
    } catch (e) {
      console.error('[Integration] processLeaseRenewalReminders failed:', e);
      throw e;
    }
  }
};
