/**
 * RealEstateIntegrations.js
 * 
 * Integration utilities for Real Estate vertical.
 * Handles Novu notifications and Paystack payments.
 */

import { powerSync } from '@/api/PowerSyncConnector';

// ────────────────────────────────────────────────────────
// NOVU NOTIFICATIONS
// ────────────────────────────────────────────────────────

export const RealEstateNotifications = {
  // Notification templates for Real Estate
  TEMPLATES: {
    PROPERTY_LISTED: 'property-listed',
    VIEWING_SCHEDULED: 'viewing-scheduled',
    VIEWING_REMINDER: 'viewing-reminder',
    OFFER_RECEIVED: 'offer-received',
    OFFER_ACCEPTED: 'offer-accepted',
    TRANSACTION_CLOSED: 'transaction-closed',
    COMMISSION_PAID: 'commission-paid',
    LEASE_CREATED: 'lease-created',
    LEASE_RENEWAL_REMINDER: 'lease-renewal-reminder',
    RENT_PAYMENT_DUE: 'rent-payment-due',
    RENT_PAYMENT_RECEIVED: 'rent-payment-received',
    MAINTENANCE_REQUEST_SUBMITTED: 'maintenance-request-submitted',
    MAINTENANCE_COMPLETED: 'maintenance-completed',
    MAINTENANCE_URGENT: 'maintenance-urgent',
    AGENT_PERFORMANCE_ALERT: 'agent-performance-alert',
  },

  // Send viewing scheduled notification
  async notifyViewingScheduled(companyId, viewing, agent, client) {
    try {
      const payload = {
        companyId,
        template: this.TEMPLATES.VIEWING_SCHEDULED,
        recipientEmail: client.email,
        recipientPhone: client.phone,
        data: {
          clientName: client.name,
          propertyAddress: viewing.property_address,
          viewingDate: viewing.viewing_date,
          viewingTime: viewing.viewing_time,
          agentName: agent.agent_name,
          agentPhone: agent.phone,
        },
      };

      await powerSync.execute(
        `INSERT INTO automation_logs (id, company_id, action, module, status, user_email, details, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `notif_${Date.now()}`,
          companyId,
          'send_notification',
          'real-estate',
          'pending',
          agent.email,
          JSON.stringify(payload),
          new Date().toISOString(),
        ]
      );

      return { success: true, type: 'viewing-scheduled' };
    } catch (e) {
      console.error('[RE Notifications] notifyViewingScheduled failed:', e);
      throw e;
    }
  },

  // Send offer notification
  async notifyOfferReceived(companyId, offer, property, agent) {
    try {
      const payload = {
        companyId,
        template: this.TEMPLATES.OFFER_RECEIVED,
        recipientEmail: agent.email,
        data: {
          agentName: agent.agent_name,
          propertyAddress: property.address,
          buyerName: offer.buyer_name,
          offerAmount: offer.offer_amount,
          status: offer.status,
        },
      };

      await powerSync.execute(
        `INSERT INTO automation_logs (id, company_id, action, module, status, user_email, details, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `notif_${Date.now()}`,
          companyId,
          'send_notification',
          'real-estate',
          'pending',
          agent.email,
          JSON.stringify(payload),
          new Date().toISOString(),
        ]
      );

      return { success: true, type: 'offer-received' };
    } catch (e) {
      console.error('[RE Notifications] notifyOfferReceived failed:', e);
      throw e;
    }
  },

  // Send lease renewal reminder
  async notifyLeaseRenewalReminder(companyId, lease, tenant, landlord) {
    try {
      const daysUntilExpiry = Math.floor(
        (new Date(lease.end_date) - new Date()) / (1000 * 60 * 60 * 24)
      );

      const payload = {
        companyId,
        template: this.TEMPLATES.LEASE_RENEWAL_REMINDER,
        recipientEmail: tenant.email,
        recipientPhone: tenant.phone,
        data: {
          tenantName: tenant.name,
          propertyAddress: lease.property_address,
          leaseEndDate: lease.end_date,
          daysUntilExpiry,
          landlordName: landlord.name,
          landlordPhone: landlord.phone,
        },
      };

      await powerSync.execute(
        `INSERT INTO automation_logs (id, company_id, action, module, status, user_email, details, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `notif_${Date.now()}`,
          companyId,
          'send_notification',
          'real-estate',
          'pending',
          tenant.email,
          JSON.stringify(payload),
          new Date().toISOString(),
        ]
      );

      return { success: true, type: 'lease-renewal-reminder' };
    } catch (e) {
      console.error('[RE Notifications] notifyLeaseRenewalReminder failed:', e);
      throw e;
    }
  },

  // Send rent payment due notification
  async notifyRentPaymentDue(companyId, lease, tenant, daysUntilDue) {
    try {
      const payload = {
        companyId,
        template: this.TEMPLATES.RENT_PAYMENT_DUE,
        recipientEmail: tenant.email,
        recipientPhone: tenant.phone,
        data: {
          tenantName: tenant.name,
          propertyAddress: lease.property_address,
          rentAmount: lease.monthly_rent,
          daysUntilDue,
          dueDate: new Date(Date.now() + daysUntilDue * 24 * 60 * 60 * 1000).toLocaleDateString(),
        },
      };

      await powerSync.execute(
        `INSERT INTO automation_logs (id, company_id, action, module, status, user_email, details, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `notif_${Date.now()}`,
          companyId,
          'send_notification',
          'real-estate',
          'pending',
          tenant.email,
          JSON.stringify(payload),
          new Date().toISOString(),
        ]
      );

      return { success: true, type: 'rent-payment-due' };
    } catch (e) {
      console.error('[RE Notifications] notifyRentPaymentDue failed:', e);
      throw e;
    }
  },

  // Send maintenance urgent notification
  async notifyMaintenanceUrgent(companyId, maintenance, property, landlord) {
    try {
      const payload = {
        companyId,
        template: this.TEMPLATES.MAINTENANCE_URGENT,
        recipientEmail: landlord.email,
        recipientPhone: landlord.phone,
        data: {
          landlordName: landlord.name,
          propertyAddress: maintenance.property_address,
          issueDescription: maintenance.issue_description,
          priority: maintenance.priority,
          reportedBy: maintenance.reported_by_name,
        },
      };

      await powerSync.execute(
        `INSERT INTO automation_logs (id, company_id, action, module, status, user_email, details, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `notif_${Date.now()}`,
          companyId,
          'send_notification',
          'real-estate',
          'pending',
          landlord.email,
          JSON.stringify(payload),
          new Date().toISOString(),
        ]
      );

      return { success: true, type: 'maintenance-urgent' };
    } catch (e) {
      console.error('[RE Notifications] notifyMaintenanceUrgent failed:', e);
      throw e;
    }
  },

  // Send transaction closed notification
  async notifyTransactionClosed(companyId, transaction, agent, buyer) {
    try {
      const payload = {
        companyId,
        template: this.TEMPLATES.TRANSACTION_CLOSED,
        recipientEmail: buyer.email,
        recipientPhone: buyer.phone,
        data: {
          buyerName: buyer.name,
          propertyAddress: transaction.property_address,
          salePrice: transaction.sale_price,
          closingDate: transaction.closing_date,
          agentName: agent.agent_name,
        },
      };

      await powerSync.execute(
        `INSERT INTO automation_logs (id, company_id, action, module, status, user_email, details, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `notif_${Date.now()}`,
          companyId,
          'send_notification',
          'real-estate',
          'pending',
          buyer.email,
          JSON.stringify(payload),
          new Date().toISOString(),
        ]
      );

      return { success: true, type: 'transaction-closed' };
    } catch (e) {
      console.error('[RE Notifications] notifyTransactionClosed failed:', e);
      throw e;
    }
  },
};

