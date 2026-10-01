/**
 * NotificationService.js
 * 
 * Unified notification system using Novu for emails, SMS, and in-app notifications
 * Handles all real estate-related notifications across the platform
 */

import { Novu } from '@novu/node';
import { powerSync } from '@/api/PowerSyncConnector';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Initialize Novu client
const novu = new Novu(process.env.NOVU_API_KEY);

export const NotificationService = {
  // ────────────────────────────────────────────────────────
  // NOTIFICATION TEMPLATES & TRIGGERS
  // ────────────────────────────────────────────────────────

  /**
   * Trust Accounting Notifications
   */
  async notifyTrustAccountCreated(companyId, accountData, recipientEmail) {
    try {
      await novu.trigger('trust_account_created', {
        to: {
          subscriberId: `${companyId}-${recipientEmail}`,
          email: recipientEmail
        },
        payload: {
          accountName: accountData.accountName,
          accountType: accountData.accountType,
          bankName: accountData.bankName,
          companyId
        }
      });
      
      await this.logNotification(companyId, 'trust_account_created', recipientEmail, {
        accountName: accountData.accountName
      });
    } catch (e) {
      console.error('[Notification] notifyTrustAccountCreated failed:', e);
    }
  },

  async notifyNewLead(companyId, leadData, recipientEmail) {
    try {
      await novu.trigger('new_lead_received', {
        to: {
          subscriberId: `${companyId}-${recipientEmail}`,
          email: recipientEmail
        },
        payload: {
          leadName: leadData.name,
          leadSource: leadData.source,
          companyId
        }
      });
      
      await this.logNotification(companyId, 'new_lead_received', recipientEmail, {
        leadName: leadData.name
      });
    } catch (e) {
      console.error('[Notification] notifyNewLead failed:', e);
    }
  },

  /**
   * Video Meeting Notifications
   */
  async notifyMeetingInvite(roomUrl, recipientEmail) {
    try {
      const apiKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_NOVU_API_KEY) || 'YOUR_NOVU_API_KEY';
      if (apiKey === 'YOUR_NOVU_API_KEY') {
        throw new Error('Novu API key not configured. Using fallback.');
      }
      
      const response = await fetch('https://api.novu.co/v1/events/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${apiKey}`
        },
        body: JSON.stringify({
          name: 'meeting_invite',
          to: {
            subscriberId: `meeting-invite-${recipientEmail}`,
            email: recipientEmail
          },
          payload: { roomUrl }
        })
      });

      if (!response.ok) {
        throw new Error(`Novu API error: ${response.statusText}`);
      }
    } catch (e) {
      console.error('[Notification] notifyMeetingInvite failed:', e);
      throw e; 
    }
  },

  async notifyEscrowReleased(companyId, escrowData, recipientEmail) {
    try {
      await novu.trigger('escrow_released', {
        to: {
          subscriberId: `${companyId}-${recipientEmail}`,
          email: recipientEmail
        },
        payload: {
          escrowAmount: escrowData.escrowAmount,
          transactionId: escrowData.transactionId,
          releaseDate: new Date().toISOString()
        }
      });
      
      await this.logNotification(companyId, 'escrow_released', recipientEmail, {
        amount: escrowData.escrowAmount
      });
    } catch (e) {
      console.error('[Notification] notifyEscrowReleased failed:', e);
    }
  },

  async notifyCommissionPayout(companyId, commissionData, recipientEmail) {
    try {
      await novu.trigger('commission_payout_ready', {
        to: {
          subscriberId: `${companyId}-${recipientEmail}`,
          email: recipientEmail
        },
        payload: {
          commissionAmount: commissionData.totalCommission,
          transactionId: commissionData.transactionId,
          expectedPayoutDate: commissionData.expectedPayoutDate
        }
      });
      
      await this.logNotification(companyId, 'commission_payout_ready', recipientEmail, {
        amount: commissionData.totalCommission
      });
    } catch (e) {
      console.error('[Notification] notifyCommissionPayout failed:', e);
    }
  },

  /**
   * Offer & Negotiation Notifications
   */
  async notifyOfferCreated(companyId, offerData, recipientEmail) {
    try {
      await novu.trigger('offer_created', {
        to: {
          subscriberId: `${companyId}-${recipientEmail}`,
          email: recipientEmail
        },
        payload: {
          propertyAddress: offerData.propertyAddress,
          offerAmount: offerData.offerAmount,
          buyerName: offerData.buyerName,
          createdDate: new Date().toISOString()
        }
      });
      
      await this.logNotification(companyId, 'offer_created', recipientEmail, {
        property: offerData.propertyAddress,
        amount: offerData.offerAmount
      });
    } catch (e) {
      console.error('[Notification] notifyOfferCreated failed:', e);
    }
  },

  async notifyCounterOfferReceived(companyId, counterOfferData, recipientEmail) {
    try {
      await novu.trigger('counter_offer_received', {
        to: {
          subscriberId: `${companyId}-${recipientEmail}`,
          email: recipientEmail
        },
        payload: {
          propertyAddress: counterOfferData.propertyAddress,
          counterOfferAmount: counterOfferData.counterOfferAmount,
          originalAmount: counterOfferData.originalAmount,
          counterBy: counterOfferData.counterBy
        }
      });
      
      await this.logNotification(companyId, 'counter_offer_received', recipientEmail, {
        property: counterOfferData.propertyAddress
      });
    } catch (e) {
      console.error('[Notification] notifyCounterOfferReceived failed:', e);
    }
  },

  async notifyCounterOfferExpiring(companyId, offerData, recipientEmail) {
    try {
      await novu.trigger('counter_offer_expiring', {
        to: {
          subscriberId: `${companyId}-${recipientEmail}`,
          email: recipientEmail
        },
        payload: {
          propertyAddress: offerData.propertyAddress,
          expirationDate: offerData.expirationDate,
          hoursRemaining: offerData.hoursRemaining
        }
      });
      
      await this.logNotification(companyId, 'counter_offer_expiring', recipientEmail, {
        property: offerData.propertyAddress
      });
    } catch (e) {
      console.error('[Notification] notifyCounterOfferExpiring failed:', e);
    }
  },

  /**
   * Document Notifications
   */
  async notifySignatureRequested(companyId, documentData, signerEmail) {
    try {
      await novu.trigger('signature_requested', {
        to: {
          subscriberId: `${companyId}-${signerEmail}`,
          email: signerEmail
        },
        payload: {
          documentTitle: documentData.documentTitle,
          signingUrl: documentData.signingUrl,
          expirationDate: documentData.expirationDate,
          signerName: documentData.signerName
        }
      });
      
      await this.logNotification(companyId, 'signature_requested', signerEmail, {
        document: documentData.documentTitle
      });
    } catch (e) {
      console.error('[Notification] notifySignatureRequested failed:', e);
    }
  },

  async notifyDocumentSigned(companyId, documentData, recipientEmail) {
    try {
      await novu.trigger('document_signed', {
        to: {
          subscriberId: `${companyId}-${recipientEmail}`,
          email: recipientEmail
        },
        payload: {
          documentTitle: documentData.documentTitle,
          signerName: documentData.signerName,
          signedDate: new Date().toISOString()
        }
      });
      
      await this.logNotification(companyId, 'document_signed', recipientEmail, {
        document: documentData.documentTitle
      });
    } catch (e) {
      console.error('[Notification] notifyDocumentSigned failed:', e);
    }
  },

  /**
   * Contractor Notifications
   */
  async notifyMaintenanceRequestCreated(companyId, maintenanceData, recipientEmail) {
    try {
      await novu.trigger('maintenance_request_created', {
        to: {
          subscriberId: `${companyId}-${recipientEmail}`,
          email: recipientEmail
        },
        payload: {
          propertyAddress: maintenanceData.propertyAddress,
          serviceCategory: maintenanceData.serviceCategory,
          priorityLevel: maintenanceData.priorityLevel,
          requestDate: new Date().toISOString()
        }
      });
      
      await this.logNotification(companyId, 'maintenance_request_created', recipientEmail, {
        property: maintenanceData.propertyAddress,
        service: maintenanceData.serviceCategory
      });
    } catch (e) {
      console.error('[Notification] notifyMaintenanceRequestCreated failed:', e);
    }
  },

  async notifyMaintenanceCompleted(companyId, maintenanceData, recipientEmail) {
    try {
      await novu.trigger('maintenance_completed', {
        to: {
          subscriberId: `${companyId}-${recipientEmail}`,
          email: recipientEmail
        },
        payload: {
          propertyAddress: maintenanceData.propertyAddress,
          contractorName: maintenanceData.contractorName,
          completionDate: maintenanceData.completionDate,
          finalAmount: maintenanceData.finalAmount
        }
      });
      
      await this.logNotification(companyId, 'maintenance_completed', recipientEmail, {
        property: maintenanceData.propertyAddress
      });
    } catch (e) {
      console.error('[Notification] notifyMaintenanceCompleted failed:', e);
    }
  },

  /**
   * Lease & Rent Payment Notifications
   */
  async notifyLeaseRenewalDue(companyId, leaseData, recipientEmail) {
    try {
      await novu.trigger('lease_renewal_due', {
        to: {
          subscriberId: `${companyId}-${recipientEmail}`,
          email: recipientEmail
        },
        payload: {
          propertyAddress: leaseData.propertyAddress,
          tenantName: leaseData.tenantName,
          renewalDeadline: leaseData.renewalDeadline,
          daysUntilExpiration: leaseData.daysUntilExpiration
        }
      });
      
      await this.logNotification(companyId, 'lease_renewal_due', recipientEmail, {
        property: leaseData.propertyAddress,
        tenant: leaseData.tenantName
      });
    } catch (e) {
      console.error('[Notification] notifyLeaseRenewalDue failed:', e);
    }
  },

  async notifyRentDueReminder(companyId, rentData, tenantEmail) {
    try {
      await novu.trigger('rent_due_reminder', {
        to: {
          subscriberId: `${companyId}-${tenantEmail}`,
          email: tenantEmail
        },
        payload: {
          propertyAddress: rentData.propertyAddress,
          rentAmount: rentData.rentAmount,
          dueDate: rentData.dueDate,
          daysUntilDue: rentData.daysUntilDue,
          paymentInstructions: rentData.paymentInstructions
        }
      });
      
      await this.logNotification(companyId, 'rent_due_reminder', tenantEmail, {
        property: rentData.propertyAddress,
        amount: rentData.rentAmount
      });
    } catch (e) {
      console.error('[Notification] notifyRentDueReminder failed:', e);
    }
  },

  async notifyRentOverdue(companyId, rentData, propertyManagerEmail) {
    try {
      await novu.trigger('rent_overdue', {
        to: {
          subscriberId: `${companyId}-${propertyManagerEmail}`,
          email: propertyManagerEmail
        },
        payload: {
          propertyAddress: rentData.propertyAddress,
          tenantName: rentData.tenantName,
          overdueAmount: rentData.overdueAmount,
          daysOverdue: rentData.daysOverdue,
          lateFeeCharged: rentData.lateFeeCharged
        }
      });
      
      await this.logNotification(companyId, 'rent_overdue', propertyManagerEmail, {
        property: rentData.propertyAddress,
        amount: rentData.overdueAmount
      });
    } catch (e) {
      console.error('[Notification] notifyRentOverdue failed:', e);
    }
  },

  /**
   * Market Intelligence Notifications
   */
  async notifyMarketTrendAlert(companyId, trendData, agentEmail) {
    try {
      await novu.trigger('market_trend_alert', {
        to: {
          subscriberId: `${companyId}-${agentEmail}`,
          email: agentEmail
        },
        payload: {
          region: trendData.region,
          trend: trendData.trend,
          percentageChange: trendData.percentageChange,
          averagePrice: trendData.averagePrice,
          alertType: trendData.alertType
        }
      });
      
      await this.logNotification(companyId, 'market_trend_alert', agentEmail, {
        region: trendData.region,
        trend: trendData.trend
      });
    } catch (e) {
      console.error('[Notification] notifyMarketTrendAlert failed:', e);
    }
  },

  async notifyHighValueLeadIdentified(companyId, clientData, agentEmail) {
    try {
      await novu.trigger('high_value_lead_identified', {
        to: {
          subscriberId: `${companyId}-${agentEmail}`,
          email: agentEmail
        },
        payload: {
          clientName: clientData.clientName,
          clientScore: clientData.clientScore,
          scoringCategory: clientData.scoringCategory,
          recommendedAction: clientData.recommendedAction
        }
      });
      
      await this.logNotification(companyId, 'high_value_lead_identified', agentEmail, {
        client: clientData.clientName,
        score: clientData.clientScore
      });
    } catch (e) {
      console.error('[Notification] notifyHighValueLeadIdentified failed:', e);
    }
  },

  /**
   * System & Admin Notifications
   */
  async notifyPaymentFailure(companyId, paymentData, adminEmail) {
    try {
      await novu.trigger('payment_failure', {
        to: {
          subscriberId: `${companyId}-${adminEmail}`,
          email: adminEmail
        },
        payload: {
          paymentType: paymentData.paymentType,
          amount: paymentData.amount,
          entityType: paymentData.entityType,
          failureReason: paymentData.failureReason,
          timestamp: new Date().toISOString()
        }
      });
      
      await this.logNotification(companyId, 'payment_failure', adminEmail, {
        type: paymentData.paymentType,
        amount: paymentData.amount
      });
    } catch (e) {
      console.error('[Notification] notifyPaymentFailure failed:', e);
    }
  },

  async notifyReconciliationDiscrepancy(companyId, reconciliationData, adminEmail) {
    try {
      await novu.trigger('reconciliation_discrepancy', {
        to: {
          subscriberId: `${companyId}-${adminEmail}`,
          email: adminEmail
        },
        payload: {
          accountName: reconciliationData.accountName,
          calculatedBalance: reconciliationData.calculatedBalance,
          bankBalance: reconciliationData.bankBalance,
          variance: reconciliationData.variance,
          reconciliationDate: new Date().toISOString()
        }
      });
      
      await this.logNotification(companyId, 'reconciliation_discrepancy', adminEmail, {
        account: reconciliationData.accountName,
        variance: reconciliationData.variance
      });
    } catch (e) {
      console.error('[Notification] notifyReconciliationDiscrepancy failed:', e);
    }
  },

  // ────────────────────────────────────────────────────────
  // NOTIFICATION LOGGING
  // ────────────────────────────────────────────────────────

  async logNotification(companyId, notificationType, recipientEmail, details = {}) {
    try {
      const id = generateUUID();
      const now = new Date().toISOString();

      await powerSync.execute(
        `INSERT INTO univ_re_notifications_log 
         (id, company_id, notification_type, recipient_email, details, sent_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, notificationType, recipientEmail, JSON.stringify(details), now, now]
      );

      return id;
    } catch (e) {
      console.warn('[Notification] logNotification failed:', e);
    }
  },

  async getNotificationHistory(companyId, limit = 50) {
    try {
      const result = await powerSync.execute(
        `SELECT * FROM univ_re_notifications_log WHERE company_id = ?
         ORDER BY sent_at DESC LIMIT ?`,
        [companyId, limit]
      );

      return result.rows._array || [];
    } catch (e) {
      console.error('[Notification] getNotificationHistory failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // BULK NOTIFICATIONS
  // ────────────────────────────────────────────────────────

  async sendBulkRentReminders(companyId, recipientList, reminderData) {
    try {
      for (const recipient of recipientList) {
        await this.notifyRentDueReminder(companyId, reminderData, recipient.tenantEmail);
      }

      return {
        success: true,
        totalSent: recipientList.length,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      console.error('[Notification] sendBulkRentReminders failed:', e);
      throw e;
    }
  },

  async sendBulkLeaseRenewalNotices(companyId, recipientList, renewalData) {
    try {
      for (const recipient of recipientList) {
        await this.notifyLeaseRenewalDue(companyId, renewalData, recipient.managerEmail);
      }

      return {
        success: true,
        totalSent: recipientList.length,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      console.error('[Notification] sendBulkLeaseRenewalNotices failed:', e);
      throw e;
    }
  },

  async sendBulkMarketAlerts(companyId, agentList, trendData) {
    try {
      for (const agent of agentList) {
        await this.notifyMarketTrendAlert(companyId, trendData, agent.agentEmail);
      }

      return {
        success: true,
        totalSent: agentList.length,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      console.error('[Notification] sendBulkMarketAlerts failed:', e);
      throw e;
    }
  }
};

export default NotificationService;
