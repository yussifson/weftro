/**
 * RealEstateAPI.js
 * 
 * Client-side API handlers for Real Estate vertical operations.
 * Handles CRUD operations for properties, clients, viewings, offers, transactions, leases, etc.
 */

import { powerSync } from '@/api/PowerSyncConnector';

// Generate UUIDs for Supabase compatibility
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Safe date formatting - handles invalid dates
function getSafeISO8601() {
  try {
    const date = new Date();
    if (isNaN(date.getTime())) {
      return new Date(Date.now()).toISOString();
    }
    return date.toISOString();
  } catch (e) {
    console.warn('[RE API] Date formatting error:', e);
    return new Date(Date.now()).toISOString();
  }
}

export const RealEstateAPI = {
  // ────────────────────────────────────────────────────────
  // PROPERTIES
  // ────────────────────────────────────────────────────────

  async getProperties(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_properties WHERE company_id = ?';
      const params = [companyId];

      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      if (filters.agentId) {
        query += ' AND agent_id = ?';
        params.push(filters.agentId);
      }
      if (filters.propertyType) {
        query += ' AND property_type = ?';
        params.push(filters.propertyType);
      }

      query += ' ORDER BY created_at DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getProperties failed:', e);
      throw e;
    }
  },

  async createProperty(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_properties (id, company_id, address, city, state, country, zip_code, property_type, 
         bedrooms, bathrooms, square_feet, lot_size, price, status, agent_id, agent_name, description, features, year_built, listing_date, last_updated, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.address, data.city, data.state, data.country, data.zipCode, data.propertyType, 
         data.bedrooms, data.bathrooms, data.squareFeet, data.lotSize, data.price, data.status || 'active', 
         data.agentId, data.agentName, data.description, JSON.stringify(data.features || []), data.yearBuilt, now, now, now]
      );

      // Log to audit trail
      powerSync.execute(
        'INSERT INTO audit_logs (id, user_id, action, record_type, record_id, changes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), userId, 'create', 'property', id, JSON.stringify(data), now]
      ).catch(e => console.warn('Audit log error:', e));
      return id;
    } catch (e) {
      console.error('[RE API] createProperty failed:', e);
      throw e;
    }
  },

  async updateProperty(companyId, propertyId, data, userId) {
    try {
      const updates = [];
      const params = [];

      const toSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      Object.keys(data).forEach(key => {
        const dbKey = toSnakeCase(key);
        if (dbKey !== 'id' && dbKey !== 'company_id' && dbKey !== 'created_at' && data[key] !== undefined) {
          updates.push(`${dbKey} = ?`);
          params.push(typeof data[key] === 'object' && data[key] !== null ? JSON.stringify(data[key]) : data[key]);
        }
      });

      updates.push('last_updated = ?');
      params.push(getSafeISO8601());
      params.push(companyId);
      params.push(propertyId);

      const query = `UPDATE univ_re_properties SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;
      
      await powerSync.execute(query, params);
      // Audit logged inline during property update
    } catch (e) {
      console.error('[RE API] updateProperty failed:', e);
      throw e;
    }
  },

  async deleteProperty(companyId, propertyId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_properties WHERE company_id = ? AND id = ?',
        [companyId, propertyId]
      );
    } catch (e) {
      console.error('[RE API] deleteProperty failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // CLIENTS (Buyers/Sellers/Tenants)
  // ────────────────────────────────────────────────────────

  async getClients(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_clients WHERE company_id = ?';
      const params = [companyId];

      if (filters.type) {
        query += ' AND type = ?';
        params.push(filters.type);
      }
      if (filters.agentId) {
        query += ' AND assigned_agent = ?';
        params.push(filters.agentId);
      }
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY created_at DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getClients failed:', e);
      throw e;
    }
  },

  async createClient(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_clients (id, company_id, name, email, phone, type, address, city, state, 
         country, budget, preferences, status, assigned_agent, notes, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.name, data.email, data.phone, data.type, data.address, data.city, 
         data.state, data.country, data.budget, JSON.stringify(data.preferences || []), 
         'active', data.assignedAgent, data.notes, now]
      );
      // Audit logged inline during client creation
      return id;
    } catch (e) {
      console.error('[RE API] createClient failed:', e);
      throw e;
    }
  },

  async updateClient(companyId, clientId, data, userId) {
    try {
      const updates = [];
      const params = [];

      const toSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      Object.keys(data).forEach(key => {
        const dbKey = toSnakeCase(key);
        if (dbKey !== 'id' && dbKey !== 'company_id' && dbKey !== 'created_at' && data[key] !== undefined) {
          updates.push(`${dbKey} = ?`);
          params.push(typeof data[key] === 'object' && data[key] !== null ? JSON.stringify(data[key]) : data[key]);
        }
      });

      params.push(companyId);
      params.push(clientId);

      const query = `UPDATE univ_re_clients SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;
      
      await powerSync.execute(query, params);
    } catch (e) {
      console.error('[RE API] updateClient failed:', e);
      throw e;
    }
  },

  async deleteClient(companyId, clientId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_clients WHERE company_id = ? AND id = ?',
        [companyId, clientId]
      );
    } catch (e) {
      console.error('[RE API] deleteClient failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // VIEWINGS
  // ────────────────────────────────────────────────────────

  async getViewings(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_viewings WHERE company_id = ?';
      const params = [companyId];

      if (filters.propertyId) {
        query += ' AND property_id = ?';
        params.push(filters.propertyId);
      }
      if (filters.clientId) {
        query += ' AND client_id = ?';
        params.push(filters.clientId);
      }
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY viewing_date ASC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getViewings failed:', e);
      throw e;
    }
  },

  async createViewing(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_viewings (id, company_id, property_id, property_address, client_id, client_name, 
         agent_id, agent_name, viewing_date, viewing_time, status, duration_minutes, feedback, notes, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.propertyId, data.propertyAddress, data.clientId, data.clientName, 
         data.agentId, data.agentName, data.viewingDate, data.viewingTime, 'scheduled', 
         data.durationMinutes || 30, data.feedback, data.notes, now]
      );
      
      // Audit logged inline during viewing creation
      return id;
    } catch (e) {
      console.error('[RE API] createViewing failed:', e);
      throw e;
    }
  },

  async updateViewing(companyId, viewingId, data, userId) {
    try {
      const updates = [];
      const params = [];

      const toSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      Object.keys(data).forEach(key => {
        const dbKey = toSnakeCase(key);
        if (dbKey !== 'id' && dbKey !== 'company_id' && dbKey !== 'created_at' && data[key] !== undefined) {
          updates.push(`${dbKey} = ?`);
          params.push(typeof data[key] === 'object' && data[key] !== null ? JSON.stringify(data[key]) : data[key]);
        }
      });

      params.push(companyId);
      params.push(viewingId);

      const query = `UPDATE univ_re_viewings SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;
      
      await powerSync.execute(query, params);
    } catch (e) {
      console.error('[RE API] updateViewing failed:', e);
      throw e;
    }
  },

  async deleteViewing(companyId, viewingId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_viewings WHERE company_id = ? AND id = ?',
        [companyId, viewingId]
      );
    } catch (e) {
      console.error('[RE API] deleteViewing failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // OFFERS
  // ────────────────────────────────────────────────────────

  async getOffers(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_offers WHERE company_id = ?';
      const params = [companyId];

      if (filters.propertyId) {
        query += ' AND property_id = ?';
        params.push(filters.propertyId);
      }
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY offer_date DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getOffers failed:', e);
      throw e;
    }
  },

  async createOffer(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_offers (id, company_id, property_id, property_address, buyer_id, buyer_name, 
         offer_amount, earnest_money, contingencies, offer_date, expiration_date, status, agent_id, agent_name, notes, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.propertyId, data.propertyAddress, data.buyerId, data.buyerName, 
         data.offerAmount, data.earnestMoney, JSON.stringify(data.contingencies || []), 
         now, data.expirationDate, 'pending', data.agentId, data.agentName, data.notes, now]
      );
      // Audit logged inline during offer creation
      return id;
    } catch (e) {
      console.error('[RE API] createOffer failed:', e);
      throw e;
    }
  },

  async updateOffer(companyId, offerId, data, userId) {
    try {
      const updates = [];
      const params = [];

      const toSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      Object.keys(data).forEach(key => {
        const dbKey = toSnakeCase(key);
        if (dbKey !== 'id' && dbKey !== 'company_id' && dbKey !== 'created_at' && data[key] !== undefined) {
          updates.push(`${dbKey} = ?`);
          params.push(typeof data[key] === 'object' && data[key] !== null ? JSON.stringify(data[key]) : data[key]);
        }
      });

      params.push(companyId);
      params.push(offerId);

      const query = `UPDATE univ_re_offers SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;
      
      await powerSync.execute(query, params);
    } catch (e) {
      console.error('[RE API] updateOffer failed:', e);
      throw e;
    }
  },

  async deleteOffer(companyId, offerId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_offers WHERE company_id = ? AND id = ?',
        [companyId, offerId]
      );
    } catch (e) {
      console.error('[RE API] deleteOffer failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // TRANSACTIONS
  // ────────────────────────────────────────────────────────

  async getTransactions(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_transactions WHERE company_id = ?';
      const params = [companyId];

      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY closing_date DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getTransactions failed:', e);
      throw e;
    }
  },

  async createTransaction(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

  await powerSync.execute(
  `INSERT INTO univ_re_transactions (id, company_id, property_id, property_address, seller_id, seller_name,
  buyer_id, buyer_name, sale_price, closing_date, status, agent_id, agent_name, documents, notes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [id, companyId, data.propertyId, data.propertyAddress, data.sellerId, data.sellerName,
  data.buyerId, data.buyerName, data.salePrice, data.closingDate, data.status || 'offer_accepted',
  data.agentId, data.agentName, JSON.stringify(data.documents || []), data.notes, now]
  );
      // Audit logged inline during transaction creation
      return id;
    } catch (e) {
      console.error('[RE API] createTransaction failed:', e);
      throw e;
    }
  },

  async updateTransaction(companyId, transactionId, data, userId) {
    try {
      const updates = [];
      const params = [];

      const toSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      Object.keys(data).forEach(key => {
        const dbKey = toSnakeCase(key);
        if (dbKey !== 'id' && dbKey !== 'company_id' && dbKey !== 'created_at' && data[key] !== undefined) {
          updates.push(`${dbKey} = ?`);
          params.push(typeof data[key] === 'object' && data[key] !== null ? JSON.stringify(data[key]) : data[key]);
        }
      });

      params.push(companyId);
      params.push(transactionId);

      const query = `UPDATE univ_re_transactions SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;
      
      await powerSync.execute(query, params);
    } catch (e) {
      console.error('[RE API] updateTransaction failed:', e);
      throw e;
    }
  },

  async deleteTransaction(companyId, transactionId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_transactions WHERE company_id = ? AND id = ?',
        [companyId, transactionId]
      );
    } catch (e) {
      console.error('[RE API] deleteTransaction failed:', e);
      throw e;
    }
  },

  // ──────────────���───────���������������─────────────────────────────────
  // LEASES
  // ────────────────────────────────────────────────────────

  async getLeases(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_leases WHERE company_id = ?';
      const params = [companyId];

      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY start_date DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getLeases failed:', e);
      throw e;
    }
  },

  async createLease(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_leases (id, company_id, property_id, property_address, tenant_id, tenant_name, 
         landlord_id, landlord_name, start_date, end_date, monthly_rent, security_deposit, status, terms, agent_id, agent_name, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.propertyId, data.propertyAddress, data.tenantId, data.tenantName, 
         data.landlordId, data.landlordName, data.startDate, data.endDate, data.monthlyRent, 
         data.securityDeposit, 'active', JSON.stringify(data.terms || []), data.agentId, data.agentName, now]
      );
      // Audit logged inline during lease creation
      return id;
    } catch (e) {
      console.error('[RE API] createLease failed:', e);
      throw e;
    }
  },

  async updateLease(companyId, leaseId, data, userId) {
    try {
      const updates = [];
      const params = [];

      const toSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      Object.keys(data).forEach(key => {
        const dbKey = toSnakeCase(key);
        if (dbKey !== 'id' && dbKey !== 'company_id' && dbKey !== 'created_at' && data[key] !== undefined) {
          updates.push(`${dbKey} = ?`);
          params.push(typeof data[key] === 'object' && data[key] !== null ? JSON.stringify(data[key]) : data[key]);
        }
      });

      updates.push('updated_at = ?');
      params.push(getSafeISO8601());
      params.push(companyId);
      params.push(leaseId);

      const query = `UPDATE univ_re_leases SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;
      
      await powerSync.execute(query, params);
    } catch (e) {
      console.error('[RE API] updateLease failed:', e);
      throw e;
    }
  },

  async deleteLease(companyId, leaseId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_leases WHERE company_id = ? AND id = ?',
        [companyId, leaseId]
      );
    } catch (e) {
      console.error('[RE API] deleteLease failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // RENT PAYMENTS
  // ────────────────────────────────────────────────────────

  async getRentPayments(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_rent_payments WHERE company_id = ?';
      const params = [companyId];

      if (filters.leaseId) {
        query += ' AND lease_id = ?';
        params.push(filters.leaseId);
      }
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY due_date ASC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getRentPayments failed:', e);
      throw e;
    }
  },

  async recordRentPayment(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_rent_payments (id, company_id, lease_id, property_id, tenant_id, tenant_name, 
         amount, due_date, payment_date, payment_method, status, notes, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.leaseId, data.propertyId, data.tenantId, data.tenantName, 
         data.amount, data.dueDate, now, data.paymentMethod, 'paid', data.notes, now]
      );
      // Audit logged inline during rent payment creation
      return id;
    } catch (e) {
      console.error('[RE API] recordRentPayment failed:', e);
      throw e;
    }
  },

  async updateRentPayment(companyId, paymentId, data, userId) {
    try {
      const updates = [];
      const params = [];

      const toSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      Object.keys(data).forEach(key => {
        const dbKey = toSnakeCase(key);
        if (dbKey !== 'id' && dbKey !== 'company_id' && dbKey !== 'created_at' && data[key] !== undefined) {
          updates.push(`${dbKey} = ?`);
          params.push(typeof data[key] === 'object' && data[key] !== null ? JSON.stringify(data[key]) : data[key]);
        }
      });

      params.push(companyId);
      params.push(paymentId);

      const query = `UPDATE univ_re_rent_payments SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;
      
      await powerSync.execute(query, params);
    } catch (e) {
      console.error('[RE API] updateRentPayment failed:', e);
      throw e;
    }
  },

  async deleteRentPayment(companyId, paymentId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_rent_payments WHERE company_id = ? AND id = ?',
        [companyId, paymentId]
      );
    } catch (e) {
      console.error('[RE API] deleteRentPayment failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // MAINTENANCE REQUESTS
  // ────��───────────────────────────────────────────────────

  async getMaintenanceRequests(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_maintenance_requests WHERE company_id = ?';
      const params = [companyId];

      if (filters.propertyId) {
        query += ' AND property_id = ?';
        params.push(filters.propertyId);
      }
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY created_at DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getMaintenanceRequests failed:', e);
      throw e;
    }
  },

  async createMaintenanceRequest(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_maintenance_requests (id, company_id, property_id, property_address, reported_by, 
         reported_by_name, issue_description, priority, status, assigned_to, completion_date, cost, notes, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.propertyId, data.propertyAddress, data.reportedBy, data.reportedByName, 
         data.issueDescription, data.priority || 'normal', 'open', data.assignedTo, null, data.cost || 0, data.notes, now]
      );
      // Audit logged inline during maintenance request creation
      return id;
    } catch (e) {
      console.error('[RE API] createMaintenanceRequest failed:', e);
      throw e;
    }
  },

  async updateMaintenanceRequest(companyId, requestId, data, userId) {
    try {
      const updates = [];
      const params = [];

      const toSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      Object.keys(data).forEach(key => {
        const dbKey = toSnakeCase(key);
        if (dbKey !== 'id' && dbKey !== 'company_id' && dbKey !== 'created_at' && data[key] !== undefined) {
          updates.push(`${dbKey} = ?`);
          params.push(typeof data[key] === 'object' && data[key] !== null ? JSON.stringify(data[key]) : data[key]);
        }
      });

      params.push(companyId);
      params.push(requestId);

      const query = `UPDATE univ_re_maintenance_requests SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;
      
      await powerSync.execute(query, params);
    } catch (e) {
      console.error('[RE API] updateMaintenanceRequest failed:', e);
      throw e;
    }
  },

  async deleteMaintenanceRequest(companyId, requestId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_maintenance_requests WHERE company_id = ? AND id = ?',
        [companyId, requestId]
      );
    } catch (e) {
      console.error('[RE API] deleteMaintenanceRequest failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // TEAM MANAGEMENT
  // ────────────────────────────────────────────────────────

  async createTeamMember(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();
      
      await powerSync.execute(
        `INSERT INTO univ_re_team_members (id, company_id, user_id, name, email, phone, role, status, 
         avatar_url, bio, license_number, license_expiry, commission_rate, join_date, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.userId || null, data.name, data.email, data.phone || null, 
         data.role || 'agent', 'active', data.avatarUrl || null, data.bio || null, 
         data.licenseNumber || null, data.licenseExpiry || null, data.commissionRate || 0, 
         data.joinDate || getSafeISO8601().split('T')[0], now, now]
      );
      return id;
    } catch (e) {
      console.error('[RE API] createTeamMember failed:', e);
      throw e;
    }
  },

  async getTeamMembers(companyId) {
    try {
      const res = await powerSync.execute(
        'SELECT * FROM univ_re_team_members WHERE company_id = ? AND status != ? ORDER BY join_date DESC',
        [companyId, 'deleted']
      );
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getTeamMembers failed:', e);
      throw e;
    }
  },

  async updateTeamMember(companyId, memberId, data, userId) {
    try {
      const updates = [];
      const params = [];
      
      Object.keys(data).forEach(key => {
        if (!['id', 'company_id', 'created_at'].includes(key)) {
          updates.push(`${key} = ?`);
          params.push(data[key]);
        }
      });
      
      params.push(getSafeISO8601());
      params.push(companyId);
      params.push(memberId);
      
      const query = `UPDATE univ_re_team_members SET ${updates.join(', ')}, updated_at = ? 
                     WHERE company_id = ? AND id = ?`;
      await powerSync.execute(query, params);
    } catch (e) {
      console.error('[RE API] updateTeamMember failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // MARKET INTELLIGENCE
  // ────────────────────────────────────────────────────────

  async createMLSListing(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();
      
      await powerSync.execute(
        `INSERT INTO univ_re_mls_listings (id, company_id, mls_id, property_address, city, state, zip_code,
         price, list_date, sold_date, days_on_market, bedrooms, bathrooms, square_feet, lot_size,
         property_type, status, agent_name, brokerage, description, source, last_updated, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.mlsId, data.address, data.city, data.state, data.zipCode,
         data.price, data.listDate, data.soldDate || null, data.daysOnMarket || 0,
         data.bedrooms, data.bathrooms, data.squareFeet, data.lotSize,
         data.propertyType, data.status || 'active', data.agentName, data.brokerage,
         data.description, 'mls', now, now]
      );
      return id;
    } catch (e) {
      console.error('[RE API] createMLSListing failed:', e);
      throw e;
    }
  },

  async getComparableAnalysis(companyId, filters = {}) {
    try {
      let query = `SELECT * FROM univ_re_comparable_analysis WHERE company_id = ?`;
      const params = [companyId];
      
      if (filters.propertyId) {
        query += ' AND property_id = ?';
        params.push(filters.propertyId);
      }
      
      const res = await powerSync.execute(query + ' ORDER BY analysis_date DESC', params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getComparableAnalysis failed:', e);
      throw e;
    }
  },

  async createComparableAnalysis(companyId, data, userId) {
    try {
      const id = generateUUID();
      
      await powerSync.execute(
        `INSERT INTO univ_re_comparable_analysis (id, company_id, property_id, analysis_date, subject_address,
         subject_price, comparable_1_address, comparable_1_price, comparable_1_adjustment,
         comparable_2_address, comparable_2_price, comparable_2_adjustment,
         comparable_3_address, comparable_3_price, comparable_3_adjustment,
         estimated_value, confidence_level, notes, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.propertyId || null, data.analysisDate || getSafeISO8601().split('T')[0],
         data.subjectAddress, data.subjectPrice, data.comp1Address, data.comp1Price, data.comp1Adjustment,
         data.comp2Address, data.comp2Price, data.comp2Adjustment,
         data.comp3Address, data.comp3Price, data.comp3Adjustment,
         data.estimatedValue, data.confidenceLevel || 80, data.notes, userId, getSafeISO8601()]
      );
      return id;
    } catch (e) {
      console.error('[RE API] createComparableAnalysis failed:', e);
      throw e;
    }
  },

  async getMarketTrends(companyId, filters = {}) {
    try {
      let query = `SELECT * FROM univ_re_market_trends WHERE company_id = ?`;
      const params = [companyId];
      
      if (filters.city) {
        query += ' AND city = ?';
        params.push(filters.city);
      }
      if (filters.state) {
        query += ' AND state = ?';
        params.push(filters.state);
      }
      
      const res = await powerSync.execute(query + ' ORDER BY metric_date DESC', params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getMarketTrends failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // CRM LEAD MANAGEMENT
  // ──────────────────────────────────────────────��─────────

  async createLead(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();
      
      await powerSync.execute(
        `INSERT INTO univ_re_leads (id, company_id, first_name, last_name, email, phone, source,
         property_interest, budget_min, budget_max, lead_type, status, stage, assigned_agent_id,
         lead_score, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.firstName, data.lastName, data.email || null, data.phone || null,
         data.source || 'website', data.propertyInterest || null, data.budgetMin || null,
         data.budgetMax || null, data.leadType || 'buyer', 'new', 'awareness',
         data.assignedAgentId || null, 0, data.notes || null, now, now]
      );
      return id;
    } catch (e) {
      console.error('[RE API] createLead failed:', e);
      throw e;
    }
  },

  async getLeads(companyId, filters = {}) {
    try {
      let query = `SELECT * FROM univ_re_leads WHERE company_id = ? AND status != ?`;
      const params = [companyId, 'deleted'];
      
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      if (filters.leadType) {
        query += ' AND lead_type = ?';
        params.push(filters.leadType);
      }
      if (filters.assignedAgentId) {
        query += ' AND assigned_agent_id = ?';
        params.push(filters.assignedAgentId);
      }
      
      const res = await powerSync.execute(query + ' ORDER BY lead_score DESC, next_followup ASC', params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getLeads failed:', e);
      throw e;
    }
  },

  async updateLead(companyId, leadId, data, userId) {
    try {
      const updates = [];
      const params = [];
      
      Object.keys(data).forEach(key => {
        if (!['id', 'company_id', 'created_at'].includes(key)) {
          updates.push(`${key} = ?`);
          params.push(data[key]);
        }
      });
      
      params.push(getSafeISO8601());
      params.push(companyId);
      params.push(leadId);
      
      const query = `UPDATE univ_re_leads SET ${updates.join(', ')}, updated_at = ? 
                     WHERE company_id = ? AND id = ?`;
      await powerSync.execute(query, params);
    } catch (e) {
      console.error('[RE API] updateLead failed:', e);
      throw e;
    }
  },

  async createLeadActivity(companyId, leadId, data, userId) {
    try {
      const id = generateUUID();
      
      await powerSync.execute(
        `INSERT INTO univ_re_lead_activities (id, company_id, lead_id, activity_type, subject,
         description, duration_minutes, outcome, next_action, agent_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, leadId, data.activityType, data.subject || null,
         data.description || null, data.durationMinutes || null, data.outcome || null,
         data.nextAction || null, userId, getSafeISO8601()]
      );
      return id;
    } catch (e) {
      console.error('[RE API] createLeadActivity failed:', e);
      throw e;
    }
  },

  async getLeadActivities(companyId, leadId) {
    try {
      const res = await powerSync.execute(
        `SELECT * FROM univ_re_lead_activities WHERE company_id = ? AND lead_id = ? ORDER BY created_at DESC`,
        [companyId, leadId]
      );
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getLeadActivities failed:', e);
      throw e;
    }
  },

  async getLeadCampaigns(companyId, filters = {}) {
    try {
      let query = `SELECT * FROM univ_re_lead_campaigns WHERE company_id = ?`;
      const params = [companyId];
      
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      
      const res = await powerSync.execute(query + ' ORDER BY created_at DESC', params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getLeadCampaigns failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // COMMISSION RULES
  // ────────────────────────────────────────────────────────

  async getCommissionRules(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_commission_rules WHERE company_id = ?';
      const params = [companyId];

      if (filters.ruleType) {
        query += ' AND rule_type = ?';
        params.push(filters.ruleType);
      }
      if (filters.isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.isActive);
      }

      query += ' ORDER BY created_at DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getCommissionRules failed:', e);
      throw e;
    }
  },

  async createCommissionRule(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_commission_rules (id, company_id, rule_name, rule_type, commission_percentage, 
         flat_fee, property_types, price_range_min, price_range_max, description, is_active, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.ruleName, data.ruleType, data.commissionPercentage || 0, 
         data.flatFee || 0, data.propertyTypes, data.priceRangeMin || 0, data.priceRangeMax || 0, 
         data.description || '', data.isActive !== false, now, now]
      );

      // Audit logged inline during commission rule creation
      powerSync.execute(
        'INSERT INTO audit_logs (id, user_id, action, record_type, record_id, changes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), userId, 'create', 'commission_rule', id, JSON.stringify(data), now]
      ).catch(e => console.warn('Audit log error:', e));

      return id;
    } catch (e) {
      console.error('[RE API] createCommissionRule failed:', e);
      throw e;
    }
  },

  async updateCommissionRule(companyId, ruleId, data, userId) {
    try {
      const updates = [];
      const params = [];

      const toSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      Object.keys(data).forEach(key => {
        const dbKey = toSnakeCase(key);
        if (dbKey !== 'id' && dbKey !== 'company_id' && dbKey !== 'created_at' && data[key] !== undefined) {
          updates.push(`${dbKey} = ?`);
          params.push(typeof data[key] === 'object' && data[key] !== null ? JSON.stringify(data[key]) : data[key]);
        }
      });

      updates.push('updated_at = ?');
      params.push(getSafeISO8601());
      params.push(companyId);
      params.push(ruleId);

      const query = `UPDATE univ_re_commission_rules SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;
      
      await powerSync.execute(query, params);
    } catch (e) {
      console.error('[RE API] updateCommissionRule failed:', e);
      throw e;
    }
  },

  async deleteCommissionRule(companyId, ruleId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_commission_rules WHERE company_id = ? AND id = ?',
        [companyId, ruleId]
      );
    } catch (e) {
      console.error('[RE API] deleteCommissionRule failed:', e);
      throw e;
    }
  },

  // ───────────────────────────────��────────────────────────
  // TRUST ACCOUNTING
  // ─────────────────────────────────────────────��──────────

  async getTrustAccounts(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_trust_accounts WHERE company_id = ?';
      const params = [companyId];

      if (filters.accountType) {
        query += ' AND account_type = ?';
        params.push(filters.accountType);
      }

      query += ' ORDER BY created_at DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getTrustAccounts failed:', e);
      throw e;
    }
  },

  async createTrustAccount(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_trust_accounts (id, company_id, account_name, account_type, bank_name, 
         account_number, balance, reconciliation_status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.accountName, data.accountType, data.bankName, data.accountNumber, 
         0, 'unreconciled', now, now]
      );
      return id;
    } catch (e) {
      console.error('[RE API] createTrustAccount failed:', e);
      throw e;
    }
  },

  async updateTrustAccount(companyId, accountId, data, userId) {
    try {
      const updates = [];
      const params = [];

      const dbData = {
        account_name: data.accountName,
        account_type: data.accountType,
        bank_name: data.bankName,
        account_number: data.accountNumber,
      };

      Object.keys(dbData).forEach(key => {
        if (dbData[key] !== undefined) {
          updates.push(`${key} = ?`);
          params.push(dbData[key]);
        }
      });

      updates.push('updated_at = ?');
      params.push(getSafeISO8601());
      params.push(companyId);
      params.push(accountId);

      const query = `UPDATE univ_re_trust_accounts SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;
      
      await powerSync.execute(query, params);
    } catch (e) {
      console.error('[RE API] updateTrustAccount failed:', e);
      throw e;
    }
  },

  async deleteTrustAccount(companyId, accountId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_trust_accounts WHERE company_id = ? AND id = ?',
        [companyId, accountId]
      );
    } catch (e) {
      console.error('[RE API] deleteTrustAccount failed:', e);
      throw e;
    }
  },

  async getTrustLedger(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_trust_ledger WHERE company_id = ?';
      const params = [companyId];

      if (filters.accountId) {
        query += ' AND account_id = ?';
        params.push(filters.accountId);
      }
      if (filters.transactionType) {
        query += ' AND transaction_type = ?';
        params.push(filters.transactionType);
      }

      query += ' ORDER BY transaction_date DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getTrustLedger failed:', e);
      throw e;
    }
  },

  async createTrustLedgerEntry(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_trust_ledger (id, company_id, trust_account_id, transaction_type, amount, 
         description, reference_number, transaction_date, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.accountId, data.transactionType, data.amount, data.description, 
         data.referenceNumber, data.transactionDate, now]
      );

      // Update account balance
      const balanceAdjustment = data.transactionType === 'deposit' || data.transactionType === 'transfer' 
        ? data.amount 
        : -data.amount;
      
      await powerSync.execute(
        'UPDATE univ_re_trust_accounts SET balance = balance + ? WHERE id = ?',
        [balanceAdjustment, data.accountId]
      );

      powerSync.execute(
        'INSERT INTO audit_logs (id, user_id, action, record_type, record_id, changes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), userId, 'create', 'trust_ledger', id, JSON.stringify(data), now]
      ).catch(e => console.warn('Audit log error:', e));

      return id;
    } catch (e) {
      console.error('[RE API] createTrustLedgerEntry failed:', e);
      throw e;
    }
  },

  async updateTrustLedgerEntry(companyId, entryId, data, userId) {
    try {
      const updates = [];
      const params = [];

      const toSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      Object.keys(data).forEach(key => {
        const dbKey = toSnakeCase(key);
        if (dbKey !== 'id' && dbKey !== 'company_id' && dbKey !== 'created_at' && data[key] !== undefined) {
          updates.push(`${dbKey} = ?`);
          params.push(typeof data[key] === 'object' && data[key] !== null ? JSON.stringify(data[key]) : data[key]);
        }
      });

      params.push(companyId);
      params.push(entryId);

      const query = `UPDATE univ_re_trust_ledger SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;
      
      await powerSync.execute(query, params);
    } catch (e) {
      console.error('[RE API] updateTrustLedgerEntry failed:', e);
      throw e;
    }
  },

  async deleteTrustLedgerEntry(companyId, entryId, userId) {
    try {
      // Get entry to adjust account balance
      const res = await powerSync.execute(
        'SELECT * FROM univ_re_trust_ledger WHERE company_id = ? AND id = ?',
        [companyId, entryId]
      );
      const entry = res.rows._array?.[0] || Array.from(res.rows)[0];
      if (entry) {
        const adjustment = entry.transaction_type === 'deposit' || entry.transaction_type === 'transfer'
          ? -Number(entry.amount || 0)
          : Number(entry.amount || 0);

        if (entry.account_id || entry.trust_account_id) {
          const accId = entry.account_id || entry.trust_account_id;
          await powerSync.execute(
            'UPDATE univ_re_trust_accounts SET balance = balance + ? WHERE id = ?',
            [adjustment, accId]
          );
        }
      }

      await powerSync.execute(
        'DELETE FROM univ_re_trust_ledger WHERE company_id = ? AND id = ?',
        [companyId, entryId]
      );
    } catch (e) {
      console.error('[RE API] deleteTrustLedgerEntry failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // DOCUMENT TEMPLATES
  // ────────────────────────────────────────────────────────

  async getDocumentTemplates(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_document_templates WHERE company_id = ?';
      const params = [companyId];

      if (filters.documentType) {
        query += ' AND document_type = ?';
        params.push(filters.documentType);
      }
      if (filters.category) {
        query += ' AND document_category = ?';
        params.push(filters.category);
      }
      if (filters.isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.isActive);
      }

      query += ' ORDER BY created_at DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getDocumentTemplates failed:', e);
      throw e;
    }
  },

  async createDocumentTemplate(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_document_templates (id, company_id, template_name, document_type, document_category, 
         required_signatures, version, template_content, description, is_active, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.templateName, data.documentType, data.documentCategory, 
         parseInt(data.requiredSignatures) || 0, parseInt(data.version) || 1, 
         data.content, data.description || '', data.isActive !== false, now, now]
      );

      powerSync.execute(
        'INSERT INTO audit_logs (id, user_id, action, record_type, record_id, changes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), userId, 'create', 'document_template', id, JSON.stringify(data), now]
      ).catch(e => console.warn('Audit log error:', e));

      return id;
    } catch (e) {
      console.error('[RE API] createDocumentTemplate failed:', e);
      throw e;
    }
  },

  async updateDocumentTemplate(companyId, templateId, data, userId) {
    try {
      const updates = [];
      const params = [];

      const toSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      Object.keys(data).forEach(key => {
        const dbKey = toSnakeCase(key);
        if (dbKey !== 'id' && dbKey !== 'company_id' && dbKey !== 'created_at' && data[key] !== undefined) {
          updates.push(`${dbKey} = ?`);
          
          let val = data[key];
          if (dbKey === 'version' || dbKey === 'required_signatures') {
             val = parseInt(val, 10) || 0;
          } else if (typeof val === 'object' && val !== null) {
             val = JSON.stringify(val);
          }
          
          params.push(val);
        }
      });

      updates.push('updated_at = ?');
      params.push(getSafeISO8601());
      params.push(companyId);
      params.push(templateId);

      const query = `UPDATE univ_re_document_templates SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;
      
      await powerSync.execute(query, params);
    } catch (e) {
      console.error('[RE API] updateDocumentTemplate failed:', e);
      throw e;
    }
  },

  async deleteDocumentTemplate(companyId, templateId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_document_templates WHERE company_id = ? AND id = ?',
        [companyId, templateId]
      );
    } catch (e) {
      console.error('[RE API] deleteDocumentTemplate failed:', e);
      throw e;
    }
  },

  // ─────────────────────────────��──────────────────────────
  // COUNTER OFFERS
  // ────────────────────────────────────────────────────────

  async getCounterOffers(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_counter_offers WHERE company_id = ?';
      const params = [companyId];

      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      if (filters.originalOfferId) {
        query += ' AND original_offer_id = ?';
        params.push(filters.originalOfferId);
      }

      query += ' ORDER BY created_at DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getCounterOffers failed:', e);
      throw e;
    }
  },

  async createCounterOffer(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_counter_offers (id, company_id, original_offer_id, counter_offer_by, counter_price, 
         earnest_money_change, contingencies, inspection_period_days, appraisal_contingency, 
         financing_contingency, additional_terms, counter_offer_status, closing_date, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.originalOfferId || '', userId, data.counterPrice || 0, data.earnestMoney || 0, 
         data.contingencies || '', data.inspectionPeriodDays || 0, data.appraisalContingency || false,
         data.financingContingency || false, data.notes || '', 
         data.status || 'pending', data.expirationDate || now, now, now]
      );

      powerSync.execute(
        'INSERT INTO audit_logs (id, user_id, action, record_type, record_id, changes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), userId, 'create', 'counter_offer', id, JSON.stringify(data), now]
      ).catch(e => console.warn('Audit log error:', e));

      return id;
    } catch (e) {
      console.error('[RE API] createCounterOffer failed:', e);
      throw e;
    }
  },

  async updateCounterOffer(companyId, offerId, data, userId) {
    try {
      const dbData = {
        original_offer_id: data.originalOfferId,
        counter_price: data.counterPrice,
        earnest_money_change: data.earnestMoney,
        contingencies: data.contingencies,
        additional_terms: data.notes,
        counter_offer_status: data.status,
        closing_date: data.expirationDate
      };

      const updates = [];
      const params = [];

      Object.keys(dbData).forEach(key => {
        if (dbData[key] !== undefined) {
          updates.push(`${key} = ?`);
          params.push(dbData[key]);
        }
      });

      updates.push('updated_at = ?');
      params.push(getSafeISO8601());
      params.push(companyId);
      params.push(offerId);

      const query = `UPDATE univ_re_counter_offers SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;
      
      await powerSync.execute(query, params);
    } catch (e) {
      console.error('[RE API] updateCounterOffer failed:', e);
      throw e;
    }
  },

  async deleteCounterOffer(companyId, offerId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_counter_offers WHERE company_id = ? AND id = ?',
        [companyId, offerId]
      );
    } catch (e) {
      console.error('[RE API] deleteCounterOffer failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // PAYMENT SCHEDULES
  // ────────────────────────────────────────────────────────

  async getPaymentSchedules(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_rent_payment_schedules WHERE company_id = ?';
      const params = [companyId];

      if (filters.leaseId) {
        query += ' AND lease_id = ?';
        params.push(filters.leaseId);
      }
      if (filters.autoDebitEnabled !== undefined) {
        query += ' AND auto_debit_enabled = ?';
        params.push(filters.autoDebitEnabled);
      }

      query += ' ORDER BY created_at DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getPaymentSchedules failed:', e);
      throw e;
    }
  },

  async createPaymentSchedule(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_rent_payment_schedules (id, company_id, lease_id, payment_due_date, payment_amount, 
         late_fee_amount, late_fee_percentage, grace_period_days, late_fee_type, is_recurring, payment_method, 
         auto_debit_enabled, recurring_start_date, recurring_end_date, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.leaseId, data.paymentDueDate, data.paymentAmount, data.lateFeeAmount || 0, 
         data.lateFeePercentage || 0, data.gracePeriodDays || 0, data.lateFeesType || '', data.isRecurring !== false, 
         data.paymentMethod, data.autoDebitEnabled !== false, data.recurringStartDate, data.recurringEndDate, now]
      );

      powerSync.execute(
        'INSERT INTO audit_logs (id, user_id, action, record_type, record_id, changes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), userId, 'create', 'payment_schedule', id, JSON.stringify(data), now]
      ).catch(e => console.warn('Audit log error:', e));

      return id;
    } catch (e) {
      console.error('[RE API] createPaymentSchedule failed:', e);
      throw e;
    }
  },

  async updatePaymentSchedule(companyId, scheduleId, data, userId) {
    try {
      const updates = [];
      const params = [];

      const toSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      Object.keys(data).forEach(key => {
        const dbKey = toSnakeCase(key);
        if (dbKey !== 'id' && dbKey !== 'company_id' && dbKey !== 'created_at' && data[key] !== undefined) {
          updates.push(`${dbKey} = ?`);
          params.push(typeof data[key] === 'object' && data[key] !== null ? JSON.stringify(data[key]) : data[key]);
        }
      });

      updates.push('updated_at = ?');
      params.push(getSafeISO8601());
      params.push(companyId);
      params.push(scheduleId);

      const query = `UPDATE univ_re_rent_payment_schedules SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;
      
      await powerSync.execute(query, params);
    } catch (e) {
      console.error('[RE API] updatePaymentSchedule failed:', e);
      throw e;
    }
  },

  async deletePaymentSchedule(companyId, scheduleId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_rent_payment_schedules WHERE company_id = ? AND id = ?',
        [companyId, scheduleId]
      );
    } catch (e) {
      console.error('[RE API] deletePaymentSchedule failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // E-SIGNATURES
  // ────────────────────────────────────────────────────────

  async getESignatures(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_e_signatures WHERE company_id = ?';
      const params = [companyId];

      if (filters.status) {
        query += ' AND signature_status = ?';
        params.push(filters.status);
      }
      if (filters.documentId) {
        query += ' AND document_id = ?';
        params.push(filters.documentId);
      }

      query += ' ORDER BY created_at DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getESignatures failed:', e);
      throw e;
    }
  },

  async createESignature(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_e_signatures (id, company_id, document_id, signer_id, document_name, signer_name, signer_email, 
         signing_order, expiration_date, require_initials, require_timestamp, signature_status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.documentId, generateUUID(), data.documentName, data.signerName, data.signerEmail, 
         data.signingOrder || 1, data.expirationDate, data.requireInitials !== false, 
         data.requireTimestamp !== false, 'pending', now, now]
      );

      powerSync.execute(
        'INSERT INTO audit_logs (id, user_id, action, record_type, record_id, changes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), userId, 'create', 'esignature', id, JSON.stringify(data), now]
      ).catch(e => console.warn('Audit log error:', e));

      return id;
    } catch (e) {
      console.error('[RE API] createESignature failed:', e);
      throw e;
    }
  },

  async updateESignature(companyId, signatureId, data, userId) {
    try {
      const updates = [];
      const params = [];

      const toSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      Object.keys(data).forEach(key => {
        const dbKey = toSnakeCase(key);
        if (dbKey !== 'id' && dbKey !== 'company_id' && dbKey !== 'created_at' && data[key] !== undefined) {
          updates.push(`${dbKey} = ?`);
          params.push(typeof data[key] === 'object' && data[key] !== null ? JSON.stringify(data[key]) : data[key]);
        }
      });

      updates.push('updated_at = ?');
      params.push(getSafeISO8601());
      params.push(companyId);
      params.push(signatureId);

      const query = `UPDATE univ_re_e_signatures SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;
      
      await powerSync.execute(query, params);
    } catch (e) {
      console.error('[RE API] updateESignature failed:', e);
      throw e;
    }
  },

  async deleteESignature(companyId, signatureId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_e_signatures WHERE company_id = ? AND id = ?',
        [companyId, signatureId]
      );
    } catch (e) {
      console.error('[RE API] deleteESignature failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // MARKET DATA
  // ────────────────────────────────────────────────────────

  async getMarketData(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_market_data WHERE company_id = ?';
      const params = [companyId];

      if (filters.region) {
        query += ' AND market_region = ?';
        params.push(filters.region);
      }
      if (filters.trend) {
        query += ' AND market_trend = ?';
        params.push(filters.trend);
      }
      if (filters.level) {
        query += ' AND market_level = ?';
        params.push(filters.level);
      }

      query += ' ORDER BY data_date DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getMarketData failed:', e);
      throw e;
    }
  },

  async createMarketData(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_market_data (id, company_id, market_region, market_city, market_level, 
         average_price, median_price, price_per_sqft, days_on_market_average, active_listings_count, 
         sold_listings_count, pending_listings_count, market_trend, data_date, data_source, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.marketRegion, data.marketCity, data.marketLevel, data.averagePrice, 
         data.medianPrice, data.pricePerSqft, data.daysOnMarketAverage, data.activeListingsCount, 
         data.soldListingsCount, data.pendingListingsCount || 0, data.marketTrend, data.dataDate, 
         data.dataSource || 'Internal', now, now]
      );

      powerSync.execute(
        'INSERT INTO audit_logs (id, user_id, action, record_type, record_id, changes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), userId, 'create', 'market_data', id, JSON.stringify(data), now]
      ).catch(e => console.warn('Audit log error:', e));

      return id;
    } catch (e) {
      console.error('[RE API] createMarketData failed:', e);
      throw e;
    }
  },

  async updateMarketData(companyId, dataId, data, userId) {
    try {
      const updates = [];
      const params = [];

      const toSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      Object.keys(data).forEach(key => {
        const dbKey = toSnakeCase(key);
        if (dbKey !== 'id' && dbKey !== 'company_id' && dbKey !== 'created_at' && data[key] !== undefined) {
          updates.push(`${dbKey} = ?`);
          params.push(typeof data[key] === 'object' && data[key] !== null ? JSON.stringify(data[key]) : data[key]);
        }
      });

      updates.push('updated_at = ?');
      params.push(getSafeISO8601());
      params.push(companyId);
      params.push(dataId);

      const query = `UPDATE univ_re_market_data SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;
      
      await powerSync.execute(query, params);
    } catch (e) {
      console.error('[RE API] updateMarketData failed:', e);
      throw e;
    }
  },

  async deleteMarketData(companyId, dataId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_market_data WHERE company_id = ? AND id = ?',
        [companyId, dataId]
      );
    } catch (e) {
      console.error('[RE API] deleteMarketData failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // ESCROW ACCOUNTS
  // ────────────────────────────────────────────────────────

  async getEscrowAccounts(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_escrow_accounts WHERE company_id = ?';
      const params = [companyId];

      if (filters.releaseStatus) {
        query += ' AND release_status = ?';
        params.push(filters.releaseStatus);
      }
      if (filters.escrowType) {
        query += ' AND escrow_type = ?';
        params.push(filters.escrowType);
      }

      query += ' ORDER BY created_at DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getEscrowAccounts failed:', e);
      throw e;
    }
  },

  async createEscrowAccount(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_escrow_accounts (id, company_id, transaction_id, buyer_id, seller_id, 
         agent_id, property_id, escrow_amount, escrow_type, escrow_agent_company, escrow_agent_name, 
         escrow_agent_email, escrow_agent_phone, conditions_for_release, release_status, release_date, 
         created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.transactionId || '', data.buyerId, data.sellerId, data.agentId || null, 
         data.propertyId, data.escrowAmount, data.escrowType, data.escrowAgentCompany || '', 
         data.escrowAgentName || '', data.escrowAgentEmail || '', data.escrowAgentPhone || '', 
         data.releaseConditions ? JSON.stringify(data.releaseConditions) : null, 
         data.releaseStatus || 'held', data.releaseDate, now, now]
      );

      powerSync.execute(
        'INSERT INTO audit_logs (id, user_id, action, record_type, record_id, changes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), userId, 'create', 'escrow_account', id, JSON.stringify(data), now]
      ).catch(e => console.warn('Audit log error:', e));

      return id;
    } catch (e) {
      console.error('[RE API] createEscrowAccount failed:', e);
      throw e;
    }
  },

  async updateEscrowAccount(companyId, accountId, data, userId) {
    try {
      const updates = [];
      const params = [];

      const toSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      Object.keys(data).forEach(key => {
        const dbKey = toSnakeCase(key);
        if (dbKey !== 'id' && dbKey !== 'company_id' && dbKey !== 'created_at' && data[key] !== undefined) {
          updates.push(`${dbKey} = ?`);
          params.push(typeof data[key] === 'object' && data[key] !== null ? JSON.stringify(data[key]) : data[key]);
        }
      });

      updates.push('updated_at = ?');
      params.push(getSafeISO8601());
      params.push(companyId);
      params.push(accountId);

      const query = `UPDATE univ_re_escrow_accounts SET ${updates.join(', ')} 
                     WHERE company_id = ? AND id = ?`;
      
      await powerSync.execute(query, params);
    } catch (e) {
      console.error('[RE API] updateEscrowAccount failed:', e);
      throw e;
    }
  },

  async deleteEscrowAccount(companyId, accountId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_escrow_accounts WHERE company_id = ? AND id = ?',
        [companyId, accountId]
      );
    } catch (e) {
      console.error('[RE API] deleteEscrowAccount failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // RECOMMENDATIONS
  // ────────────────────────────────────────────────────────

  async createRecommendation(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_agent_recommendations (id, company_id, client_id, recommended_agent_id, property_id,
         recommendation_type, recommendation_score, recommendation_reason, client_action, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.clientId, data.recommendedAgentId, data.propertyId,
         data.recommendationType, data.recommendationScore, data.recommendationReason, data.clientAction, now, now]
      );
      return id;
    } catch (e) {
      console.error('[RE API] createRecommendation failed:', e);
      throw e;
    }
  },

  async updateRecommendation(companyId, recId, data, userId) {
    try {
      await powerSync.execute(
        `UPDATE univ_re_agent_recommendations SET recommendation_reason = ?, recommendation_score = ?, 
         client_action = ?, updated_at = ? WHERE company_id = ? AND id = ?`,
        [data.recommendationReason, data.recommendationScore, data.clientAction, getSafeISO8601(), companyId, recId]
      );
    } catch (e) {
      console.error('[RE API] updateRecommendation failed:', e);
      throw e;
    }
  },

  async deleteRecommendation(companyId, recId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_agent_recommendations WHERE company_id = ? AND id = ?',
        [companyId, recId]
      );
    } catch (e) {
      console.error('[RE API] deleteRecommendation failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // COMPARABLE PROPERTIES
  // ────────────────────────────────────────────────────────

  async createComparableProperty(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_comparable_properties (id, company_id, subject_property_id, comparable_address, price, price_per_sqft,
         bedrooms, bathrooms, year_built, square_footage, days_on_market, sale_date, similarity_score, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.subjectPropertyId || null, data.address, data.salePrice, data.pricePerSqft, data.bedrooms, data.bathrooms,
         data.yearBuilt, data.squareFootage, data.daysOnMarket, data.saleDate, data.similarityScore, data.notes, now, now]
      );
      return id;
    } catch (e) {
      console.error('[RE API] createComparableProperty failed:', e);
      throw e;
    }
  },

  async updateComparableProperty(companyId, propId, data, userId) {
    try {
      await powerSync.execute(
        `UPDATE univ_re_comparable_properties SET comparable_address = ?, price = ?, price_per_sqft = ?,
         bedrooms = ?, bathrooms = ?, year_built = ?, square_footage = ?, days_on_market = ?, 
         sale_date = ?, similarity_score = ?, notes = ?, updated_at = ?
         WHERE company_id = ? AND id = ?`,
        [data.address, data.salePrice, data.pricePerSqft, data.bedrooms, data.bathrooms, data.yearBuilt,
         data.squareFootage, data.daysOnMarket, data.saleDate, data.similarityScore, data.notes, getSafeISO8601(), companyId, propId]
      );
    } catch (e) {
      console.error('[RE API] updateComparableProperty failed:', e);
      throw e;
    }
  },

  async deleteComparableProperty(companyId, propId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_comparable_properties WHERE company_id = ? AND id = ?',
        [companyId, propId]
      );
    } catch (e) {
      console.error('[RE API] deleteComparableProperty failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // CONTRACTORS
  // ────────────────────────────────────────────────────────

  async createContractor(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_contractors (id, company_id, contractor_name, contractor_type, email, phone,
         city, state, zip_code, is_licensed, is_insured, license_name, hourly_rate, total_jobs_completed, average_rating, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.contractorName, data.contractorType, data.email, data.phone, data.city, data.state,
         data.zipCode, data.isLicensed ? 1 : 0, data.isInsured ? 1 : 0, data.licenseName, data.hourlyRate, data.totalJobsCompleted, data.averageRating, now, now]
      );
      return id;
    } catch (e) {
      console.error('[RE API] createContractor failed:', e);
      throw e;
    }
  },

  async updateContractor(companyId, contractorId, data, userId) {
    try {
      await powerSync.execute(
        `UPDATE univ_re_contractors SET contractor_name = ?, contractor_type = ?, email = ?, phone = ?,
         city = ?, state = ?, zip_code = ?, is_licensed = ?, is_insured = ?, license_name = ?, 
         hourly_rate = ?, total_jobs_completed = ?, average_rating = ?, updated_at = ?
         WHERE company_id = ? AND id = ?`,
        [data.contractorName, data.contractorType, data.email, data.phone, data.city, data.state, data.zipCode,
         data.isLicensed ? 1 : 0, data.isInsured ? 1 : 0, data.licenseName, data.hourlyRate, data.totalJobsCompleted, data.averageRating, getSafeISO8601(), companyId, contractorId]
      );
    } catch (e) {
      console.error('[RE API] updateContractor failed:', e);
      throw e;
    }
  },

  async deleteContractor(companyId, contractorId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_contractors WHERE company_id = ? AND id = ?',
        [companyId, contractorId]
      );
    } catch (e) {
      console.error('[RE API] deleteContractor failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // CONTRACTOR REVIEWS
  // ────────────────────────────────────────────────────────

  async createContractorReview(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_contractor_reviews (id, company_id, contractor_id, reviewer_id, review_title, review_text, rating,
         punctuality_rating, quality_rating, professionalism_rating, would_rehire, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.contractorId, userId, data.reviewTitle, data.reviewText, data.rating,
         data.punctualityRating, data.qualityRating, data.professionalismRating, data.wouldRehire ? 1 : 0, now, now]
      );
      return id;
    } catch (e) {
      console.error('[RE API] createContractorReview failed:', e);
      throw e;
    }
  },

  async updateContractorReview(companyId, reviewId, data, userId) {
    try {
      await powerSync.execute(
        `UPDATE univ_re_contractor_reviews SET review_title = ?, review_text = ?, rating = ?,
         punctuality_rating = ?, quality_rating = ?, professionalism_rating = ?, would_rehire = ?, updated_at = ?
         WHERE company_id = ? AND id = ?`,
        [data.reviewTitle, data.reviewText, data.rating, data.punctualityRating, data.qualityRating,
         data.professionalismRating, data.wouldRehire ? 1 : 0, getSafeISO8601(), companyId, reviewId]
      );
    } catch (e) {
      console.error('[RE API] updateContractorReview failed:', e);
      throw e;
    }
  },

  async deleteContractorReview(companyId, reviewId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_contractor_reviews WHERE company_id = ? AND id = ?',
        [companyId, reviewId]
      );
    } catch (e) {
      console.error('[RE API] deleteContractorReview failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // LEASE RENEWALS
  // ────────────────────────────────────────────────────────

  async createLeaseRenewal(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_lease_renewals (id, company_id, lease_id, tenant_id, renewal_status, renewal_offer_date,
         response_deadline, new_rent_amount, rent_increase_percentage, renewal_term_months, renewal_lease_document_url,
         tenant_response_date, renewal_lease_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.leaseId, data.tenantId, data.renewalStatus || 'pending', data.renewalOfferDate, 
         data.responseDeadline, data.newRentAmount, data.rentIncreasePercentage, data.renewalTermMonths, 
         data.renewalLeaseDocumentUrl || null, data.tenantResponseDate, data.renewalLeaseId || null, now, now]
      );
      return id;
    } catch (e) {
      console.error('[RE API] createLeaseRenewal failed:', e);
      throw e;
    }
  },

  async updateLeaseRenewal(companyId, renewalId, data, userId) {
    try {
      await powerSync.execute(
        `UPDATE univ_re_lease_renewals SET renewal_offer_date = ?, response_deadline = ?, new_rent_amount = ?,
         rent_increase_percentage = ?, renewal_term_months = ?, renewal_status = ?, tenant_response_date = ?,
         tenant_response = ?, renewal_term_start_date = ?, updated_at = ?
         WHERE company_id = ? AND id = ?`,
        [data.renewalOfferDate, data.responseDeadline, data.newRentAmount, data.rentIncreasePercentage,
         data.renewalTermMonths, data.renewalStatus, data.tenantResponseDate, data.tenantResponse, data.renewalTermStartDate, getSafeISO8601(), companyId, renewalId]
      );
    } catch (e) {
      console.error('[RE API] updateLeaseRenewal failed:', e);
      throw e;
    }
  },

  async deleteLeaseRenewal(companyId, renewalId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_re_lease_renewals WHERE company_id = ? AND id = ?',
        [companyId, renewalId]
      );
    } catch (e) {
      console.error('[RE API] deleteLeaseRenewal failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // PHASE 2: TEAM MANAGEMENT
  // ────────────────────────────────────────────────────────

  async getTeamMembers(companyId) {
    try {
      const res = await powerSync.execute(
        'SELECT * FROM univ_re_team_members WHERE company_id = ? ORDER BY name ASC',
        [companyId]
      );
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getTeamMembers failed:', e);
      return [];
    }
  },

  async createTeamMember(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();
      await powerSync.execute(
        `INSERT INTO univ_re_team_members (id, company_id, name, email, phone, role, status, bio, license_number, license_expiry, commission_rate, join_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.name, data.email, data.phone || null, data.role || 'agent', data.status || 'active',
         data.bio || null, data.licenseNumber || null, data.licenseExpiry || null, data.commissionRate || 0, data.joinDate || now.split('T')[0], now, now]
      );
      return id;
    } catch (e) {
      console.error('[RE API] createTeamMember failed:', e);
      throw e;
    }
  },

  async updateTeamMember(companyId, memberId, data, userId) {
    try {
      const now = getSafeISO8601();
      await powerSync.execute(
        `UPDATE univ_re_team_members SET name = ?, email = ?, phone = ?, role = ?, status = ?, bio = ?, license_number = ?, license_expiry = ?, commission_rate = ?, updated_at = ?
         WHERE company_id = ? AND id = ?`,
        [data.name, data.email, data.phone, data.role, data.status, data.bio, data.licenseNumber, data.licenseExpiry, data.commissionRate, now, companyId, memberId]
      );
    } catch (e) {
      console.error('[RE API] updateTeamMember failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // PHASE 2: MARKET INTELLIGENCE & CMA
  // ────────────────────────────────────────────────────────

  async getMLSListings(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_mls_listings WHERE company_id = ?';
      const params = [companyId];
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      query += ' ORDER BY created_at DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getMLSListings failed:', e);
      return [];
    }
  },

  async createMLSListing(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();
      await powerSync.execute(
        `INSERT INTO univ_re_mls_listings (id, company_id, mls_id, property_address, city, state, zip_code, price, list_date, days_on_market, bedrooms, bathrooms, square_feet, status, agent_name, brokerage, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.mlsId || `MLS-${Date.now()}`, data.propertyAddress, data.city, data.state, data.zipCode, data.price, data.listDate || now.split('T')[0], data.daysOnMarket || 0, data.bedrooms, data.bathrooms, data.squareFeet, data.status || 'active', data.agentName || '', data.brokerage || '', data.description || '', now]
      );
      return id;
    } catch (e) {
      console.error('[RE API] createMLSListing failed:', e);
      throw e;
    }
  },

  async getComparableAnalysis(companyId, filters = {}) {
    try {
      const res = await powerSync.execute(
        'SELECT * FROM univ_re_comparable_analysis WHERE company_id = ? ORDER BY created_at DESC',
        [companyId]
      );
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getComparableAnalysis failed:', e);
      return [];
    }
  },

  async createComparableAnalysis(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();
      await powerSync.execute(
        `INSERT INTO univ_re_comparable_analysis (id, company_id, property_id, subject_address, subject_price, comparable_1_address, comparable_1_price, comparable_1_adjustment, comparable_2_address, comparable_2_price, comparable_2_adjustment, comparable_3_address, comparable_3_price, comparable_3_adjustment, estimated_value, confidence_level, notes, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.propertyId || null, data.subjectAddress, data.subjectPrice, data.comp1Address, data.comp1Price, data.comp1Adjustment || 0, data.comp2Address, data.comp2Price, data.comp2Adjustment || 0, data.comp3Address, data.comp3Price, data.comp3Adjustment || 0, data.estimatedValue, data.confidenceLevel || 85, data.notes || '', userId, now]
      );
      return id;
    } catch (e) {
      console.error('[RE API] createComparableAnalysis failed:', e);
      throw e;
    }
  },

  async getMarketTrends(companyId, filters = {}) {
    try {
      const res = await powerSync.execute(
        'SELECT * FROM univ_re_market_trends WHERE company_id = ? ORDER BY metric_date DESC',
        [companyId]
      );
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getMarketTrends failed:', e);
      return [];
    }
  },

  // ────────────────────────────────────────────────────────
  // PHASE 2: CRM LEADS & LIFECYCLE
  // ────────────────────────────────────────────────────────

  async getLeads(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM univ_re_leads WHERE company_id = ?';
      const params = [companyId];
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      query += ' ORDER BY created_at DESC';
      const res = await powerSync.execute(query, params);
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getLeads failed:', e);
      return [];
    }
  },

  async createLead(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();
      await powerSync.execute(
        `INSERT INTO univ_re_leads (id, company_id, first_name, last_name, email, phone, source, property_interest, budget_min, budget_max, lead_type, status, stage, assigned_agent_id, lead_score, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.firstName, data.lastName, data.email || '', data.phone || '', data.source || 'website', data.propertyInterest || '', data.budgetMin || 0, data.budgetMax || 0, data.leadType || 'buyer', data.status || 'new', data.stage || 'awareness', data.assignedAgentId || null, data.leadScore || 50, data.notes || '', now, now]
      );
      return id;
    } catch (e) {
      console.error('[RE API] createLead failed:', e);
      throw e;
    }
  },

  async updateLead(companyId, leadId, data, userId) {
    try {
      const now = getSafeISO8601();
      await powerSync.execute(
        `UPDATE univ_re_leads SET first_name = ?, last_name = ?, email = ?, phone = ?, source = ?, property_interest = ?, budget_min = ?, budget_max = ?, lead_type = ?, status = ?, stage = ?, assigned_agent_id = ?, lead_score = ?, notes = ?, updated_at = ?
         WHERE company_id = ? AND id = ?`,
        [data.firstName, data.lastName, data.email, data.phone, data.source, data.propertyInterest, data.budgetMin, data.budgetMax, data.leadType, data.status, data.stage, data.assignedAgentId, data.leadScore, data.notes, now, companyId, leadId]
      );
    } catch (e) {
      console.error('[RE API] updateLead failed:', e);
      throw e;
    }
  },

  async createLeadActivity(companyId, leadId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();
      await powerSync.execute(
        `INSERT INTO univ_re_lead_activities (id, company_id, lead_id, activity_type, subject, description, duration_minutes, outcome, agent_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, leadId, data.activityType || 'call', data.subject || '', data.description || '', data.durationMinutes || 0, data.outcome || '', userId || null, now]
      );
      return id;
    } catch (e) {
      console.error('[RE API] createLeadActivity failed:', e);
      throw e;
    }
  },

  async getLeadActivities(companyId, leadId) {
    try {
      const res = await powerSync.execute(
        'SELECT * FROM univ_re_lead_activities WHERE company_id = ? AND lead_id = ? ORDER BY created_at DESC',
        [companyId, leadId]
      );
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getLeadActivities failed:', e);
      return [];
    }
  },

  async getLeadCampaigns(companyId, filters = {}) {
    try {
      const res = await powerSync.execute(
        'SELECT * FROM univ_re_lead_campaigns WHERE company_id = ? ORDER BY created_at DESC',
        [companyId]
      );
      return res.rows._array || Array.from(res.rows);
    } catch (e) {
      console.error('[RE API] getLeadCampaigns failed:', e);
      return [];
    }
  }
};

export default RealEstateAPI;
