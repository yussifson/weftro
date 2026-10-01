/**
 * Unit Tests for OmniCore Phase C:
 * Remaining Industry Context Packs (Real Estate, Hospital, University, Logistics, Insurance, Religion).
 */

import { describe, it, expect } from 'vitest';
import {
  BusinessContext,
  ContextPackRegistry,
  RealEstateContextPack,
  HospitalContextPack,
  UniversityContextPack,
  LogisticsContextPack,
  InsuranceContextPack,
  ReligiousOrgContextPack,
  RetailContextPack,
  PharmacyContextPack,
  LawFirmContextPack,
  HotelContextPack
} from '../src/omnicore/context';

describe('OmniCore Phase C: Industry Context Packs', () => {

  // ═══════════════════════════════════════════════════════════════
  // 1. REAL ESTATE CONTEXT PACK
  // ═══════════════════════════════════════════════════════════════
  describe('RealEstateContextPack', () => {
    it('binds terminology and capability settings for real estate operations', () => {
      expect(RealEstateContextPack.industryKey).toBe('real_estate');
      expect(RealEstateContextPack.capabilities.CustomerManagement.mode).toBe('leads_tenants_buyers');
      expect(RealEstateContextPack.capabilities.Sales.mode).toBe('property_sales_and_deals');
      expect(RealEstateContextPack.capabilities.Finance.mode).toBe('real_estate_accounting');
      expect(RealEstateContextPack.dashboard.primaryMetrics).toContain('active_listings_count');
      expect(RealEstateContextPack.dashboard.primaryMetrics).toContain('land_parcels_under_management');
      expect(RealEstateContextPack.industrySpecific.specializedEntities).toContain('properties');
      expect(RealEstateContextPack.industrySpecific.specializedEntities).toContain('land_parcels');
    });

    it('resolves real estate terminology dynamically from industries.js', () => {
      const clientTerm = RealEstateContextPack.getTerm('client');
      expect(clientTerm).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. HOSPITAL CONTEXT PACK
  // ═══════════════════════════════════════════════════════════════
  describe('HospitalContextPack', () => {
    it('binds healthcare clinical settings and patient records', () => {
      expect(HospitalContextPack.industryKey).toBe('hospital');
      expect(HospitalContextPack.capabilities.CustomerManagement.mode).toBe('patient_health_records');
      expect(HospitalContextPack.capabilities.Sales.mode).toBe('clinical_encounters_and_services');
      expect(HospitalContextPack.capabilities.Finance.mode).toBe('medical_billing_and_claims');
      expect(HospitalContextPack.dashboard.primaryMetrics).toContain('inpatient_bed_occupancy_rate');
      expect(HospitalContextPack.industrySpecific.specializedEntities).toContain('patients');
      expect(HospitalContextPack.industrySpecific.specializedEntities).toContain('prescriptions');
    });

    it('resolves healthcare terminology dynamically from industries.js', () => {
      const clientTerm = HospitalContextPack.getTerm('client');
      expect(clientTerm).toBe('Patient');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. UNIVERSITY / HIGHER EDUCATION CONTEXT PACK
  // ═══════════════════════════════════════════════════════════════
  describe('UniversityContextPack', () => {
    it('binds academic enrollment, degree audits, and tuition billing', () => {
      expect(UniversityContextPack.industryKey).toBe('university');
      expect(UniversityContextPack.capabilities.CustomerManagement.mode).toBe('student_academic_records');
      expect(UniversityContextPack.capabilities.Sales.mode).toBe('academic_enrollment_and_programs');
      expect(UniversityContextPack.capabilities.Finance.mode).toBe('tuition_and_scholarship_billing');
      expect(UniversityContextPack.dashboard.primaryMetrics).toContain('total_enrolled_students');
      expect(UniversityContextPack.industrySpecific.specializedEntities).toContain('students');
      expect(UniversityContextPack.industrySpecific.specializedEntities).toContain('courses');
    });

    it('resolves academic student terminology dynamically from industries.js', () => {
      const clientTerm = UniversityContextPack.getTerm('client');
      expect(clientTerm).toBe('Student');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. LOGISTICS & FREIGHT CONTEXT PACK
  // ═══════════════════════════════════════════════════════════════
  describe('LogisticsContextPack', () => {
    it('binds freight shipments, driver dispatch, and waybill billing', () => {
      expect(LogisticsContextPack.industryKey).toBe('logistics');
      expect(LogisticsContextPack.capabilities.CustomerManagement.mode).toBe('shippers_consignees_brokers');
      expect(LogisticsContextPack.capabilities.Sales.mode).toBe('freight_orders_and_shipments');
      expect(LogisticsContextPack.capabilities.Finance.mode).toBe('freight_billing_and_fleet_expenses');
      expect(LogisticsContextPack.dashboard.primaryMetrics).toContain('active_shipments_in_transit');
      expect(LogisticsContextPack.industrySpecific.specializedEntities).toContain('shipments');
      expect(LogisticsContextPack.industrySpecific.specializedEntities).toContain('waybills');
    });

    it('resolves logistics terminology dynamically from industries.js', () => {
      const clientTerm = LogisticsContextPack.getTerm('client');
      expect(clientTerm).toBe('Shipper');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. INSURANCE & UNDERWRITING CONTEXT PACK
  // ═══════════════════════════════════════════════════════════════
  describe('InsuranceContextPack', () => {
    it('binds policy administration, claims settlement, and premium billing', () => {
      expect(InsuranceContextPack.industryKey).toBe('insurance');
      expect(InsuranceContextPack.capabilities.CustomerManagement.mode).toBe('policyholders_and_beneficiaries');
      expect(InsuranceContextPack.capabilities.Sales.mode).toBe('policy_quotes_and_underwriting');
      expect(InsuranceContextPack.capabilities.Finance.mode).toBe('premium_billing_and_claims_settlement');
      expect(InsuranceContextPack.dashboard.primaryMetrics).toContain('gross_written_premium');
      expect(InsuranceContextPack.industrySpecific.specializedEntities).toContain('policies');
      expect(InsuranceContextPack.industrySpecific.specializedEntities).toContain('claims');
    });

    it('resolves insurance terminology dynamically from industries.js', () => {
      const clientTerm = InsuranceContextPack.getTerm('client');
      expect(clientTerm).toBe('Policyholder');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. RELIGIOUS ORGANIZATIONS CONTEXT PACK
  // ═══════════════════════════════════════════════════════════════
  describe('ReligiousOrgContextPack', () => {
    it('binds congregant management, tithe contributions, and stewardship accounting', () => {
      expect(ReligiousOrgContextPack.industryKey).toBe('religion');
      expect(ReligiousOrgContextPack.capabilities.CustomerManagement.mode).toBe('congregants_and_families');
      expect(ReligiousOrgContextPack.capabilities.Sales.mode).toBe('donations_and_event_registrations');
      expect(ReligiousOrgContextPack.capabilities.Finance.mode).toBe('fund_and_stewardship_accounting');
      expect(ReligiousOrgContextPack.dashboard.primaryMetrics).toContain('active_congregation_count');
      expect(ReligiousOrgContextPack.industrySpecific.specializedEntities).toContain('congregants');
      expect(ReligiousOrgContextPack.industrySpecific.specializedEntities).toContain('donations');
    });

    it('resolves congregant terminology dynamically from industries.js', () => {
      const clientTerm = ReligiousOrgContextPack.getTerm('client');
      expect(clientTerm).toBe('Member');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. REGISTRY & ALIAS RESOLUTION
  // ═══════════════════════════════════════════════════════════════
  describe('ContextPackRegistry', () => {
    it('returns all 10 registered primary vertical context packs', () => {
      const registeredKeys = ContextPackRegistry.list();
      expect(registeredKeys).toContain('retail');
      expect(registeredKeys).toContain('pharmacy');
      expect(registeredKeys).toContain('law');
      expect(registeredKeys).toContain('hotel');
      expect(registeredKeys).toContain('real_estate');
      expect(registeredKeys).toContain('hospital');
      expect(registeredKeys).toContain('university');
      expect(registeredKeys).toContain('logistics');
      expect(registeredKeys).toContain('insurance');
      expect(registeredKeys).toContain('religion');
      expect(registeredKeys.length).toBe(10);
    });

    it('resolves aliases accurately (real_estate_jcl -> real_estate, school/highschool -> university)', () => {
      const jclPack = ContextPackRegistry.getContextPack('real_estate_jcl');
      expect(jclPack).toBe(RealEstateContextPack);

      const schoolPack = ContextPackRegistry.getContextPack('school');
      expect(schoolPack).toBe(UniversityContextPack);

      const highschoolPack = ContextPackRegistry.getContextPack('highschool');
      expect(highschoolPack).toBe(UniversityContextPack);

      const vocationalPack = ContextPackRegistry.getContextPack('vocational');
      expect(vocationalPack).toBe(UniversityContextPack);
    });

    it('provides dynamic fallback pack for unmapped industries in industries.js', () => {
      const fallbackPack = ContextPackRegistry.getContextPack('optavel');
      expect(fallbackPack).toBeDefined();
      expect(fallbackPack.industryKey).toBe('optavel');
      expect(fallbackPack.metadata.layer).toBe('BusinessContext');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. BUSINESS CONTEXT NAMESPACE VERIFICATION
  // ═══════════════════════════════════════════════════════════════
  describe('BusinessContext Namespace Exports', () => {
    it('verifies BusinessContext exports all 10 packs', () => {
      expect(BusinessContext.packs.retail).toBe(RetailContextPack);
      expect(BusinessContext.packs.pharmacy).toBe(PharmacyContextPack);
      expect(BusinessContext.packs.law).toBe(LawFirmContextPack);
      expect(BusinessContext.packs.hotel).toBe(HotelContextPack);
      expect(BusinessContext.packs.real_estate).toBe(RealEstateContextPack);
      expect(BusinessContext.packs.hospital).toBe(HospitalContextPack);
      expect(BusinessContext.packs.university).toBe(UniversityContextPack);
      expect(BusinessContext.packs.logistics).toBe(LogisticsContextPack);
      expect(BusinessContext.packs.insurance).toBe(InsuranceContextPack);
      expect(BusinessContext.packs.religion).toBe(ReligiousOrgContextPack);
      expect(Object.keys(BusinessContext.packs).length).toBe(10);
    });
  });
});
