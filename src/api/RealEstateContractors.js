/**
 * RealEstateContractors.js
 * 
 * Contractor and vendor management, ratings, reviews, and maintenance coordination
 */

import { powerSync } from '@/api/PowerSyncConnector';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const RealEstateContractors = {
  // ────────────────────────────────────────────────────────
  // CONTRACTOR MANAGEMENT
  // ────────────────────────────────────────────────────────

  async createContractor(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = new Date().toISOString();

      await powerSync.execute(
        `INSERT INTO univ_re_contractors 
         (id, company_id, contractor_name, contractor_type, service_categories,
          business_license_number, business_license_expiration, insurance_type,
          insurance_expiration, is_licensed, is_insured, email, phone, website,
          address, city, state, zip_code, average_rating, total_reviews,
          total_jobs_completed, hourly_rate, is_verified, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.contractorName, data.contractorType,
         JSON.stringify(data.serviceCategories || []),
         data.businessLicenseNumber || null, data.businessLicenseExpiration || null,
         data.insuranceType || null, data.insuranceExpiration || null,
         data.isLicensed ? 1 : 0, data.isInsured ? 1 : 0, data.email, data.phone,
         data.website || null, data.address || null, data.city || null,
         data.state || null, data.zipCode || null, 0, 0, 0,
         data.hourlyRate || 0, 0, 1, now, now]
      );

      return id;
    } catch (e) {
      console.error('[Contractors] createContractor failed:', e);
      throw e;
    }
  },

  async getContractors(companyId, filters = {}) {
    try {
      let query = `SELECT * FROM univ_re_contractors WHERE company_id = ? AND is_active = ?`;
      const params = [companyId, 1];

      if (filters.contractorType) {
        query += ' AND contractor_type = ?';
        params.push(filters.contractorType);
      }
      if (filters.isVerified !== undefined) {
        query += ' AND is_verified = ?';
        params.push(filters.isVerified ? 1 : 0);
      }
      if (filters.minRating) {
        query += ' AND average_rating >= ?';
        params.push(filters.minRating);
      }

      query += ' ORDER BY average_rating DESC, total_reviews DESC';
      const result = await powerSync.execute(query, params);
      return result.rows._array || [];
    } catch (e) {
      console.error('[Contractors] getContractors failed:', e);
      throw e;
    }
  },

  async updateContractor(companyId, contractorId, data, userId) {
    try {
      const updates = [];
      const params = [];

      if (data.contractorName !== undefined) {
        updates.push('contractor_name = ?');
        params.push(data.contractorName);
      }
      if (data.email !== undefined) {
        updates.push('email = ?');
        params.push(data.email);
      }
      if (data.phone !== undefined) {
        updates.push('phone = ?');
        params.push(data.phone);
      }
      if (data.isLicensed !== undefined) {
        updates.push('is_licensed = ?');
        params.push(data.isLicensed ? 1 : 0);
      }
      if (data.isInsured !== undefined) {
        updates.push('is_insured = ?');
        params.push(data.isInsured ? 1 : 0);
      }
      if (data.hourlyRate !== undefined) {
        updates.push('hourly_rate = ?');
        params.push(data.hourlyRate);
      }

      if (updates.length === 0) return true;

      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(companyId);
      params.push(contractorId);

      const query = `UPDATE univ_re_contractors SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;

      await powerSync.execute(query, params);
      return true;
    } catch (e) {
      console.error('[Contractors] updateContractor failed:', e);
      throw e;
    }
  },

  async verifyContractor(companyId, contractorId, userId) {
    try {
      const now = new Date().toISOString();

      await powerSync.execute(
        `UPDATE univ_re_contractors SET is_verified = ?, verification_date = ?, verified_by = ? 
         WHERE id = ? AND company_id = ?`,
        [1, now, userId, contractorId, companyId]
      );

      return true;
    } catch (e) {
      console.error('[Contractors] verifyContractor failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // CONTRACTOR REVIEWS & RATINGS
  // ────────────────────────────────────────────────────────

  async submitContractorReview(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = new Date().toISOString();

      await powerSync.execute(
        `INSERT INTO univ_re_contractor_reviews 
         (id, company_id, contractor_id, reviewer_id, maintenance_request_id,
          rating, review_title, review_text, punctuality_rating, quality_rating,
          professionalism_rating, would_rehire, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.contractorId, userId, data.maintenanceRequestId || null,
         data.rating, data.reviewTitle || '', data.reviewText || '',
         data.punctualityRating || data.rating, data.qualityRating || data.rating,
         data.professionalismRating || data.rating, data.wouldRehire ? 1 : 0, now]
      );

      // Update contractor average rating
      await this.updateContractorRating(companyId, data.contractorId);

      return id;
    } catch (e) {
      console.error('[Contractors] submitContractorReview failed:', e);
      throw e;
    }
  },

  async updateContractorRating(companyId, contractorId) {
    try {
      // Get all reviews for contractor
      const result = await powerSync.execute(
        `SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews 
         FROM univ_re_contractor_reviews WHERE contractor_id = ? AND company_id = ?`,
        [contractorId, companyId]
      );

      if (result.rows._array && result.rows._array.length > 0) {
        const stats = result.rows._array[0];
        const avgRating = stats.avg_rating || 0;
        const totalReviews = stats.total_reviews || 0;

        await powerSync.execute(
          `UPDATE univ_re_contractors SET average_rating = ?, total_reviews = ? 
           WHERE id = ? AND company_id = ?`,
          [avgRating, totalReviews, contractorId, companyId]
        );
      }
    } catch (e) {
      console.warn('[Contractors] updateContractorRating failed:', e);
    }
  },

  async getContractorReviews(companyId, contractorId) {
    try {
      const result = await powerSync.execute(
        `SELECT * FROM univ_re_contractor_reviews WHERE company_id = ? AND contractor_id = ? 
         ORDER BY created_at DESC`,
        [companyId, contractorId]
      );

      return result.rows._array || [];
    } catch (e) {
      console.error('[Contractors] getContractorReviews failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // MAINTENANCE REQUESTS
  // ────────────────────────────────────────────────────────

  async createMaintenanceRequest(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = new Date().toISOString();

      await powerSync.execute(
        `INSERT INTO univ_re_maintenance_requests 
         (id, company_id, property_id, lease_id, tenant_id, request_type,
          service_category, description, priority_level, status, contractor_id,
          contractor_quote_amount, request_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.propertyId, data.leaseId || null, data.tenantId || null,
         data.requestType || 'repair', data.serviceCategory, data.description,
         data.priorityLevel || 'normal', 'open', data.contractorId || null,
         data.contractorQuoteAmount || 0, now, now, now]
      );

      return id;
    } catch (e) {
      console.error('[Contractors] createMaintenanceRequest failed:', e);
      throw e;
    }
  },

  async getMaintenanceRequests(companyId, filters = {}) {
    try {
      let query = `SELECT * FROM univ_re_maintenance_requests WHERE company_id = ?`;
      const params = [companyId];

      if (filters.propertyId) {
        query += ' AND property_id = ?';
        params.push(filters.propertyId);
      }
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      if (filters.priorityLevel) {
        query += ' AND priority_level = ?';
        params.push(filters.priorityLevel);
      }
      if (filters.contractorId) {
        query += ' AND contractor_id = ?';
        params.push(filters.contractorId);
      }

      query += ' ORDER BY request_date DESC';
      const result = await powerSync.execute(query, params);
      return result.rows._array || [];
    } catch (e) {
      console.error('[Contractors] getMaintenanceRequests failed:', e);
      throw e;
    }
  },

  async assignMaintenanceToContractor(companyId, maintenanceRequestId, contractorId, userId) {
    try {
      const now = new Date().toISOString();

      await powerSync.execute(
        `UPDATE univ_re_maintenance_requests SET contractor_id = ?, status = ?, updated_at = ? 
         WHERE id = ? AND company_id = ?`,
        [contractorId, 'assigned', now, maintenanceRequestId, companyId]
      );

      return true;
    } catch (e) {
      console.error('[Contractors] assignMaintenanceToContractor failed:', e);
      throw e;
    }
  },

  async updateMaintenanceStatus(companyId, maintenanceRequestId, newStatus, data = {}, userId) {
    try {
      const now = new Date().toISOString();

      let updates = ['status = ?', 'updated_at = ?'];
      let params = [newStatus, now];

      if (data.completionNotes) {
        updates.push('completion_notes = ?');
        params.push(data.completionNotes);
      }
      if (data.completionDate) {
        updates.push('completion_date = ?');
        params.push(data.completionDate);
      }
      if (data.actualAmount !== undefined) {
        updates.push('contractor_actual_amount = ?');
        params.push(data.actualAmount);
      }

      params.push(companyId);
      params.push(maintenanceRequestId);

      const query = `UPDATE univ_re_maintenance_requests SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;

      await powerSync.execute(query, params);

      // If marking as completed, update contractor job count
      if (newStatus === 'completed') {
        const mResult = await powerSync.execute(
          `SELECT contractor_id FROM univ_re_maintenance_requests WHERE id = ?`,
          [maintenanceRequestId]
        );

        if (mResult.rows._array && mResult.rows._array.length > 0) {
          const contractorId = mResult.rows._array[0].contractor_id;
          if (contractorId) {
            const countResult = await powerSync.execute(
              `SELECT COUNT(*) as completed_count FROM univ_re_maintenance_requests 
               WHERE contractor_id = ? AND status = ?`,
              [contractorId, 'completed']
            );

            if (countResult.rows._array && countResult.rows._array.length > 0) {
              const completedCount = countResult.rows._array[0].completed_count || 0;
              await powerSync.execute(
                `UPDATE univ_re_contractors SET total_jobs_completed = ? WHERE id = ?`,
                [completedCount, contractorId]
              );
            }
          }
        }
      }

      return true;
    } catch (e) {
      console.error('[Contractors] updateMaintenanceStatus failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // MAINTENANCE STATISTICS
  // ────────────────────────────────────────────────────────

  async getMaintenanceStats(companyId, dateRange = {}) {
    try {
      let query = `SELECT 
                     COUNT(*) as total_requests,
                     SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
                     SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
                     SUM(CASE WHEN priority_level = 'emergency' THEN 1 ELSE 0 END) as emergency_count,
                     AVG(CASE WHEN status = 'completed' THEN contractor_actual_amount ELSE NULL END) as avg_cost
                   FROM univ_re_maintenance_requests
                   WHERE company_id = ?`;
      const params = [companyId];

      if (dateRange.startDate) {
        query += ' AND request_date >= ?';
        params.push(dateRange.startDate);
      }
      if (dateRange.endDate) {
        query += ' AND request_date <= ?';
        params.push(dateRange.endDate);
      }

      const result = await powerSync.execute(query, params);
      
      if (result.rows._array && result.rows._array.length > 0) {
        const stats = result.rows._array[0];
        return {
          totalRequests: stats.total_requests || 0,
          completedCount: stats.completed_count || 0,
          openCount: stats.open_count || 0,
          emergencyCount: stats.emergency_count || 0,
          averageCost: stats.avg_cost || 0,
          completionRate: stats.total_requests 
            ? ((stats.completed_count || 0) / stats.total_requests * 100).toFixed(2)
            : 0
        };
      }

      return {
        totalRequests: 0,
        completedCount: 0,
        openCount: 0,
        emergencyCount: 0,
        averageCost: 0,
        completionRate: 0
      };
    } catch (e) {
      console.error('[Contractors] getMaintenanceStats failed:', e);
      throw e;
    }
  },

  async getContractorPerformance(companyId, contractorId) {
    try {
      // Get completion rate
      const result = await powerSync.execute(
        `SELECT 
           COUNT(*) as total_jobs,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
           AVG(contractor_actual_amount) as avg_job_cost,
           COUNT(DISTINCT property_id) as unique_properties
         FROM univ_re_maintenance_requests
         WHERE contractor_id = ? AND company_id = ?`,
        [contractorId, companyId]
      );

      const stats = result.rows._array ? result.rows._array[0] : {};
      
      // Get contractor data
      const contractorResult = await powerSync.execute(
        `SELECT * FROM univ_re_contractors WHERE id = ? AND company_id = ?`,
        [contractorId, companyId]
      );

      const contractor = contractorResult.rows._array 
        ? contractorResult.rows._array[0]
        : {};

      return {
        contractorName: contractor.contractor_name,
        averageRating: contractor.average_rating || 0,
        totalReviews: contractor.total_reviews || 0,
        totalJobs: stats.total_jobs || 0,
        completedJobs: stats.completed_jobs || 0,
        completionRate: stats.total_jobs 
          ? ((stats.completed_jobs || 0) / stats.total_jobs * 100).toFixed(2)
          : 0,
        averageJobCost: stats.avg_job_cost || 0,
        uniqueProperties: stats.unique_properties || 0
      };
    } catch (e) {
      console.error('[Contractors] getContractorPerformance failed:', e);
      throw e;
    }
  }
};
