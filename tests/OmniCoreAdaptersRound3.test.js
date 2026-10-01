/**
 * Unit Tests for OmniCore Core Adapters Round 3 (Employee, Document, Stock Extensions)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmployeeAdapter } from '../src/omnicore/core/EmployeeAdapter';
import { DocumentAdapter } from '../src/omnicore/core/DocumentAdapter';
import { ProductAdapter } from '../src/omnicore/core/ProductAdapter';
import { BusinessCore } from '../src/omnicore/core';
import { base44 } from '../src/api/base44Client';
import { powerSync } from '../src/api/PowerSyncConnector';

vi.mock('../src/api/base44Client', () => ({
  base44: {
    entities: {
      StaffRecord: {
        filter: vi.fn(),
        create: vi.fn()
      },
      Profile: {
        filter: vi.fn(),
        create: vi.fn()
      },
      Document: {
        filter: vi.fn(),
        create: vi.fn()
      },
      SignatureRequest: {
        filter: vi.fn(),
        create: vi.fn()
      },
      SmartFolder: {
        filter: vi.fn(),
        create: vi.fn()
      },
      TimeEntry: {
        filter: vi.fn(),
        create: vi.fn()
      }
    }
  }
}));

vi.mock('../src/api/PowerSyncConnector', () => ({
  powerSync: {
    execute: vi.fn()
  }
}));

describe('OmniCore Business Core Adapters - Round 3', () => {

  const testCompanyId = 'comp-round3-test';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. EMPLOYEE ADAPTER TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('EmployeeAdapter', () => {
    it('returns empty array if companyId is missing or falsy', async () => {
      const res1 = await EmployeeAdapter.getEmployees('');
      const res2 = await EmployeeAdapter.getEmployees(null);
      expect(res1).toEqual([]);
      expect(res2).toEqual([]);
      expect(base44.entities.StaffRecord.filter).not.toHaveBeenCalled();
    });

    it('fetches and normalizes records from staff_records and profiles', async () => {
      base44.entities.StaffRecord.filter.mockResolvedValueOnce([
        {
          id: 'sr-1',
          company_id: testCompanyId,
          user_id: 'user-1',
          user_email: 'sarah@firm.com',
          full_name: 'Sarah Jenkins',
          role: 'lawyer',
          department: 'litigation',
          status: 'active',
          salary: 95000,
          currency: 'USD',
          leave_balance: 14,
          bar_number: 'BAR-12345'
        }
      ]);

      base44.entities.Profile.filter.mockResolvedValueOnce([
        {
          id: 'user-1', // Already seen in staff_records -> Should be deduplicated
          company_id: testCompanyId,
          email: 'sarah@firm.com',
          role: 'lawyer'
        },
        {
          id: 'user-2', // New platform user without separate staff_record
          company_id: testCompanyId,
          email: 'alex@firm.com',
          role: 'user',
          department: 'corporate',
          phone: '555-0199'
        }
      ]);

      const employees = await EmployeeAdapter.getEmployees(testCompanyId);

      expect(employees.length).toBe(2);

      // Staff record entry
      expect(employees[0]).toEqual({
        id: 'sr-1',
        sourceTable: 'staff_records',
        companyId: testCompanyId,
        userId: 'user-1',
        name: 'Sarah Jenkins',
        email: 'sarah@firm.com',
        phone: null,
        role: 'lawyer',
        department: 'litigation',
        status: 'active',
        hireDate: null,
        salary: 95000,
        currency: 'USD',
        leaveBalance: 14,
        metadata: { barNumber: 'BAR-12345' }
      });

      // Profile fallback entry
      expect(employees[1]).toEqual({
        id: 'user-2',
        sourceTable: 'profiles',
        companyId: testCompanyId,
        userId: 'user-2',
        name: 'alex',
        email: 'alex@firm.com',
        phone: '555-0199',
        role: 'user',
        department: 'corporate',
        status: 'active',
        hireDate: null,
        salary: null,
        currency: 'USD',
        leaveBalance: null,
        metadata: { avatarUrl: null, barNumber: null, companyName: null }
      });
    });

    it('handles zero-result / empty tables gracefully', async () => {
      base44.entities.StaffRecord.filter.mockResolvedValueOnce([]);
      base44.entities.Profile.filter.mockResolvedValueOnce([]);

      const employees = await EmployeeAdapter.getEmployees(testCompanyId);
      expect(employees).toEqual([]);
    });

    it('creates an employee record using base44.entities.StaffRecord.create', async () => {
      base44.entities.StaffRecord.create.mockResolvedValueOnce({
        id: 'sr-new-1',
        company_id: testCompanyId,
        full_name: 'David Vance',
        user_email: 'david@firm.com',
        role: 'paralegal'
      });

      const res = await EmployeeAdapter.createEmployee(testCompanyId, {
        name: 'David Vance',
        email: 'david@firm.com',
        role: 'paralegal',
        department: 'litigation',
        salary: 60000,
        leaveBalance: 10
      });

      expect(res.id).toBe('sr-new-1');
      expect(base44.entities.StaffRecord.create).toHaveBeenCalledWith({
        company_id: testCompanyId,
        full_name: 'David Vance',
        user_email: 'david@firm.com',
        phone: null,
        role: 'paralegal',
        department: 'litigation',
        status: 'active',
        hire_date: null,
        salary: 60000,
        currency: 'USD',
        leave_balance: 10,
        bar_number: null
      });
    });

    it('throws when creating employee without companyId or name', async () => {
      await expect(EmployeeAdapter.createEmployee('', { name: 'David' })).rejects.toThrow('Missing companyId');
      await expect(EmployeeAdapter.createEmployee(testCompanyId, {})).rejects.toThrow('Employee name is required');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. DOCUMENT ADAPTER TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('DocumentAdapter', () => {
    it('returns empty array if companyId is missing or falsy', async () => {
      const res1 = await DocumentAdapter.getDocuments('');
      const res2 = await DocumentAdapter.getDocuments(null);
      expect(res1).toEqual([]);
      expect(res2).toEqual([]);
      expect(base44.entities.Document.filter).not.toHaveBeenCalled();
    });

    it('fetches and normalizes records from documents, signature_requests, and smart_folders', async () => {
      base44.entities.Document.filter.mockResolvedValueOnce([
        {
          id: 'doc-1',
          company_id: testCompanyId,
          name: 'Retainer Agreement.pdf',
          file_type: 'application/pdf',
          file_size: 245000,
          file_url: 'https://storage/doc-1.pdf',
          category: 'contracts',
          case_id: 'case-101',
          case_title: 'State vs Smith',
          client_id: 'client-55',
          client_name: 'John Smith',
          notes: 'Signed client retainer',
          version: 2,
          shared_with_client: true,
          uploaded_by: 'user-1'
        }
      ]);

      base44.entities.SignatureRequest.filter.mockResolvedValueOnce([
        {
          id: 'sig-1',
          company_id: testCompanyId,
          document_id: 'doc-1',
          document_name: 'NDA Agreement',
          client_email: 'vendor@corp.com',
          sent_by: 'user-1',
          sent_by_name: 'Admin',
          status: 'pending',
          sent_at: '2026-09-20T10:00:00Z',
          expires_at: '2026-09-30T10:00:00Z'
        }
      ]);

      base44.entities.SmartFolder.filter.mockResolvedValueOnce([
        {
          id: 'folder-1',
          company_id: testCompanyId,
          name: '2026 Client Pleadings',
          color: '#3B82F6',
          parent_id: null
        }
      ]);

      const documents = await DocumentAdapter.getDocuments(testCompanyId);

      expect(documents.length).toBe(3);

      // Primary document
      expect(documents[0]).toEqual({
        id: 'doc-1',
        sourceTable: 'documents',
        companyId: testCompanyId,
        name: 'Retainer Agreement.pdf',
        type: 'application/pdf',
        fileUrl: 'https://storage/doc-1.pdf',
        fileSize: 245000,
        category: 'contracts',
        status: 'shared',
        version: '2',
        caseId: 'case-101',
        clientId: 'client-55',
        uploadedBy: 'user-1',
        metadata: {
          caseTitle: 'State vs Smith',
          clientName: 'John Smith',
          notes: 'Signed client retainer',
          filingDate: null
        }
      });

      // Signature request
      expect(documents[1]).toEqual({
        id: 'sig-1',
        sourceTable: 'signature_requests',
        companyId: testCompanyId,
        name: 'NDA Agreement',
        type: 'signature_request',
        fileUrl: null,
        fileSize: null,
        category: 'signature_workflow',
        status: 'pending',
        version: '1.0',
        caseId: null,
        clientId: null,
        uploadedBy: 'user-1',
        metadata: {
          documentId: 'doc-1',
          caseTitle: null,
          clientName: null,
          recipientEmail: 'vendor@corp.com',
          sentByName: 'Admin',
          sentAt: '2026-09-20T10:00:00Z',
          signedAt: null,
          expiresAt: '2026-09-30T10:00:00Z'
        }
      });

      // Smart Folder
      expect(documents[2]).toEqual({
        id: 'folder-1',
        sourceTable: 'smart_folders',
        companyId: testCompanyId,
        name: '2026 Client Pleadings',
        type: 'folder',
        fileUrl: null,
        fileSize: null,
        category: 'folder',
        status: 'active',
        version: '1.0',
        caseId: null,
        clientId: null,
        uploadedBy: null,
        metadata: {
          parentId: null,
          color: '#3B82F6'
        }
      });
    });

    it('handles zero-result / empty tables gracefully', async () => {
      base44.entities.Document.filter.mockResolvedValueOnce([]);
      base44.entities.SignatureRequest.filter.mockResolvedValueOnce([]);
      base44.entities.SmartFolder.filter.mockResolvedValueOnce([]);

      const documents = await DocumentAdapter.getDocuments(testCompanyId);
      expect(documents).toEqual([]);
    });

    it('creates a document record using base44.entities.Document.create', async () => {
      base44.entities.Document.create.mockResolvedValueOnce({
        id: 'doc-new-1',
        company_id: testCompanyId,
        name: 'Court Brief.docx',
        file_type: 'docx'
      });

      const res = await DocumentAdapter.createDocument(testCompanyId, {
        name: 'Court Brief.docx',
        fileUrl: 'https://storage/brief.docx',
        fileType: 'docx',
        fileSize: 120000,
        category: 'pleadings',
        caseId: 'case-202',
        sharedWithClient: false
      });

      expect(res.id).toBe('doc-new-1');
      expect(base44.entities.Document.create).toHaveBeenCalledWith({
        company_id: testCompanyId,
        name: 'Court Brief.docx',
        file_url: 'https://storage/brief.docx',
        file_type: 'docx',
        file_size: 120000,
        category: 'pleadings',
        case_id: 'case-202',
        case_title: null,
        client_id: null,
        client_name: null,
        notes: '',
        version: 1,
        shared_with_client: false
      });
    });

    it('throws when creating document without companyId or name', async () => {
      await expect(DocumentAdapter.createDocument('', { name: 'Doc' })).rejects.toThrow('Missing companyId');
      await expect(DocumentAdapter.createDocument(testCompanyId, {})).rejects.toThrow('Document name is required');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. PRODUCT ADAPTER STOCK-LEVEL EXTENSION TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('ProductAdapter Stock-Level Extensions', () => {
    it('extracts real stock quantities and reorder thresholds from retail products and pharmacy drugs', async () => {
      powerSync.execute
        .mockResolvedValueOnce({
          rows: {
            _array: [
              {
                id: 'prod-1',
                company_id: testCompanyId,
                name: 'Wireless Barcode Scanner',
                sku: 'SCAN-100',
                price: 150,
                cost: 90,
                stock: 28,
                supplier: 'Tech Supplies Ltd',
                category: 'Hardware'
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          rows: {
            _array: [
              {
                id: 'drug-1',
                company_id: testCompanyId,
                drug_name: 'Amoxicillin 500mg',
                ndc_code: '0093-3109-01',
                unit_price: 24.50,
                cost: 12.00,
                quantity_in_stock: 140,
                reorder_level: 30,
                maximum_stock: 500,
                generic_name: 'Amoxicillin',
                strength: '500mg',
                drug_form: 'capsule'
              }
            ]
          }
        });

      base44.entities.TimeEntry.filter.mockResolvedValueOnce([
        {
          id: 'te-1',
          company_id: testCompanyId,
          description: 'Consultation Session',
          hours: 1.5,
          hourly_rate: 200
        }
      ]);

      const products = await ProductAdapter.getProducts(testCompanyId);

      expect(products.length).toBe(3);

      // Retail physical good: stock=28
      expect(products[0].name).toBe('Wireless Barcode Scanner');
      expect(products[0].stockQuantity).toBe(28);
      expect(products[0].type).toBe('physical_good');
      expect(products[0].metadata.supplier).toBe('Tech Supplies Ltd');

      // Pharmacy drug: quantity_in_stock=140, reorder_level=30, maximumStock=500
      expect(products[1].name).toBe('Amoxicillin 500mg');
      expect(products[1].stockQuantity).toBe(140);
      expect(products[1].reorderThreshold).toBe(30);
      expect(products[1].metadata.maximumStock).toBe(500);
      expect(products[1].type).toBe('pharmaceutical');

      // Service time entry: stockQuantity=null, reorderThreshold=null
      expect(products[2].name).toBe('Consultation Session');
      expect(products[2].stockQuantity).toBeNull();
      expect(products[2].reorderThreshold).toBeNull();
      expect(products[2].type).toBe('service');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. BUSINESS CORE INTEGRATION
  // ═══════════════════════════════════════════════════════════════
  describe('BusinessCore Layer Integration', () => {
    it('mounts Employee and Document adapters in BusinessCore.adapters', () => {
      expect(BusinessCore.adapters.Employee).toBe(EmployeeAdapter);
      expect(BusinessCore.adapters.Document).toBe(DocumentAdapter);
      expect(typeof BusinessCore.adapters.Employee.getEmployees).toBe('function');
      expect(typeof BusinessCore.adapters.Document.getDocuments).toBe('function');
    });
  });
});
