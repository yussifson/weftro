/**
 * Unit Tests for OmniCore Business Configuration Engine (Phase 5)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BusinessConfiguration,
  BusinessProfileResolver,
  resolveBusinessProfile,
  resolveBusinessProfileSync
} from '../src/omnicore/config';
import { OmniCoreV2 } from '../src/omnicore';
import { supabase } from '../src/api/supabaseClient';

vi.mock('../src/api/supabaseClient', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('OmniCore Business Configuration Engine', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Company with Matching Context Pack (Retail)', () => {
    const retailCompany = {
      id: 'comp-retail-101',
      name: 'SuperMart Ghana',
      industry_type: 'retail'
    };

    it('resolves a full Business Profile matching the Retail pack', () => {
      const profile = resolveBusinessProfileSync(retailCompany);

      expect(profile.companyId).toBe('comp-retail-101');
      expect(profile.companyName).toBe('SuperMart Ghana');
      expect(profile.industry).toBe('retail');
      expect(profile.isExplicitPack).toBe(true);

      // Verify terms pulled from industries.js
      expect(profile.terms.client).toBe('Customer');
      expect(profile.terms.case).toBe('Order');
      expect(profile.terms.staff).toBe('Cashier');
      expect(profile.terms.venue).toBe('Store');

      // Verify capabilities
      expect(profile.capabilities.CustomerManagement.enabled).toBe(true);
      expect(profile.capabilities.CustomerManagement.mode).toBe('b2c_and_b2b');
      expect(profile.capabilities.Sales.enabled).toBe(true);
      expect(profile.capabilities.Sales.mode).toBe('pos_and_orders');
      expect(profile.capabilities.Finance.enabled).toBe(true);
      expect(profile.capabilities.Finance.mode).toBe('retail_ledger');

      expect(profile.enabledCapabilities).toEqual(
        expect.arrayContaining(['CustomerManagement', 'Sales', 'Finance'])
      );
      expect(profile.isCapabilityEnabled('Sales')).toBe(true);

      // Verify dashboard & domain specifics
      expect(profile.dashboard.defaultLanding).toBe('/retail-dashboard');
      expect(profile.dashboard.primaryMetrics).toContain('daily_sales_volume');
      expect(profile.industrySpecific.customFields).toContain('barcode');
    });

    it('handles Pharmacy starter pack identically', () => {
      const pharmacyCompany = {
        id: 'comp-pharm-202',
        name: 'Apex Rx Care',
        industry_type: 'pharmacy'
      };

      const profile = resolveBusinessProfileSync(pharmacyCompany);
      expect(profile.industry).toBe('pharmacy');
      expect(profile.isExplicitPack).toBe(true);
      expect(profile.terms.client).toBe('Patient');
      expect(profile.terms.case).toBe('Prescription');
      expect(profile.terms.staff).toBe('Pharmacist');
      expect(profile.dashboard.defaultLanding).toBe('/pharmacy/dashboard');
      expect(profile.industrySpecific.customFields).toContain('dosage_instructions');
    });

    it('handles Law Firm starter pack identically', () => {
      const lawCompany = {
        id: 'comp-law-303',
        name: 'Lex & Associates',
        industry_type: 'law'
      };

      const profile = resolveBusinessProfileSync(lawCompany);
      expect(profile.industry).toBe('law');
      expect(profile.isExplicitPack).toBe(true);
      expect(profile.terms.client).toBe('Client');
      expect(profile.terms.case).toBe('Case');
      expect(profile.terms.staff).toBe('Lawyer');
      expect(profile.capabilities.Finance.features).toContain('trust_accounting');
    });

    it('handles Hotel starter pack identically', () => {
      const hotelCompany = {
        id: 'comp-hotel-304',
        name: 'Grand Plaza',
        industry_type: 'hotel'
      };

      const profile = resolveBusinessProfileSync(hotelCompany);
      expect(profile.industry).toBe('hotel');
      expect(profile.isExplicitPack).toBe(true);
      expect(profile.terms.client).toBe('Guest');
      expect(profile.terms.case).toBe('Booking');
      expect(profile.terms.staff).toBe('Staff');
      expect(profile.capabilities.Finance.features).toContain('guest_folio_ledger');
    });
  });

  describe('Company with Industry having No Explicit Pack Yet (Graceful Fallback)', () => {
    it('gracefully falls back to dynamic pack using central industries.js for unmapped industry', () => {
      const customCompany = {
        id: 'comp-opt-303',
        name: 'Optavel Services',
        industry_type: 'optavel'
      };

      const profile = resolveBusinessProfileSync(customCompany);

      expect(profile.companyId).toBe('comp-opt-303');
      expect(profile.industry).toBe('optavel');
      expect(profile.isExplicitPack).toBe(false);

      // Verify terms pulled dynamically from industries.js
      expect(profile.terms.client).toBeDefined();

      // Verify default capabilities
      expect(profile.isCapabilityEnabled('CustomerManagement')).toBe(true);
      expect(profile.isCapabilityEnabled('Sales')).toBe(true);
      expect(profile.isCapabilityEnabled('Finance')).toBe(true);
    });

    it('gracefully falls back for custom unknown vertical', () => {
      const unknownCompany = {
        id: 'comp-unk-404',
        name: 'Custom Advisory',
        industry_type: 'custom_advisory'
      };

      const profile = resolveBusinessProfileSync(unknownCompany);
      expect(profile.isExplicitPack).toBe(false);
      expect(profile.isCapabilityEnabled('CustomerManagement')).toBe(true);
    });
  });

  describe('Company-Level Capability Overrides', () => {
    it('applies company settings overrides to disable specific capabilities', () => {
      const consultingCompany = {
        id: 'comp-consult-505',
        name: 'Strategic Advisory',
        industry_type: 'retail',
        settings: {
          omnicore_capabilities: {
            Sales: { enabled: false },
            CustomerManagement: { emphasis: 'executive_accounts' }
          }
        }
      };

      const profile = resolveBusinessProfileSync(consultingCompany);

      expect(profile.isCapabilityEnabled('Sales')).toBe(false);
      expect(profile.isCapabilityEnabled('CustomerManagement')).toBe(true);
      expect(profile.isCapabilityEnabled('Finance')).toBe(true);

      expect(profile.enabledCapabilities).not.toContain('Sales');
      expect(profile.enabledCapabilities).toContain('CustomerManagement');
      expect(profile.enabledCapabilities).toContain('Finance');
      expect(profile.capabilities.CustomerManagement.emphasis).toBe('executive_accounts');
    });

    it('applies options-level capability overrides', () => {
      const retailCompany = {
        id: 'comp-retail-606',
        name: 'Corner Store',
        industry_type: 'retail'
      };

      const profile = resolveBusinessProfileSync(retailCompany, {
        capabilityOverrides: {
          Finance: { enabled: false }
        }
      });

      expect(profile.isCapabilityEnabled('Finance')).toBe(false);
      expect(profile.enabledCapabilities).not.toContain('Finance');
      expect(profile.enabledCapabilities).toContain('Sales');
    });
  });

  describe('Feature Flags Integration', () => {
    it('defaults to V2 flags being disabled', () => {
      const profile = resolveBusinessProfileSync({ id: 'c1', industry_type: 'retail' });
      expect(profile.featureFlags.slate_v2_enabled).toBe(false);
      expect(profile.featureFlags.omnicore_enabled).toBe(false);
      expect(profile.isV2Active).toBe(false);
    });

    it('correctly reports V2 active when both flags are enabled', () => {
      const profile = resolveBusinessProfileSync({ id: 'c1', industry_type: 'retail' }, {
        featureFlags: {
          slate_v2_enabled: true,
          omnicore_enabled: true
        }
      });
      expect(profile.featureFlags.slate_v2_enabled).toBe(true);
      expect(profile.featureFlags.omnicore_enabled).toBe(true);
      expect(profile.isV2Active).toBe(true);
    });
  });

  describe('Async resolveBusinessProfile with DB lookups', () => {
    it('fetches company and platform_config flags from Supabase', async () => {
      supabase.from.mockImplementation((table) => {
        if (table === 'companies') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'db-comp-707',
                name: 'DB Queried Retailer',
                industry_type: 'retail'
              },
              error: null
            })
          };
        }
        if (table === 'platform_config') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [
                { key: 'slate_v2_enabled', value: true },
                { key: 'omnicore_enabled', value: true }
              ],
              error: null
            })
          };
        }
        return {};
      });

      const profile = await resolveBusinessProfile('db-comp-707');

      expect(profile.companyId).toBe('db-comp-707');
      expect(profile.companyName).toBe('DB Queried Retailer');
      expect(profile.industry).toBe('retail');
      expect(profile.featureFlags.slate_v2_enabled).toBe(true);
      expect(profile.featureFlags.omnicore_enabled).toBe(true);
      expect(profile.isV2Active).toBe(true);
    });
  });

  describe('OmniCore Architecture V2 Integration', () => {
    it('exports BusinessConfiguration in OmniCoreV2 namespace', () => {
      expect(OmniCoreV2.BusinessConfiguration).toBeDefined();
      expect(OmniCoreV2.BusinessConfiguration.layer).toBe('BusinessConfiguration');
      expect(typeof OmniCoreV2.BusinessConfiguration.resolveSync).toBe('function');
    });
  });
});
