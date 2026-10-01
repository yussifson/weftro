/**
 * RealEstateDocuments.js
 * 
 * Document management, templates, e-signatures, and digital transactions
 */

import { powerSync } from '@/api/PowerSyncConnector';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const RealEstateDocuments = {
  // ────────────────────────────────────────────────────────
  // DOCUMENT TEMPLATES
  // ────────────────────────────────────────────────────────

  async createDocumentTemplate(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_document_templates 
         (id, company_id, template_name, document_type, document_category, template_content,
          template_variables, required_signatures, created_by, is_active, version, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.templateName, data.documentType, data.documentCategory,
         data.templateContent, JSON.stringify(data.templateVariables || []),
         data.requiredSignatures || 0, userId, 1, 1, now, now]
      );

      return id;
    } catch (e) {
      console.error('[Documents] createDocumentTemplate failed:', e);
      throw e;
    }
  },

  async getDocumentTemplates(companyId, documentType = null) {
    try {
      let query = `SELECT * FROM univ_re_document_templates 
                   WHERE company_id = ? AND is_active = ?`;
      const params = [companyId, 1];

      if (documentType) {
        query += ' AND document_type = ?';
        params.push(documentType);
      }

      query += ' ORDER BY created_at DESC';
      const result = await powerSync.execute(query, params);
      return result.rows._array || [];
    } catch (e) {
      console.error('[Documents] getDocumentTemplates failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // DOCUMENT GENERATION & MANAGEMENT
  // ────────────────────────────────────────────────────────

  async generateDocumentFromTemplate(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      // Get template
      const templateResult = await powerSync.execute(
        `SELECT * FROM univ_re_document_templates WHERE id = ? AND company_id = ?`,
        [data.templateId, companyId]
      );

      if (!templateResult.rows._array || templateResult.rows._array.length === 0) {
        throw new Error('Template not found');
      }

      const template = templateResult.rows._array[0];
      let documentContent = template.template_content;

      // Replace variables with actual values
      if (data.variables) {
        Object.keys(data.variables).forEach(key => {
          const placeholder = `{{${key}}}`;
          documentContent = documentContent.replace(new RegExp(placeholder, 'g'), 
            data.variables[key] || '');
        });
      }

      // Generate PDF or store as HTML (simplified)
      // In production, use a library like html2pdf or jsPDF

      // Create document record
      await powerSync.execute(
        `INSERT INTO univ_re_documents 
         (id, company_id, property_id, transaction_id, lease_id, document_type, document_title,
          document_url, document_size_bytes, mime_type, generated_from_template_id, version,
          status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.propertyId || null, data.transactionId || null,
         data.leaseId || null, template.document_type, data.documentTitle,
         data.documentUrl || '', data.documentSize || 0, 'application/pdf',
         data.templateId, 1, 'draft', userId, now, now]
      );

      return {
        documentId: id,
        documentUrl: data.documentUrl,
        status: 'draft',
        requiresSignatures: template.required_signatures || 0
      };
    } catch (e) {
      console.error('[Documents] generateDocumentFromTemplate failed:', e);
      throw e;
    }
  },

  async getDocuments(companyId, filters = {}) {
    try {
      let query = `SELECT * FROM univ_re_documents WHERE company_id = ?`;
      const params = [companyId];

      if (filters.propertyId) {
        query += ' AND property_id = ?';
        params.push(filters.propertyId);
      }
      if (filters.transactionId) {
        query += ' AND transaction_id = ?';
        params.push(filters.transactionId);
      }
      if (filters.leaseId) {
        query += ' AND lease_id = ?';
        params.push(filters.leaseId);
      }
      if (filters.documentType) {
        query += ' AND document_type = ?';
        params.push(filters.documentType);
      }
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY created_at DESC';
      const result = await powerSync.execute(query, params);
      return result.rows._array || [];
    } catch (e) {
      console.error('[Documents] getDocuments failed:', e);
      throw e;
    }
  },

  async updateDocumentStatus(companyId, documentId, newStatus, userId) {
    try {
      const now = getSafeISO8601();

      await powerSync.execute(
        `UPDATE univ_re_documents SET status = ?, updated_at = ? WHERE id = ? AND company_id = ?`,
        [newStatus, now, documentId, companyId]
      );

      return true;
    } catch (e) {
      console.error('[Documents] updateDocumentStatus failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // E-SIGNATURE MANAGEMENT
  // ────────────────────────────────────────────────────────

  async requestSignature(companyId, data, userId) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + (data.expirationDays || 30));

      await powerSync.execute(
        `INSERT INTO univ_re_e_signatures 
         (id, company_id, document_id, signer_id, signer_name, signer_email, signer_phone,
          signature_status, expiration_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, data.documentId, data.signerId || null, data.signerName,
         data.signerEmail, data.signerPhone || null, 'pending',
         expirationDate.toISOString(), now]
      );

      // TODO: Send signing request via Novu (email notification)
      // This will be implemented in the Notification System task

      return {
        signatureRequestId: id,
        signerEmail: data.signerEmail,
        status: 'pending',
        expiresAt: expirationDate.toISOString()
      };
    } catch (e) {
      console.error('[Documents] requestSignature failed:', e);
      throw e;
    }
  },

  async getSignatureRequests(companyId, documentId) {
    try {
      const result = await powerSync.execute(
        `SELECT * FROM univ_re_e_signatures WHERE company_id = ? AND document_id = ? 
         ORDER BY created_at DESC`,
        [companyId, documentId]
      );

      return result.rows._array || [];
    } catch (e) {
      console.error('[Documents] getSignatureRequests failed:', e);
      throw e;
    }
  },

  async recordSignature(companyId, signatureRequestId, signatureData) {
    try {
      const now = getSafeISO8601();

      // Parse signature data (usually base64-encoded from digital signature pad)
      const signatureUrl = signatureData.signatureUrl || ''; // Store URL to signature image
      const ipAddress = signatureData.ipAddress || '';

      await powerSync.execute(
        `UPDATE univ_re_e_signatures 
         SET signature_status = ?, signature_url = ?, signing_ip_address = ?, 
             signature_date = ?, signing_timestamp = ?
         WHERE id = ? AND company_id = ?`,
        ['signed', signatureUrl, ipAddress, now, now, signatureRequestId, companyId]
      );

      // Get signature request to find document
      const sigResult = await powerSync.execute(
        `SELECT document_id FROM univ_re_e_signatures WHERE id = ?`,
        [signatureRequestId]
      );

      if (sigResult.rows._array && sigResult.rows._array.length > 0) {
        const documentId = sigResult.rows._array[0].document_id;

        // Check if all signatures are complete
        const allSigs = await this.getSignatureRequests(companyId, documentId);
        const allSigned = allSigs.every(sig => sig.signature_status === 'signed');

        if (allSigned) {
          // Update document status to signed
          await this.updateDocumentStatus(companyId, documentId, 'signed', null);
        }
      }

      return true;
    } catch (e) {
      console.error('[Documents] recordSignature failed:', e);
      throw e;
    }
  },

  async getSignatureStatus(companyId, documentId) {
    try {
      const signatures = await this.getSignatureRequests(companyId, documentId);

      const totalSignatures = signatures.length;
      const signedCount = signatures.filter(s => s.signature_status === 'signed').length;
      const pendingCount = signatures.filter(s => s.signature_status === 'pending').length;
      const expiredCount = signatures.filter(s => s.signature_status === 'expired').length;

      return {
        documentId,
        totalSignaturesRequired: totalSignatures,
        signed: signedCount,
        pending: pendingCount,
        expired: expiredCount,
        isComplete: signedCount === totalSignatures,
        signatures: signatures.map(sig => ({
          signerId: sig.signer_id,
          signerName: sig.signer_name,
          signerEmail: sig.signer_email,
          status: sig.signature_status,
          signedAt: sig.signature_date,
          expiresAt: sig.expiration_date
        }))
      };
    } catch (e) {
      console.error('[Documents] getSignatureStatus failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // DOCUMENT VERSIONING
  // ────────────────────────────────────────────────────────

  async createDocumentVersion(companyId, originalDocumentId, newContent, userId) {
    try {
      // Get original document
      const origResult = await powerSync.execute(
        `SELECT * FROM univ_re_documents WHERE id = ? AND company_id = ?`,
        [originalDocumentId, companyId]
      );

      if (!origResult.rows._array || origResult.rows._array.length === 0) {
        throw new Error('Original document not found');
      }

      const original = origResult.rows._array[0];
      const id = generateUUID();
      const now = getSafeISO8601();
      const newVersion = (original.version || 1) + 1;

      await powerSync.execute(
        `INSERT INTO univ_re_documents 
         (id, company_id, property_id, transaction_id, lease_id, document_type, document_title,
          document_url, document_size_bytes, mime_type, generated_from_template_id, version,
          status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, original.property_id, original.transaction_id,
         original.lease_id, original.document_type, original.document_title,
         newContent.documentUrl || '', newContent.documentSize || 0,
         'application/pdf', original.generated_from_template_id,
         newVersion, 'draft', userId, now, now]
      );

      return {
        newVersionId: id,
        version: newVersion
      };
    } catch (e) {
      console.error('[Documents] createDocumentVersion failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // DOCUMENT EXECUTION & ARCHIVAL
  // ────────────────────────────────────────────────────────

  async executeDocument(companyId, documentId, executionData, userId) {
    try {
      const now = getSafeISO8601();

      // Verify all signatures are complete
      const sigStatus = await this.getSignatureStatus(companyId, documentId);
      
      if (!sigStatus.isComplete) {
        throw new Error(`Cannot execute document: ${sigStatus.pending} signatures pending`);
      }

      // Mark as executed
      await this.updateDocumentStatus(companyId, documentId, 'executed', userId);

      // Archive original if this is a replacement version
      if (executionData.replacesDocumentId) {
        await this.updateDocumentStatus(companyId, executionData.replacesDocumentId, 
          'archived', userId);
      }

      return {
        documentId,
        status: 'executed',
        executedAt: now,
        executedBy: userId
      };
    } catch (e) {
      console.error('[Documents] executeDocument failed:', e);
      throw e;
    }
  },

  async archiveDocument(companyId, documentId, archiveReason, userId) {
    try {
      const now = getSafeISO8601();

      await powerSync.execute(
        `UPDATE univ_re_documents SET status = ?, updated_at = ? WHERE id = ? AND company_id = ?`,
        ['archived', now, documentId, companyId]
      );

      // Log archive action
      await this.logDocumentActivity(companyId, documentId, 'archived', {
        reason: archiveReason,
        archivedBy: userId,
        archivedAt: now
      });

      return true;
    } catch (e) {
      console.error('[Documents] archiveDocument failed:', e);
      throw e;
    }
  },

  // ────────────────────────────────────────────────────────
  // DOCUMENT ACTIVITY LOGGING
  // ────────────────────────────────────────────────────────

  async logDocumentActivity(companyId, documentId, activityType, details = {}) {
    try {
      const id = generateUUID();
      const now = getSafeISO8601();

      await powerSync.execute(
        `INSERT INTO univ_re_audit_log 
         (id, company_id, action, resource_type, resource_id, changes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, companyId, activityType, 'document', documentId, JSON.stringify(details), now]
      );
    } catch (e) {
      console.warn('[Documents] logDocumentActivity failed:', e);
    }
  },

  // ────────────────────────────────────────────────────────
  // DOCUMENT STATISTICS
  // ────────────────────────────────────────────────────────

  async getDocumentStatistics(companyId, dateRange = {}) {
    try {
      let query = `SELECT 
                     document_type,
                     status,
                     COUNT(*) as count,
                     AVG(document_size_bytes) as avg_size
                   FROM univ_re_documents
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

      query += ' GROUP BY document_type, status';

      const result = await powerSync.execute(query, params);
      return result.rows._array || [];
    } catch (e) {
      console.error('[Documents] getDocumentStatistics failed:', e);
      throw e;
    }
  }
};
