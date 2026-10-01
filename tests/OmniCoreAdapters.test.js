/**
 * Unit Tests for OmniCore Core Primitive Adapters (Customer, Task, Invoice)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerAdapter } from '../src/omnicore/core/CustomerAdapter';
import { TaskAdapter } from '../src/omnicore/core/TaskAdapter';
import { InvoiceAdapter } from '../src/omnicore/core/InvoiceAdapter';
import { base44 } from '../src/api/base44Client';
import { powerSync } from '../src/api/PowerSyncConnector';
import { supabase } from '../src/api/supabaseClient';

vi.mock('../src/api/base44Client', () => ({
  base44: {
    entities: {
      Client: {
        filter: vi.fn(),
        create: vi.fn()
      },
      Task: {
        filter: vi.fn(),
        create: vi.fn()
      },
      Invoice: {
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

vi.mock('../src/api/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    }))
  }
}));

describe('OmniCore Business Core Adapters', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // CUSTOMER ADAPTER TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('CustomerAdapter', () => {
    it('should fetch and normalize customer records from clients table', async () => {
      base44.entities.Client.filter.mockResolvedValueOnce([
        { id: 'cli-1', company_id: 'comp-100', name: 'John Doe', email: 'john@example.com', client_type: 'individual' }
      ]);
      powerSync.execute.mockResolvedValueOnce({ rows: { _array: [] } });

      const customers = await CustomerAdapter.getCustomers('comp-100');
      expect(customers.length).toBe(1);
      expect(customers[0].id).toBe('cli-1');
      expect(customers[0].sourceTable).toBe('clients');
      expect(customers[0].name).toBe('John Doe');
      expect(customers[0].email).toBe('john@example.com');
    });

    it('should route customer creation to base44 Client entity', async () => {
      base44.entities.Client.create.mockResolvedValueOnce({ id: 'cli-new', name: 'Acme Corp' });

      const result = await CustomerAdapter.createCustomer('comp-100', {
        name: 'Acme Corp',
        email: 'info@acme.com',
        phone: '123456'
      });

      expect(base44.entities.Client.create).toHaveBeenCalledWith({
        company_id: 'comp-100',
        name: 'Acme Corp',
        email: 'info@acme.com',
        phone: '123456',
        notes: ''
      });
      expect(result.id).toBe('cli-new');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TASK ADAPTER TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('TaskAdapter', () => {
    it('should fetch and normalize task records from tasks table', async () => {
      base44.entities.Task.filter.mockResolvedValueOnce([
        { id: 'tsk-1', company_id: 'comp-100', title: 'Prepare Contract', status: 'in_progress', priority: 'high' }
      ]);
      powerSync.execute.mockResolvedValueOnce({ rows: { _array: [] } });

      const tasks = await TaskAdapter.getTasks('comp-100');
      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe('tsk-1');
      expect(tasks[0].sourceTable).toBe('tasks');
      expect(tasks[0].title).toBe('Prepare Contract');
      expect(tasks[0].priority).toBe('high');
    });

    it('should route task creation to base44 Task entity', async () => {
      base44.entities.Task.create.mockResolvedValueOnce({ id: 'tsk-new', title: 'Review File' });

      const result = await TaskAdapter.createTask('comp-100', {
        title: 'Review File',
        description: 'Audit document',
        priority: 'high'
      });

      expect(base44.entities.Task.create).toHaveBeenCalledWith({
        company_id: 'comp-100',
        title: 'Review File',
        description: 'Audit document',
        status: 'todo',
        priority: 'high',
        due_date: null,
        assigned_to: null
      });
      expect(result.id).toBe('tsk-new');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // INVOICE ADAPTER TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('InvoiceAdapter', () => {
    it('should fetch and normalize invoice records from invoices table', async () => {
      base44.entities.Invoice.filter.mockResolvedValueOnce([
        { id: 'inv-1', company_id: 'comp-100', invoice_number: 'INV-001', total_amount: 1500, status: 'sent' }
      ]);
      powerSync.execute.mockResolvedValueOnce({ rows: { _array: [] } });

      const invoices = await InvoiceAdapter.getInvoices('comp-100');
      expect(invoices.length).toBe(1);
      expect(invoices[0].id).toBe('inv-1');
      expect(invoices[0].sourceTable).toBe('invoices');
      expect(invoices[0].totalAmount).toBe(1500);
      expect(invoices[0].status).toBe('sent');
    });

    it('should route invoice creation to base44 Invoice entity', async () => {
      base44.entities.Invoice.create.mockResolvedValueOnce({ id: 'inv-new', invoice_number: 'INV-102' });

      const result = await InvoiceAdapter.createInvoice('comp-100', {
        invoiceNumber: 'INV-102',
        customerId: 'cli-1',
        totalAmount: 2500,
        status: 'draft'
      });

      expect(base44.entities.Invoice.create).toHaveBeenCalledWith({
        company_id: 'comp-100',
        invoice_number: 'INV-102',
        client_id: 'cli-1',
        total_amount: 2500,
        status: 'draft',
        due_date: null
      });
      expect(result.id).toBe('inv-new');
    });
  });

});
