/**
 * Unit Tests for OmniCore Capabilities (CustomerManagement)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerManagement } from '../src/omnicore/capabilities/CustomerManagement';
import { CustomerAdapter } from '../src/omnicore/core/CustomerAdapter';
import { TaskAdapter } from '../src/omnicore/core/TaskAdapter';
import { InvoiceAdapter } from '../src/omnicore/core/InvoiceAdapter';

vi.mock('../src/omnicore/core/CustomerAdapter', () => ({
  CustomerAdapter: {
    getCustomers: vi.fn()
  }
}));

vi.mock('../src/omnicore/core/TaskAdapter', () => ({
  TaskAdapter: {
    getTasks: vi.fn()
  }
}));

vi.mock('../src/omnicore/core/InvoiceAdapter', () => ({
  InvoiceAdapter: {
    getInvoices: vi.fn()
  }
}));

describe('OmniCore Business Capabilities - CustomerManagement', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return composed customer profile with matching tasks, invoices, and computed summary', async () => {
    const mockCompanyId = 'comp-tenant-1';
    const mockCustomerId = 'cust-100';

    CustomerAdapter.getCustomers.mockResolvedValueOnce([
      { id: 'cust-100', companyId: mockCompanyId, name: 'Acme Corp', email: 'acme@example.com' },
      { id: 'cust-200', companyId: mockCompanyId, name: 'Beta Ltd', email: 'beta@example.com' }
    ]);

    TaskAdapter.getTasks.mockResolvedValueOnce([
      { id: 'tsk-1', companyId: mockCompanyId, title: 'Task 1', status: 'in_progress', customerId: 'cust-100' },
      { id: 'tsk-2', companyId: mockCompanyId, title: 'Task 2', status: 'completed', customerId: 'cust-100' },
      { id: 'tsk-3', companyId: mockCompanyId, title: 'Task 3', status: 'todo', customerId: 'cust-200' }
    ]);

    InvoiceAdapter.getInvoices.mockResolvedValueOnce([
      { id: 'inv-1', companyId: mockCompanyId, customerId: 'cust-100', totalAmount: 1000, status: 'paid' },
      { id: 'inv-2', companyId: mockCompanyId, customerId: 'cust-100', totalAmount: 500, status: 'unpaid' },
      { id: 'inv-3', companyId: mockCompanyId, customerId: 'cust-200', totalAmount: 2000, status: 'sent' }
    ]);

    const profile = await CustomerManagement.getCustomerProfile(mockCompanyId, mockCustomerId);

    expect(profile.customer).not.toBeNull();
    expect(profile.customer.id).toBe('cust-100');
    expect(profile.customer.name).toBe('Acme Corp');

    // Filtered tasks check
    expect(profile.tasks.length).toBe(2);
    expect(profile.tasks.map(t => t.id)).toEqual(['tsk-1', 'tsk-2']);

    // Filtered invoices check
    expect(profile.invoices.length).toBe(2);
    expect(profile.invoices.map(i => i.id)).toEqual(['inv-1', 'inv-2']);

    // Summary calculation check
    expect(profile.summary.openTaskCount).toBe(1); // tsk-1 is in_progress, tsk-2 is completed
    expect(profile.summary.totalInvoiced).toBe(1500); // 1000 + 500
    expect(profile.summary.totalOutstanding).toBe(500); // inv-2 is unpaid (500)
  });

  it('should safely handle edge case where customer has zero tasks and zero invoices', async () => {
    const mockCompanyId = 'comp-tenant-1';
    const mockCustomerId = 'cust-solo';

    CustomerAdapter.getCustomers.mockResolvedValueOnce([
      { id: 'cust-solo', companyId: mockCompanyId, name: 'Solo Client' }
    ]);
    TaskAdapter.getTasks.mockResolvedValueOnce([]);
    InvoiceAdapter.getInvoices.mockResolvedValueOnce([]);

    const profile = await CustomerManagement.getCustomerProfile(mockCompanyId, mockCustomerId);

    expect(profile.customer).not.toBeNull();
    expect(profile.customer.id).toBe('cust-solo');
    expect(profile.tasks).toEqual([]);
    expect(profile.invoices).toEqual([]);
    expect(profile.summary).toEqual({
      openTaskCount: 0,
      totalInvoiced: 0,
      totalOutstanding: 0
    });
  });

  it('should return empty profile safely if companyId or customerId is missing or non-existent', async () => {
    CustomerAdapter.getCustomers.mockResolvedValueOnce([]);
    TaskAdapter.getTasks.mockResolvedValueOnce([]);
    InvoiceAdapter.getInvoices.mockResolvedValueOnce([]);

    const profileNull = await CustomerManagement.getCustomerProfile('', '');
    expect(profileNull.customer).toBeNull();
    expect(profileNull.summary.totalInvoiced).toBe(0);

    const profileNotFound = await CustomerManagement.getCustomerProfile('comp-1', 'cust-missing');
    expect(profileNotFound.customer).toBeNull();
    expect(profileNotFound.tasks).toEqual([]);
  });

});
