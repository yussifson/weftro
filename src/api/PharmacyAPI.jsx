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
    console.warn('[Pharmacy API] Date formatting error:', e);
    return new Date(Date.now()).toISOString();
  }
}

class PharmacyAPI {
  // ========================================
  // DRUGS MANAGEMENT
  // ========================================

  async createDrug(companyId, drugData, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_pharmacy_drugs (id, company_id, drug_name, generic_name, strength, unit_of_measurement, 
         drug_form, manufacturer, ndc_code, therapeutic_category, unit_price, discount_percentage, 
         reorder_level, maximum_stock, barcode, is_controlled, requires_prescription, is_active, 
         created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, drugData.drugName, drugData.genericName, drugData.strength, 
         drugData.unitOfMeasurement, drugData.drugForm, drugData.manufacturer, drugData.ndcCode, 
         drugData.therapeuticCategory, drugData.unitPrice || 0, drugData.discountPercentage || 0,
         drugData.reorderLevel || 50, drugData.maximumStock || 500, drugData.barcode || '',
         drugData.isControlled || false, drugData.requiresPrescription || false, true, now, now]
      );

      // Log action
      await this.logAuditAction(companyId, 'CREATE', 'Drug', id, null, drugData, userId);

      return { success: true, id, message: 'Drug created successfully' };
    } catch (e) {
      console.error('[Pharmacy API] Create drug error:', e);
      throw new Error(`Failed to create drug: ${e.message}`);
    }
  }

  async getDrugs(companyId) {
    try {
      const result = await powerSync.execute(
        'SELECT * FROM univ_pharmacy_drugs WHERE company_id = ? AND is_active = ? ORDER BY drug_name',
        [companyId, true]
      );
      return result.rows._array || Array.from(result.rows);
    } catch (e) {
      console.error('[Pharmacy API] Get drugs error:', e);
      return [];
    }
  }

  async updateDrug(companyId, drugId, drugData, userId) {
    try {
      const now = getSafeISO8601();

      // Get old value for audit
      const oldResult = await powerSync.execute(
        'SELECT * FROM univ_pharmacy_drugs WHERE id = ?',
        [drugId]
      );
      const oldValue = oldResult.rows._array?.[0] || {};

      await powerSync.execute(
        `UPDATE univ_pharmacy_drugs SET drug_name = ?, generic_name = ?, strength = ?, 
         unit_of_measurement = ?, drug_form = ?, manufacturer = ?, ndc_code = ?, 
         therapeutic_category = ?, unit_price = ?, discount_percentage = ?, 
         reorder_level = ?, maximum_stock = ?, barcode = ?, is_controlled = ?, 
         requires_prescription = ?, updated_at = ? WHERE id = ?`,
        [drugData.drugName, drugData.genericName, drugData.strength, 
         drugData.unitOfMeasurement, drugData.drugForm, drugData.manufacturer, 
         drugData.ndcCode, drugData.therapeuticCategory, drugData.unitPrice,
         drugData.discountPercentage, drugData.reorderLevel, drugData.maximumStock,
         drugData.barcode, drugData.isControlled, drugData.requiresPrescription, now, drugId]
      );

      await this.logAuditAction(companyId, 'UPDATE', 'Drug', drugId, oldValue, drugData, userId);

      return { success: true, message: 'Drug updated successfully' };
    } catch (e) {
      console.error('[Pharmacy API] Update drug error:', e);
      throw new Error(`Failed to update drug: ${e.message}`);
    }
  }

  async deleteDrug(companyId, drugId, userId) {
    try {
      const now = getSafeISO8601();
      await powerSync.execute(
        'UPDATE univ_pharmacy_drugs SET is_active = ?, updated_at = ? WHERE id = ? AND company_id = ?',
        [false, now, drugId, companyId]
      );
      await this.logAuditAction(companyId, 'DELETE', 'Drug', drugId, null, null, userId);
      return { success: true, message: 'Drug deleted successfully' };
    } catch (e) {
      console.error('[Pharmacy API] Delete drug error:', e);
      throw new Error(`Failed to delete drug: ${e.message}`);
    }
  }

  // ========================================
  // INVENTORY MANAGEMENT
  // ========================================

  async addInventory(companyId, inventoryData, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      const totalCost = (inventoryData.costPerUnit || 0) * (inventoryData.quantityInStock || 0);

      await powerSync.execute(
        `INSERT INTO univ_pharmacy_inventory (id, company_id, drug_id, batch_number, expiry_date, 
         quantity_in_stock, cost_per_unit, total_cost, storage_location, warehouse_section, 
         shelf_number, received_date, received_by, is_quarantined, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, inventoryData.drugId, inventoryData.batchNumber, inventoryData.expiryDate,
         inventoryData.quantityInStock, inventoryData.costPerUnit, totalCost,
         inventoryData.storageLocation, inventoryData.warehouseSection, inventoryData.shelfNumber,
         inventoryData.receivedDate, userId, false, now, now]
      );

      await this.logAuditAction(companyId, 'CREATE', 'Inventory', id, null, inventoryData, userId);

      return { success: true, id, message: 'Inventory added successfully' };
    } catch (e) {
      console.error('[Pharmacy API] Add inventory error:', e);
      throw new Error(`Failed to add inventory: ${e.message}`);
    }
  }

  async getInventory(companyId, filterOptions = {}) {
    try {
      let query = 'SELECT * FROM univ_pharmacy_inventory WHERE company_id = ?';
      const params = [companyId];

      if (filterOptions.drugId) {
        query += ' AND drug_id = ?';
        params.push(filterOptions.drugId);
      }

      if (filterOptions.excludeExpired) {
        query += ' AND expiry_date > DATE(?)';
        params.push(new Date().toISOString().split('T')[0]);
      }

      query += ' ORDER BY expiry_date ASC';

      const result = await powerSync.execute(query, params);
      return result.rows._array || Array.from(result.rows);
    } catch (e) {
      console.error('[Pharmacy API] Get inventory error:', e);
      return [];
    }
  }

  async updateInventoryQuantity(companyId, inventoryId, quantityChange, reason, userId) {
    try {
      const now = getSafeISO8601();

      // Get current quantity
      const result = await powerSync.execute(
        'SELECT quantity_in_stock, quantity_reserved FROM univ_pharmacy_inventory WHERE id = ?',
        [inventoryId]
      );
      const current = result.rows._array?.[0] || {};
      const newQuantity = (current.quantity_in_stock || 0) + quantityChange;

      await powerSync.execute(
        'UPDATE univ_pharmacy_inventory SET quantity_in_stock = ?, updated_at = ? WHERE id = ?',
        [Math.max(0, newQuantity), now, inventoryId]
      );

      await this.logAuditAction(companyId, 'UPDATE', 'Inventory', inventoryId, current, { quantity_in_stock: newQuantity }, userId);
      return { success: true, message: 'Inventory quantity updated' };
    } catch (e) {
      console.error('[Pharmacy API] Update inventory quantity error:', e);
      throw new Error(`Failed to update quantity: ${e.message}`);
    }
  }

  async updateInventoryStatus(companyId, inventoryId, newStatus, userId) {
    try {
      const now = getSafeISO8601();

      // Get old value for audit
      const oldResult = await powerSync.execute(
        'SELECT status FROM univ_pharmacy_inventory WHERE id = ?',
        [inventoryId]
      );
      const oldValue = oldResult.rows._array?.[0] || {};

      await powerSync.execute(
        'UPDATE univ_pharmacy_inventory SET status = ?, updated_at = ? WHERE id = ? AND company_id = ?',
        [newStatus, now, inventoryId, companyId]
      );

      await this.logAuditAction(companyId, 'UPDATE', 'Inventory Status', inventoryId, oldValue, { status: newStatus }, userId);
      return { success: true, message: 'Inventory status updated' };
    } catch (e) {
      console.error('[Pharmacy API] Update inventory status error:', e);
      throw new Error(`Failed to update inventory status: ${e.message}`);
    }
  }

  async deleteInventory(companyId, inventoryId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_pharmacy_inventory WHERE id = ? AND company_id = ?',
        [inventoryId, companyId]
      );
      return { success: true, message: 'Inventory item deleted successfully' };
    } catch (e) {
      console.error('[Pharmacy API] Delete inventory error:', e);
      throw new Error(`Failed to delete inventory: ${e.message}`);
    }
  }

  // ========================================
  // SALES & TRANSACTIONS
  // ========================================

  async createSale(companyId, saleData, userId) {
    try {
      const saleId = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_pharmacy_sales (id, company_id, receipt_number, customer_id, sale_date,
         total_items, subtotal, tax_amount, discount_amount, grand_total, amount_paid,
         change_amount, payment_method, cashier_id, shift_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [saleId, companyId, saleData.receiptNumber, saleData.customerId, now,
         saleData.items?.length || 0, saleData.subtotal || 0, saleData.taxAmount || 0,
         saleData.discountAmount || 0, saleData.grandTotal || 0, saleData.amountPaid || 0,
         saleData.changeAmount || 0, saleData.paymentMethod, userId, saleData.shiftId, now, now]
      );

      // Create sale items
      if (saleData.items && Array.isArray(saleData.items)) {
        for (const item of saleData.items) {
          const itemId = generateUUID();
          await powerSync.execute(
            `INSERT INTO univ_pharmacy_sale_items (id, company_id, sale_id, drug_id, drug_name,
             quantity_sold, unit_price, line_total, batch_number, inventory_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [itemId, companyId, saleId, item.drugId, item.drugName, item.quantitySold,
             item.unitPrice, item.lineTotal, item.batchNumber, item.inventoryId, now]
          );

          // Update inventory
          if (item.inventoryId) {
            await this.updateInventoryQuantity(companyId, item.inventoryId, -item.quantitySold, 'Sale', userId);
          }
        }
      }

      await this.logAuditAction(companyId, 'CREATE', 'Sale', saleId, null, saleData, userId);

      return { success: true, saleId, receiptNumber: saleData.receiptNumber };
    } catch (e) {
      console.error('[Pharmacy API] Create sale error:', e);
      throw new Error(`Failed to create sale: ${e.message}`);
    }
  }

  async getSales(companyId, filterOptions = {}) {
    try {
      let query = 'SELECT * FROM univ_pharmacy_sales WHERE company_id = ?';
      const params = [companyId];

      if (filterOptions.startDate) {
        query += ' AND sale_date >= ?';
        params.push(filterOptions.startDate);
      }

      if (filterOptions.endDate) {
        query += ' AND sale_date <= ?';
        params.push(filterOptions.endDate);
      }

      query += ' ORDER BY sale_date DESC';

      const result = await powerSync.execute(query, params);
      return result.rows._array || Array.from(result.rows);
    } catch (e) {
      console.error('[Pharmacy API] Get sales error:', e);
      return [];
    }
  }

  // ========================================
  // PRESCRIPTIONS
  // ========================================

  async createPrescription(companyId, prescriptionData, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_pharmacy_prescriptions (id, company_id, prescription_number, customer_id,
         physician_name, physician_license_number, prescription_date, prescribed_drug_id, drug_name,
         quantity_prescribed, dosage, frequency, duration_days, refills_allowed, prescription_status,
         created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, prescriptionData.prescriptionNumber, prescriptionData.customerId,
         prescriptionData.physicianName, prescriptionData.physicianLicenseNumber,
         prescriptionData.prescriptionDate, prescriptionData.prescribedDrugId, prescriptionData.drugName,
         prescriptionData.quantityPrescribed, prescriptionData.dosage, prescriptionData.frequency,
         prescriptionData.durationDays, prescriptionData.refillsAllowed || 0, 'Pending', now, now]
      );

      await this.logAuditAction(companyId, 'CREATE', 'Prescription', id, null, prescriptionData, userId);

      return { success: true, id, prescriptionNumber: prescriptionData.prescriptionNumber };
    } catch (e) {
      console.error('[Pharmacy API] Create prescription error:', e);
      throw new Error(`Failed to create prescription: ${e.message}`);
    }
  }

  async updatePrescriptionStatus(companyId, prescriptionId, newStatus, userId) {
    try {
      const now = getSafeISO8601();
      await powerSync.execute(
        'UPDATE univ_pharmacy_prescriptions SET prescription_status = ?, updated_at = ? WHERE id = ? AND company_id = ?',
        [newStatus, now, prescriptionId, companyId]
      );
      return { success: true, message: 'Prescription status updated' };
    } catch (e) {
      console.error('[Pharmacy API] Update prescription status error:', e);
      throw new Error('Failed to update prescription status: ' + e.message);
    }
  }

  async updatePrescription(companyId, prescriptionId, data, userId) {
    try {
      const now = getSafeISO8601();
      await powerSync.execute(
        `UPDATE univ_pharmacy_prescriptions SET
         physician_name = ?, dosage = ?, frequency = ?,
         duration_days = ?, refills_allowed = ?, prescription_status = ?,
         updated_at = ? WHERE id = ? AND company_id = ?`,
        [data.physicianName, data.dosage, data.frequency,
         data.durationDays, data.refillsAllowed || 0, data.prescriptionStatus || 'Pending',
         now, prescriptionId, companyId]
      );
      return { success: true, message: 'Prescription updated' };
    } catch (e) {
      console.error('[Pharmacy API] Update prescription error:', e);
      throw new Error('Failed to update prescription: ' + e.message);
    }
  }

  async deletePrescription(companyId, prescriptionId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_pharmacy_prescriptions WHERE id = ? AND company_id = ?',
        [prescriptionId, companyId]
      );
      return { success: true, message: 'Prescription deleted' };
    } catch (e) {
      console.error('[Pharmacy API] Delete prescription error:', e);
      throw new Error('Failed to delete prescription: ' + e.message);
    }
  }

  async getPrescriptions(companyId, customerId = null) {
    try {
      let query = 'SELECT * FROM univ_pharmacy_prescriptions WHERE company_id = ?';
      const params = [companyId];

      if (customerId) {
        query += ' AND customer_id = ?';
        params.push(customerId);
      }

      query += ' ORDER BY prescription_date DESC';

      const result = await powerSync.execute(query, params);
      return result.rows._array || Array.from(result.rows);
    } catch (e) {
      console.error('[Pharmacy API] Get prescriptions error:', e);
      return [];
    }
  }

  // ========================================
  // CUSTOMERS
  // ========================================

  async createCustomer(companyId, customerData, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_pharmacy_customers (id, company_id, customer_name, customer_type, phone,
         email, date_of_birth, gender, address, city, state, postal_code, country,
         insurance_provider, insurance_id, loyalty_points, total_spent, is_active,
         created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, customerData.customerName, customerData.customerType, customerData.phone,
         customerData.email, customerData.dateOfBirth, customerData.gender, customerData.address,
         customerData.city, customerData.state, customerData.postalCode, customerData.country,
         customerData.insuranceProvider, customerData.insuranceId, 0, 0, true, now, now]
      );

      return { success: true, id, message: 'Customer created successfully' };
    } catch (e) {
      console.error('[Pharmacy API] Create customer error:', e);
      throw new Error(`Failed to create customer: ${e.message}`);
    }
  }

  async getCustomers(companyId) {
    try {
      const result = await powerSync.execute(
        'SELECT * FROM univ_pharmacy_customers WHERE company_id = ? AND is_active = ? ORDER BY customer_name',
        [companyId, true]
      );
      return result.rows._array || Array.from(result.rows);
    } catch (e) {
      console.error('[Pharmacy API] Get customers error:', e);
      return [];
    }
  }

  async deleteCustomer(companyId, customerId, userId) {
    try {
      const now = getSafeISO8601();
      await powerSync.execute(
        'UPDATE univ_pharmacy_customers SET is_active = ?, updated_at = ? WHERE id = ? AND company_id = ?',
        [false, now, customerId, companyId]
      );
      return { success: true, message: 'Customer deleted successfully' };
    } catch (e) {
      console.error('[Pharmacy API] Delete customer error:', e);
      throw new Error(`Failed to delete customer: ${e.message}`);
    }
  }

  // ========================================
  // SUPPLIERS
  // ========================================

  async createSupplier(companyId, supplierData, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_pharmacy_suppliers (id, company_id, supplier_name, contact_person, email,
         phone, address, city, state, postal_code, country, payment_terms, lead_time_days,
         is_preferred, credit_limit, current_balance, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, supplierData.supplierName, supplierData.contactPerson, supplierData.email,
         supplierData.phone, supplierData.address, supplierData.city, supplierData.state,
         supplierData.postalCode, supplierData.country, supplierData.paymentTerms,
         supplierData.leadTimeDays || 5, supplierData.isPreferred || false,
         supplierData.creditLimit || 0, 0, true, now, now]
      );

      return { success: true, id, message: 'Supplier created successfully' };
    } catch (e) {
      console.error('[Pharmacy API] Create supplier error:', e);
      throw new Error(`Failed to create supplier: ${e.message}`);
    }
  }

  async getSuppliers(companyId) {
    try {
      const result = await powerSync.execute(
        'SELECT * FROM univ_pharmacy_suppliers WHERE company_id = ? AND is_active = ? ORDER BY supplier_name',
        [companyId, true]
      );
      return result.rows._array || Array.from(result.rows);
    } catch (e) {
      console.error('[Pharmacy API] Get suppliers error:', e);
      return [];
    }
  }

  // ========================================
  // INSURANCE CLAIMS
  // ========================================

  async createClaim(companyId, claimData, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_pharmacy_insurance_claims (id, company_id, claim_number, customer_id,
         insurance_provider, claim_amount, approved_amount,
         claim_status, claim_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, claimData.claimNumber, claimData.customerId || null,
         claimData.insuranceProvider, claimData.claimAmount || 0, claimData.approvalAmount || 0,
         claimData.claimStatus || 'Submitted', claimData.claimDate || now, now, now]
      );

      return { success: true, id, message: 'Claim created successfully' };
    } catch (e) {
      console.error('[Pharmacy API] Create claim error:', e);
      throw new Error(`Failed to create claim: ${e.message}`);
    }
  }

  async updateClaim(companyId, claimId, claimData, userId) {
    try {
      const now = getSafeISO8601();

      await powerSync.execute(
        `UPDATE univ_pharmacy_insurance_claims SET
         claim_number = ?, insurance_provider = ?,
         claim_amount = ?, approved_amount = ?, claim_status = ?,
         claim_date = ?, updated_at = ?
         WHERE id = ? AND company_id = ?`,
        [claimData.claimNumber, claimData.insuranceProvider,
         claimData.claimAmount, claimData.approvalAmount, claimData.claimStatus,
         claimData.claimDate, now, claimId, companyId]
      );

      return { success: true, message: 'Claim updated successfully' };
    } catch (e) {
      console.error('[Pharmacy API] Update claim error:', e);
      throw new Error(`Failed to update claim: ${e.message}`);
    }
  }

  async updateClaimStatus(companyId, claimId, newStatus, userId) {
    try {
      const now = getSafeISO8601();

      await powerSync.execute(
        `UPDATE univ_pharmacy_insurance_claims SET claim_status = ?, updated_at = ?
         WHERE id = ? AND company_id = ?`,
        [newStatus, now, claimId, companyId]
      );

      return { success: true, message: 'Claim status updated successfully' };
    } catch (e) {
      console.error('[Pharmacy API] Update claim status error:', e);
      throw new Error(`Failed to update claim status: ${e.message}`);
    }
  }

  async deleteClaim(companyId, claimId, userId) {
    try {
      await powerSync.execute(
        'DELETE FROM univ_pharmacy_insurance_claims WHERE id = ? AND company_id = ?',
        [claimId, companyId]
      );

      return { success: true, message: 'Claim deleted successfully' };
    } catch (e) {
      console.error('[Pharmacy API] Delete claim error:', e);
      throw new Error(`Failed to delete claim: ${e.message}`);
    }
  }

  // ========================================
  // ANALYTICS & REPORTING
  // ========================================

  async getAnalytics(companyId, date = new Date()) {
    try {
      const dateStr = date.toISOString().split('T')[0];

      const result = await powerSync.execute(
        'SELECT * FROM univ_pharmacy_analytics WHERE company_id = ? AND metric_date = ?',
        [companyId, dateStr]
      );

      return result.rows._array?.[0] || null;
    } catch (e) {
      console.error('[Pharmacy API] Get analytics error:', e);
      return null;
    }
  }

  async generateDailyAnalytics(companyId, userId) {
    try {
      const now = getSafeISO8601();
      const dateStr = new Date().toISOString().split('T')[0];
      const id = generateUUID();

      // Get sales data for today
      const salesResult = await powerSync.execute(
        'SELECT COUNT(*) as total_transactions, SUM(grand_total) as total_sales FROM univ_pharmacy_sales WHERE company_id = ? AND DATE(sale_date) = DATE(?)',
        [companyId, dateStr]
      );

      const salesData = salesResult.rows._array?.[0] || {};

      // Get inventory data
      const inventoryResult = await powerSync.execute(
        'SELECT COUNT(CASE WHEN quantity_available <= reorder_level THEN 1 END) as low_stock_count FROM univ_pharmacy_inventory WHERE company_id = ?',
        [companyId]
      );

      const inventoryData = inventoryResult.rows._array?.[0] || {};

      // Insert analytics record
      await powerSync.execute(
        `INSERT INTO univ_pharmacy_analytics (id, company_id, metric_type, metric_date, total_sales,
         total_transactions, low_stock_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, 'Daily', dateStr, salesData.total_sales || 0, salesData.total_transactions || 0,
         inventoryData.low_stock_count || 0, now, now]
      );

      return { success: true, message: 'Analytics generated' };
    } catch (e) {
      console.error('[Pharmacy API] Generate analytics error:', e);
      throw new Error(`Failed to generate analytics: ${e.message}`);
    }
  }

  // ========================================
  // AUDIT LOGGING
  // ========================================

  async logAuditAction(companyId, action, entityType, entityId, oldValue, newValue, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_pharmacy_audit_log (id, company_id, action, entity_type, entity_id, user_id,
         old_value, new_value, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, action, entityType, entityId, userId,
         JSON.stringify(oldValue), JSON.stringify(newValue), now]
      );
    } catch (e) {
      console.warn('[Pharmacy API] Audit log error:', e);
    }
  }
}

export default new PharmacyAPI();