// ────────────────────────────────────────────────────────
// PAYSTACK PAYMENTS
// ────────────────────────────────────────────────────────

export const RealEstatePayments = {
  // Process commission payment
  async processCommissionPayment(companyId, commission, agent, userId) {
    try {
      const payload = {
        companyId,
        provider: 'paystack',
        amount: Math.round(commission.commission_amount * 100), // Convert to kobo
        currency: 'NGN',
        customerEmail: agent.email,
        description: `Commission - Transaction ${commission.transaction_id}`,
      };

      // Create payment record
      const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await powerSync.execute(
        `INSERT INTO automation_logs (id, company_id, action, module, status, user_email, details, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentId,
          companyId,
          'process_payment',
          'real-estate',
          'pending',
          userId,
          JSON.stringify(payload),
          new Date().toISOString(),
        ]
      );

      // Update commission status
      await powerSync.execute(
        `UPDATE univ_re_commissions SET status = ? WHERE id = ?`,
        ['payment-pending', commission.id]
      );

      // Audit logged inline during payment processing
      return { success: true, paymentId, amount: commission.commission_amount };
    } catch (e) {
      console.error('[RE Payments] processCommissionPayment failed:', e);
      throw e;
    }
  },

  // Process rent collection payment
  async processRentPayment(companyId, rentPayment, tenant, userId) {
    try {
      const payload = {
        companyId,
        provider: 'paystack',
        amount: Math.round(rentPayment.amount * 100), // Convert to kobo
        currency: 'NGN',
        customerEmail: tenant.email,
        description: `Rent Payment - ${rentPayment.property_id}`,
      };

      // Create payment record
      const paymentId = `rent_payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await powerSync.execute(
        `INSERT INTO automation_logs (id, company_id, action, module, status, user_email, details, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentId,
          companyId,
          'collect_payment',
          'real-estate',
          'pending',
          userId,
          JSON.stringify(payload),
          new Date().toISOString(),
        ]
      );

      // Audit logged inline during rent payment processing
      return { success: true, paymentId, amount: rentPayment.amount };
    } catch (e) {
      console.error('[RE Payments] processRentPayment failed:', e);
      throw e;
    }
  },

  // Generate payment link for commission
  async generateCommissionPaymentLink(commission) {
    try {
      const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      if (!paystackPublicKey) {
        throw new Error('Paystack public key not configured');
      }

      const paystackConfig = {
        email: commission.agent_email,
        amount: Math.round(commission.commission_amount * 100),
        currency: 'NGN',
        metadata: {
          commissionId: commission.id,
          agentId: commission.agent_id,
          transactionId: commission.transaction_id,
        },
      };

      return paystackConfig;
    } catch (e) {
      console.error('[RE Payments] generateCommissionPaymentLink failed:', e);
      throw e;
    }
  },

  // Verify payment completion
  async verifyPaymentCompletion(reference) {
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error('Payment verification failed');
      }

      const data = await response.json();
      return data.data.status === 'success' ? data.data : null;
    } catch (e) {
      console.error('[RE Payments] verifyPaymentCompletion failed:', e);
      throw e;
    }
  },
};

// ────────────────────────────────────────────────────────
// AUTOMATION TRIGGERS
// ────────────────────────────────────────────────────────

export const RealEstateAutomation = {
  // Setup viewing reminder automation
  async setupViewingReminder(companyId, viewing, reminderMinutesBefore = 60) {
    try {
      const viewingDateTime = new Date(
        `${viewing.viewing_date}T${viewing.viewing_time}`
      );
      const reminderTime = new Date(viewingDateTime.getTime() - reminderMinutesBefore * 60 * 1000);

      await powerSync.execute(
        `INSERT INTO automation_queue (id, company_id, rule_id, payload, execute_at, status, retry_count, max_retries, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `reminder_${viewing.id}_${Date.now()}`,
          companyId,
          'viewing-reminder',
          JSON.stringify({ viewing_id: viewing.id, type: 'viewing-reminder' }),
          reminderTime.toISOString(),
          'pending',
          0,
          3,
          new Date().toISOString(),
        ]
      );

      return { success: true, remindAt: reminderTime };
    } catch (e) {
      console.error('[RE Automation] setupViewingReminder failed:', e);
      throw e;
    }
  },

  // Setup lease renewal automation
  async setupLeaseRenewalReminder(companyId, lease, reminderDaysBefore = 30) {
    try {
      const leaseEndDate = new Date(lease.end_date);
      const reminderDate = new Date(leaseEndDate.getTime() - reminderDaysBefore * 24 * 60 * 60 * 1000);

      await powerSync.execute(
        `INSERT INTO automation_queue (id, company_id, rule_id, payload, execute_at, status, retry_count, max_retries, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `renewal_${lease.id}_${Date.now()}`,
          companyId,
          'lease-renewal-reminder',
          JSON.stringify({ lease_id: lease.id, type: 'lease-renewal-reminder' }),
          reminderDate.toISOString(),
          'pending',
          0,
          3,
          new Date().toISOString(),
        ]
      );

      return { success: true, remindAt: reminderDate };
    } catch (e) {
      console.error('[RE Automation] setupLeaseRenewalReminder failed:', e);
      throw e;
    }
  },

  // Setup rent payment reminder automation
  async setupRentPaymentReminder(companyId, lease, reminderDaysBefore = 5) {
    try {
      // For monthly rent, calculate next due date
      const now = new Date();
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, new Date(lease.start_date).getDate());
      const reminderDate = new Date(nextMonthDate.getTime() - reminderDaysBefore * 24 * 60 * 60 * 1000);

      await powerSync.execute(
        `INSERT INTO automation_queue (id, company_id, rule_id, payload, execute_at, status, retry_count, max_retries, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `rent_reminder_${lease.id}_${Date.now()}`,
          companyId,
          'rent-payment-reminder',
          JSON.stringify({ lease_id: lease.id, type: 'rent-payment-reminder' }),
          reminderDate.toISOString(),
          'pending',
          0,
          3,
          new Date().toISOString(),
        ]
      );

      return { success: true, remindAt: reminderDate };
    } catch (e) {
      console.error('[RE Automation] setupRentPaymentReminder failed:', e);
      throw e;
    }
  },
};

export default {
  RealEstateNotifications,
  RealEstatePayments,
  RealEstateAutomation,
};
