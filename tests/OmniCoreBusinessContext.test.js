/**
 * Unit Tests for OmniCore Business Context Layer (Phase 4)
 */

import { describe, it, expect } from 'vitest';
import {
  BusinessContext,
  createContextPack,
  RetailContextPack,
  PharmacyContextPack,
  LawFirmContextPack,
  HotelContextPack,
  ContextPackRegistry
} from '../src/omnicore/context';
import { OmniCoreV2 } from '../src/omnicore';
import { INDUSTRIES } from '../src/config/industries';

describe('OmniCore Business Context Layer', () => {

  describe('createContextPack Factory', () => {
    it('throws if industryKey is missing', () => {
      expect(() => createContextPack({})).toThrow('industryKey is required');
    });

    it('dynamically pulls terms directly from industries.js', () => {
      const lawPack = createContextPack({ industryKey: 'law' });
      expect(lawPack.name).toBe(INDUSTRIES.law.name);
      expect(lawPack.icon).toBe(INDUSTRIES.law.icon);
      expect(lawPack.terms.client).toBe(INDUSTRIES.law.terms.client);
      expect(lawPack.terms.case).toBe(INDUSTRIES.law.terms.case);
      expect(lawPack.terms.staff).toBe(INDUSTRIES.law.terms.staff);
      expect(lawPack.getTerm('client')).toBe('Client');
      expect(lawPack.getTerm('case')).toBe('Case');
    });

    it('creates a pack with default capabilities enabled', () => {
      const pack = createContextPack({ industryKey: 'school' });
      expect(pack.capabilities.CustomerManagement.enabled).toBe(true);
      expect(pack.capabilities.Sales.enabled).toBe(true);
      expect(pack.capabilities.Finance.enabled).toBe(true);
      expect(pack.terms.client).toBe('Student');
    });
  });

  describe('Retail Context Pack', () => {
    it('pulls exact terminology from industries.js without re-authoring', () => {
      expect(RetailContextPack.industryKey).toBe('retail');
      expect(RetailContextPack.name).toBe(INDUSTRIES.retail.name);
      expect(RetailContextPack.icon).toBe(INDUSTRIES.retail.icon);
      expect(RetailContextPack.terms.client).toBe('Customer');
      expect(RetailContextPack.terms.clients).toBe('Customers');
      expect(RetailContextPack.terms.case).toBe('Order');
      expect(RetailContextPack.terms.cases).toBe('Orders');
      expect(RetailContextPack.terms.staff).toBe('Cashier');
      expect(RetailContextPack.terms.venue).toBe('Store');
      expect(RetailContextPack.terms.hearing).toBe('Shift');
    });

    it('defines relevant OmniCore capabilities for retail', () => {
      expect(RetailContextPack.capabilities.CustomerManagement.enabled).toBe(true);
      expect(RetailContextPack.capabilities.CustomerManagement.mode).toBe('b2c_and_b2b');
      expect(RetailContextPack.capabilities.CustomerManagement.emphasis).toBe('loyalty_and_purchase_history');

      expect(RetailContextPack.capabilities.Sales.enabled).toBe(true);
      expect(RetailContextPack.capabilities.Sales.mode).toBe('pos_and_orders');
      expect(RetailContextPack.capabilities.Sales.emphasis).toBe('fast_checkout_and_promotions');

      expect(RetailContextPack.capabilities.Finance.enabled).toBe(true);
      expect(RetailContextPack.capabilities.Finance.mode).toBe('retail_ledger');
      expect(RetailContextPack.capabilities.Finance.emphasis).toBe('cash_reconciliation_and_invoicing');
    });

    it('configures retail dashboard and industry-specific concerns', () => {
      expect(RetailContextPack.dashboard.defaultLanding).toBe('/retail-dashboard');
      expect(RetailContextPack.dashboard.primaryMetrics).toContain('daily_sales_volume');
      expect(RetailContextPack.industrySpecific.customFields).toContain('barcode');
      expect(RetailContextPack.industrySpecific.customFields).toContain('sku');
      expect(RetailContextPack.industrySpecific.customFields).toContain('loyalty_points');
      expect(RetailContextPack.industrySpecific.specializedEntities).toContain('promotions');
      expect(RetailContextPack.industrySpecific.specializedEntities).toContain('barcodes');
    });
  });

  describe('Pharmacy Context Pack', () => {
    it('pulls exact terminology from industries.js without re-authoring', () => {
      expect(PharmacyContextPack.industryKey).toBe('pharmacy');
      expect(PharmacyContextPack.name).toBe(INDUSTRIES.pharmacy.name);
      expect(PharmacyContextPack.icon).toBe(INDUSTRIES.pharmacy.icon);
      expect(PharmacyContextPack.terms.client).toBe('Patient');
      expect(PharmacyContextPack.terms.clients).toBe('Patients');
      expect(PharmacyContextPack.terms.case).toBe('Prescription');
      expect(PharmacyContextPack.terms.cases).toBe('Prescriptions');
      expect(PharmacyContextPack.terms.staff).toBe('Pharmacist');
      expect(PharmacyContextPack.terms.venue).toBe('Branch');
      expect(PharmacyContextPack.terms.hearing).toBe('Refill');
    });

    it('defines relevant OmniCore capabilities for pharmacy', () => {
      expect(PharmacyContextPack.capabilities.CustomerManagement.enabled).toBe(true);
      expect(PharmacyContextPack.capabilities.CustomerManagement.mode).toBe('patient_records');
      expect(PharmacyContextPack.capabilities.CustomerManagement.emphasis).toBe('medical_history_and_insurance');

      expect(PharmacyContextPack.capabilities.Sales.enabled).toBe(true);
      expect(PharmacyContextPack.capabilities.Sales.mode).toBe('dispensing_and_otc');
      expect(PharmacyContextPack.capabilities.Sales.emphasis).toBe('prescription_verification_and_claims');

      expect(PharmacyContextPack.capabilities.Finance.enabled).toBe(true);
      expect(PharmacyContextPack.capabilities.Finance.mode).toBe('healthcare_billing');
      expect(PharmacyContextPack.capabilities.Finance.emphasis).toBe('insurance_reimbursement_and_copays');
    });

    it('configures pharmacy dashboard and industry-specific concerns', () => {
      expect(PharmacyContextPack.dashboard.defaultLanding).toBe('/pharmacy/dashboard');
      expect(PharmacyContextPack.dashboard.primaryMetrics).toContain('prescriptions_dispensed_today');
      expect(PharmacyContextPack.industrySpecific.customFields).toContain('prescription_number');
      expect(PharmacyContextPack.industrySpecific.customFields).toContain('dosage_instructions');
      expect(PharmacyContextPack.industrySpecific.customFields).toContain('expiry_date');
      expect(PharmacyContextPack.industrySpecific.customFields).toContain('drug_batch_number');
      expect(PharmacyContextPack.industrySpecific.specializedEntities).toContain('prescriptions');
      expect(PharmacyContextPack.industrySpecific.specializedEntities).toContain('insurance_claims');
    });
  });

  describe('Law Firm Context Pack', () => {
    it('pulls exact terminology from industries.js without re-authoring', () => {
      expect(LawFirmContextPack.industryKey).toBe('law');
      expect(LawFirmContextPack.name).toBe(INDUSTRIES.law.name);
      expect(LawFirmContextPack.icon).toBe(INDUSTRIES.law.icon);
      expect(LawFirmContextPack.terms.client).toBe('Client');
      expect(LawFirmContextPack.terms.clients).toBe('Clients');
      expect(LawFirmContextPack.terms.case).toBe('Case');
      expect(LawFirmContextPack.terms.cases).toBe('Cases');
      expect(LawFirmContextPack.terms.staff).toBe('Lawyer');
      expect(LawFirmContextPack.terms.venue).toBe('Court');
      expect(LawFirmContextPack.terms.hearing).toBe('Hearing');
    });

    it('defines relevant OmniCore capabilities for law firm', () => {
      expect(LawFirmContextPack.capabilities.CustomerManagement.enabled).toBe(true);
      expect(LawFirmContextPack.capabilities.CustomerManagement.mode).toBe('matter_and_client_management');
      expect(LawFirmContextPack.capabilities.CustomerManagement.emphasis).toBe('case_history_and_conflict_checks');

      expect(LawFirmContextPack.capabilities.Sales.enabled).toBe(true);
      expect(LawFirmContextPack.capabilities.Sales.mode).toBe('retainers_and_engagements');
      expect(LawFirmContextPack.capabilities.Sales.emphasis).toBe('retainers_and_legal_services');

      expect(LawFirmContextPack.capabilities.Finance.enabled).toBe(true);
      expect(LawFirmContextPack.capabilities.Finance.mode).toBe('legal_trust_accounting');
      expect(LawFirmContextPack.capabilities.Finance.emphasis).toBe('trust_accounting_and_time_billing');
      expect(LawFirmContextPack.capabilities.Finance.features).toContain('trust_accounting');
      expect(LawFirmContextPack.capabilities.Finance.features).toContain('iolta_compliance');
    });

    it('configures law firm dashboard and industry-specific concerns', () => {
      expect(LawFirmContextPack.dashboard.defaultLanding).toBe('/');
      expect(LawFirmContextPack.dashboard.primaryMetrics).toContain('active_matters');
      expect(LawFirmContextPack.dashboard.primaryMetrics).toContain('trust_account_balance');
      expect(LawFirmContextPack.industrySpecific.customFields).toContain('bar_number');
      expect(LawFirmContextPack.industrySpecific.customFields).toContain('court_jurisdiction');
      expect(LawFirmContextPack.industrySpecific.customFields).toContain('retainer_amount');
      expect(LawFirmContextPack.industrySpecific.specializedEntities).toContain('cases');
      expect(LawFirmContextPack.industrySpecific.specializedEntities).toContain('hearings');
      expect(LawFirmContextPack.industrySpecific.specializedEntities).toContain('conflict_check');
      expect(LawFirmContextPack.industrySpecific.specializedEntities).toContain('trust_accounting');
    });
  });

  describe('Hotel Context Pack', () => {
    it('pulls exact terminology from industries.js without re-authoring', () => {
      expect(HotelContextPack.industryKey).toBe('hotel');
      expect(HotelContextPack.name).toBe(INDUSTRIES.hotel.name);
      expect(HotelContextPack.icon).toBe(INDUSTRIES.hotel.icon);
      expect(HotelContextPack.terms.client).toBe('Guest');
      expect(HotelContextPack.terms.clients).toBe('Guests');
      expect(HotelContextPack.terms.case).toBe('Booking');
      expect(HotelContextPack.terms.cases).toBe('Bookings');
      expect(HotelContextPack.terms.staff).toBe('Staff');
      expect(HotelContextPack.terms.venue).toBe('Property');
      expect(HotelContextPack.terms.hearing).toBe('Reservation');
    });

    it('defines relevant OmniCore capabilities for hotel', () => {
      expect(HotelContextPack.capabilities.CustomerManagement.enabled).toBe(true);
      expect(HotelContextPack.capabilities.CustomerManagement.mode).toBe('guest_profiles_and_crm');
      expect(HotelContextPack.capabilities.CustomerManagement.emphasis).toBe('guest_preferences_and_loyalty');

      expect(HotelContextPack.capabilities.Sales.enabled).toBe(true);
      expect(HotelContextPack.capabilities.Sales.mode).toBe('reservations_and_pos');
      expect(HotelContextPack.capabilities.Sales.emphasis).toBe('room_bookings_and_amenity_charges');

      expect(HotelContextPack.capabilities.Finance.enabled).toBe(true);
      expect(HotelContextPack.capabilities.Finance.mode).toBe('hospitality_folio');
      expect(HotelContextPack.capabilities.Finance.emphasis).toBe('guest_folios_and_night_audit');
      expect(HotelContextPack.capabilities.Finance.features).toContain('guest_folio_ledger');
      expect(HotelContextPack.capabilities.Finance.features).toContain('night_audit');
    });

    it('configures hotel dashboard and industry-specific concerns', () => {
      expect(HotelContextPack.dashboard.defaultLanding).toBe('/');
      expect(HotelContextPack.dashboard.primaryMetrics).toContain('occupancy_rate');
      expect(HotelContextPack.dashboard.primaryMetrics).toContain('arrivals_today');
      expect(HotelContextPack.industrySpecific.customFields).toContain('room_number');
      expect(HotelContextPack.industrySpecific.customFields).toContain('folio_id');
      expect(HotelContextPack.industrySpecific.specializedEntities).toContain('reservations');
      expect(HotelContextPack.industrySpecific.specializedEntities).toContain('housekeeping');
      expect(HotelContextPack.industrySpecific.specializedEntities).toContain('guest_requests');
    });
  });

  describe('ContextPackRegistry', () => {
    it('retrieves registered packs with case-insensitivity', () => {
      expect(ContextPackRegistry.getContextPack('retail')).toBe(RetailContextPack);
      expect(ContextPackRegistry.getContextPack('RETAIL')).toBe(RetailContextPack);
      expect(ContextPackRegistry.getContextPack('pharmacy')).toBe(PharmacyContextPack);
      expect(ContextPackRegistry.getContextPack('Pharmacy')).toBe(PharmacyContextPack);
      expect(ContextPackRegistry.getContextPack('law')).toBe(LawFirmContextPack);
      expect(ContextPackRegistry.getContextPack('LAW')).toBe(LawFirmContextPack);
      expect(ContextPackRegistry.getContextPack('hotel')).toBe(HotelContextPack);
      expect(ContextPackRegistry.getContextPack('Hotel')).toBe(HotelContextPack);
    });

    it('dynamically generates context pack for un-registered industry keys using industries.js', () => {
      const realEstatePack = ContextPackRegistry.getContextPack('real_estate');
      expect(realEstatePack).toBeDefined();
      expect(realEstatePack.industryKey).toBe('real_estate');
      expect(realEstatePack.terms.client).toBe(INDUSTRIES.real_estate.terms.client);
      expect(realEstatePack.terms.case).toBe(INDUSTRIES.real_estate.terms.case);
    });

    it('lists registered starter packs', () => {
      const list = ContextPackRegistry.list();
      expect(list).toContain('retail');
      expect(list).toContain('pharmacy');
      expect(list).toContain('law');
      expect(list).toContain('hotel');
    });

    it('supports registering new context packs', () => {
      const customPack = createContextPack({
        industryKey: 'custom_vertical',
        displayName: 'Custom Vertical'
      });
      ContextPackRegistry.register(customPack);
      expect(ContextPackRegistry.has('custom_vertical')).toBe(true);
      expect(ContextPackRegistry.getContextPack('custom_vertical')).toBe(customPack);
    });
  });

  describe('OmniCore BusinessContext Layer Integration', () => {
    it('is properly mounted in OmniCoreV2 namespace', () => {
      expect(OmniCoreV2.BusinessContext).toBeDefined();
      expect(OmniCoreV2.BusinessContext.layer).toBe('BusinessContext');
      expect(OmniCoreV2.BusinessContext.getContextPack('retail')).toBe(RetailContextPack);
      expect(OmniCoreV2.BusinessContext.getContextPack('pharmacy')).toBe(PharmacyContextPack);
      expect(OmniCoreV2.BusinessContext.getContextPack('law')).toBe(LawFirmContextPack);
      expect(OmniCoreV2.BusinessContext.getContextPack('hotel')).toBe(HotelContextPack);
    });
  });
});
