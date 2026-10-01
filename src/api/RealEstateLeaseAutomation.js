/**
 * RealEstateLeaseAutomation.js
 * 
 * Lease management, rent payment scheduling, automations, and renewal tracking
 */

import { powerSync } from '@/api/PowerSyncConnector';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const RealEstateLeaseAutomation = {
  // ────────────────────────────────────────────────────────
  // RENT PAYMENT SCHEDULING
  // ────────────────────────────────────────────────────────

  async createRentPaymentSchedule(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = new Date().toISOString();

      await powerSync.execute(
        `INSERT INTO univ_re_rent_payment_schedules 
         (id, company_id, lease_id, payment_due_date, payment_amount, late_fee_amount,
          late_fee_percentage, grace_period_days, is_recurring, payment_method,
          auto_debit_enabled, recurring_start_date, recurring_end_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.leaseId, data.paymentDueDate || 1, data.paymentAmount,
         data.lateFeeAmount || 0, data.lateFeePercentage || 0, data.gracePeriodDays || 5,
         data.isRecurring ? 1 : 0, data.paymentMethod || 'bank_transfer',
         data.autoDebitEnabled ? 1 : 0, data.recurringStartDate || now,
         data.recurringEndDate || null, now]
      );

      return id;
    } catch (e) {
      console.error('[Lease Automation] createRentPaymentSchedule failed:', e);
      throw e;
    }
  },

  async getRentPaymentSchedules(companyId, leaseId) {
    try {
      const result = await powerSync.execute(
        `SELECT * FROM univ_re_rent_payment_schedules WHERE company_id = ? AND lease_id = ?`,
        [companyId, leaseId]
      );

      return result.rows._array || [];
    } catch (e) {
      console.error('[Lease Automation] getRentPaymentSchedules failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // RENT PAYMENT TRACKING
  // ────────────────────────────────────────────────────────

  async createRentPaymentEntry(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = new Date().toISOString();

      // Check if payment is late
      const paymentDueDate = new Date(data.paymentDueDate);
      const isLate = new Date(now) > paymentDueDate;

      // Calculate late fee if applicable
      let lateFeeCharged = 0;
      if (isLate && data.lateFeePercentage) {
        lateFeeCharged = data.amountDue * (data.lateFeePercentage / 100);
      } else if (isLate && data.lateFeeAmount) {
        lateFeeCharged = data.lateFeeAmount;
      }

      const status = data.amountPaid >= data.amountDue ? 'paid' : 
                     data.amountPaid > 0 ? 'partial' : 
                     isLate ? 'overdue' : 'pending';

      await powerSync.execute(
        `INSERT INTO univ_re_rent_payment_history 
         (id, company_id, lease_id, scheduled_payment_id, payment_due_date, amount_due,
          amount_paid, payment_method, payment_status, transaction_reference, 
          late_fee_charged, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.leaseId, data.scheduledPaymentId || null, data.paymentDueDate,
         data.amountDue, data.amountPaid || 0, data.paymentMethod || 'pending',
         status, data.transactionReference || null, lateFeeCharged,
         data.notes || null, now]
      );

      return id;
    } catch (e) {
      console.error('[Lease Automation] createRentPaymentEntry failed:', e);
      throw e;
    }
  },

  async getRentPaymentHistory(companyId, leaseId, limit = 12) {
    try {
      const result = await powerSync.execute(
        `SELECT * FROM univ_re_rent_payment_history 
         WHERE company_id = ? AND lease_id = ? 
         ORDER BY payment_due_date DESC LIMIT ?`,
        [companyId, leaseId, limit]
      );

      return result.rows._array || [];
    } catch (e) {
      console.error('[Lease Automation] getRentPaymentHistory failed:', e);
      throw e;
    }
  },

  async updateRentPaymentStatus(companyId, paymentId, newStatus, data = {}) {
    try {
      let updates = ['payment_status = ?'];
      let params = [newStatus];

      if (data.paymentDate) {
        updates.push('payment_date = ?');
        params.push(data.paymentDate);
      }
      if (data.amountPaid !== undefined) {
        updates.push('amount_paid = ?');
        params.push(data.amountPaid);
      }
      if (data.transactionReference) {
        updates.push('transaction_reference = ?');
        params.push(data.transactionReference);
      }

      params.push(companyId);
      params.push(paymentId);

      const query = `UPDATE univ_re_rent_payment_history SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;

      await powerSync.execute(query, params);
      return true;
    } catch (e) {
      console.error('[Lease Automation] updateRentPaymentStatus failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // LEASE RENEWAL MANAGEMENT
  // ────────────────────────────────────────────────────────

  async createLeaseRenewalOffer(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = new Date().toISOString();
      const responseDeadline = new Date();
      responseDeadline.setDate(responseDeadline.getDate() + (data.responseDeadlineDays || 30));

      // Calculate rent increase
      const currentLease = await powerSync.execute(
        `SELECT monthly_rent FROM univ_re_leases WHERE id = ?`,
        [data.leaseId]
      );

      const currentRent = currentLease.rows._array 
        ? currentLease.rows._array[0].monthly_rent 
        : 0;
      const newRent = data.newRentAmount || currentRent;
      const rentIncrease = ((newRent - currentRent) / currentRent * 100).toFixed(2);

      await powerSync.execute(
        `INSERT INTO univ_re_lease_renewals 
         (id, company_id, lease_id, renewal_status, renewal_offer_date, 
          response_deadline, new_rent_amount, rent_increase_percentage, 
          renewal_term_months, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.leaseId, 'offered', now, responseDeadline.toISOString(),
         newRent, rentIncrease, data.renewalTermMonths || 12, now, now]
      );

      return {
        renewalId: id,
        currentRent,
        newRent,
        rentIncrease,
        responseDeadline: responseDeadline.toISOString()
      };
    } catch (e) {
      console.error('[Lease Automation] createLeaseRenewalOffer failed:', e);
      throw e;
    }
  },

  async respondToRenewalOffer(companyId, renewalId, response, data = {}) {
    try {
      const now = new Date().toISOString();
      const updates = ['renewal_status = ?', 'tenant_response_date = ?'];
      const params = [response === 'accept' ? 'accepted' : 'declined', now];

      if (response === 'accept' && data.newLeaseId) {
        updates.push('renewal_lease_id = ?');
        params.push(data.newLeaseId);
      }

      params.push(companyId);
      params.push(renewalId);

      const query = `UPDATE univ_re_lease_renewals SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;

      await powerSync.execute(query, params);

      if (response === 'accept' && data.newLeaseId) {
        // Expire old lease and activate new one
        const renewal = await powerSync.execute(
          `SELECT lease_id FROM univ_re_lease_renewals WHERE id = ?`,
          [renewalId]
        );

        if (renewal.rows._array && renewal.rows._array.length > 0) {
          const oldLeaseId = renewal.rows._array[0].lease_id;
          const endDate = new Date().toISOString();

          await powerSync.execute(
            `UPDATE univ_re_leases SET status = ?, end_date = ? WHERE id = ?`,
            ['expired', endDate, oldLeaseId]
          );

          await powerSync.execute(
            `UPDATE univ_re_leases SET status = ? WHERE id = ?`,
            ['active', data.newLeaseId]
          );
        }
      }

      return true;
    } catch (e) {
      console.error('[Lease Automation] respondToRenewalOffer failed:', e);
      throw e;
    }
  },

  async getUpcomingLeaseRenewals(companyId, daysAhead = 90) {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysAhead);

      const result = await powerSync.execute(
        `SELECT lr.*, l.tenant_id, l.tenant_name, l.monthly_rent, l.end_date
         FROM univ_re_lease_renewals lr
         JOIN univ_re_leases l ON lr.lease_id = l.id
         WHERE lr.company_id = ? AND l.end_date <= ? AND l.status = 'active'
         ORDER BY l.end_date ASC`,
        [companyId, targetDate.toISOString()]
      );

      return result.rows._array || [];
    } catch (e) {
      console.error('[Lease Automation] getUpcomingLeaseRenewals failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // PAYMENT ANALYTICS
  // ────────────────────────────────────────────────────────

  async getRentPaymentAnalytics(companyId, leaseId, months = 12) {
    try {
      const history = await this.getRentPaymentHistory(companyId, leaseId, months);

      let totalDue = 0;
      let totalPaid = 0;
      let totalLatePayments = 0;
      let totalLateFees = 0;
      let overdueAmount = 0;

      history.forEach(payment => {
        totalDue += payment.amount_due || 0;
        totalPaid += payment.amount_paid || 0;
        totalLateFees += payment.late_fee_charged || 0;

        if (payment.payment_status === 'overdue') {
          totalLatePayments++;
          overdueAmount += (payment.amount_due - payment.amount_paid);
        }
      });

      const paymentRate = totalDue > 0 
        ? ((totalPaid / totalDue) * 100).toFixed(2)
        : 0;

      return {
        totalDue,
        totalPaid,
        totalLatePayments,
        totalLateFees,
        overdueAmount,
        paymentRate,
        averagePaymentAmount: history.length > 0 
          ? (totalPaid / history.length).toFixed(2)
          : 0,
        latestPaymentDate: history.length > 0 
          ? history[0].payment_date 
          : null
      };
    } catch (e) {
      console.error('[Lease Automation] getRentPaymentAnalytics failed:', e);
      throw e;
    }
  },

  async getCompanyRentPaymentStats(companyId, dateRange = {}) {
    try {
      let query = `SELECT 
                     COUNT(DISTINCT lease_id) as active_leases,
                     SUM(amount_due) as total_due,
                     SUM(amount_paid) as total_paid,
                     SUM(CASE WHEN payment_status = 'overdue' THEN (amount_due - amount_paid) ELSE 0 END) as total_overdue,
                     COUNT(CASE WHEN payment_status = 'overdue' THEN 1 END) as overdue_payments,
                     SUM(late_fee_charged) as total_late_fees
                   FROM univ_re_rent_payment_history
                   WHERE company_id = ?`;
      const params = [companyId];

      if (dateRange.startDate) {
        query += ' AND payment_due_date >= ?';
        params.push(dateRange.startDate);
      }
      if (dateRange.endDate) {
        query += ' AND payment_due_date <= ?';
        params.push(dateRange.endDate);
      }

      const result = await powerSync.execute(query, params);
      const stats = result.rows._array ? result.rows._array[0] : {};

      return {
        activeLeasesWithPayments: stats.active_leases || 0,
        totalRentDue: stats.total_due || 0,
        totalRentPaid: stats.total_paid || 0,
        totalOverdueAmount: stats.total_overdue || 0,
        overduePaymentsCount: stats.overdue_payments || 0,
        totalLateFees: stats.total_late_fees || 0,
        collectionRate: stats.total_due 
          ? ((stats.total_paid / stats.total_due) * 100).toFixed(2)
          : 0
      };
    } catch (e) {
      console.error('[Lease Automation] getCompanyRentPaymentStats failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // AUTOMATED REMINDERS & NOTIFICATIONS
  // ────────────────────────────────────────────────────────

  async getPaymentsRequiringReminders(companyId) {
    try {
      // Get payments that are due in next 7 days or overdue
      const upcomingDate = new Date();
      upcomingDate.setDate(upcomingDate.getDate() + 7);

      const result = await powerSync.execute(
        `SELECT rph.*, l.tenant_id, l.tenant_name, l.tenant_email, rps.payment_method
         FROM univ_re_rent_payment_history rph
         JOIN univ_re_leases l ON rph.lease_id = l.id
         JOIN univ_re_rent_payment_schedules rps ON rph.scheduled_payment_id = rps.id
         WHERE rph.company_id = ? 
         AND rph.payment_status IN ('pending', 'overdue')
         AND rph.payment_due_date <= ?
         ORDER BY rph.payment_due_date ASC`,
        [companyId, upcomingDate.toISOString()]
      );

      return result.rows._array || [];
    } catch (e) {
      console.error('[Lease Automation] getPaymentsRequiringReminders failed:', e);
      throw e;
    }
  },

  async getOverduePayments(companyId) {
    try {
      const result = await powerSync.execute(
        `SELECT rph.*, l.tenant_id, l.tenant_name, l.property_id, l.property_address
         FROM univ_re_rent_payment_history rph
         JOIN univ_re_leases l ON rph.lease_id = l.id
         WHERE rph.company_id = ? AND rph.payment_status = 'overdue'
         ORDER BY rph.payment_due_date ASC`,
        [companyId]
      );

      return result.rows._array || [];
    } catch (e) {
      console.error('[Lease Automation] getOverduePayments failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // AUTO-DEBIT MANAGEMENT
  // ────────────────────────────────────────────────────────

  async enableAutoDebit(companyId, scheduleId, bankDetails, userId) {
    try {
      // Encrypt bank details in production - using placeholder here
      const hashedDetails = Buffer.from(JSON.stringify(bankDetails)).toString('base64');

      await powerSync.execute(
        `UPDATE univ_re_rent_payment_schedules SET auto_debit_enabled = ? WHERE id = ? AND company_id = ?`,
        [1, scheduleId, companyId]
      );

      // TODO: Store encrypted bank details in separate secure table
      return true;
    } catch (e) {
      console.error('[Lease Automation] enableAutoDebit failed:', e);
      throw e;
    }
  },

  async disableAutoDebit(companyId, scheduleId) {
    try {
      await powerSync.execute(
        `UPDATE univ_re_rent_payment_schedules SET auto_debit_enabled = ? WHERE id = ? AND company_id = ?`,
        [0, scheduleId, companyId]
      );

      return true;
    } catch (e) {
      console.error('[Lease Automation] disableAutoDebit failed:', e);
      throw e;
    }
  }
};
