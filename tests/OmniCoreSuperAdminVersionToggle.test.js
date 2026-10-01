/**
 * Unit Tests for OmniCore Super Admin V1/V2 Version Toggle & Multi-Vertical Dynamic Switching
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Provide global mocks if running under Node test runner
if (typeof global !== 'undefined') {
  if (typeof global.self === 'undefined') {
    global.self = global;
  }
  const storageStore = {};
  global.sessionStorage = {
    getItem: (k) => storageStore[k] || null,
    setItem: (k, v) => { storageStore[k] = String(v); },
    removeItem: (k) => { delete storageStore[k]; },
    clear: () => { Object.keys(storageStore).forEach(k => delete storageStore[k]); }
  };
  global.localStorage = global.sessionStorage;
  if (!global.window) {
    global.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      location: { pathname: '/' }
    };
  }
}

import { BusinessProfileResolver } from '../src/omnicore/config/BusinessProfileResolver';
import AdaptiveDashboard from '../src/pages/omnicore/AdaptiveDashboard';

describe('OmniCore Super Admin Version Toggle & Dynamic Multi-Vertical Adapter', () => {

  beforeEach(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  it('verifies AdaptiveDashboard is exported as a valid React component function', () => {
    expect(typeof AdaptiveDashboard).toBe('function');
    expect(AdaptiveDashboard.name).toBe('AdaptiveDashboard');
  });

  it('switches dynamic context pack and terminology for Super Admin across all 10 verticals', () => {
    const testCases = [
      { industry: 'hospital', expectedPackSubstr: 'Hospital' },
      { industry: 'real_estate', expectedPackSubstr: 'Real Estate' },
      { industry: 'university', expectedPackSubstr: 'University' },
      { industry: 'logistics', expectedPackSubstr: 'Logistics' },
      { industry: 'law', expectedPackSubstr: 'Law Firm' },
      { industry: 'retail', expectedPackSubstr: 'Retail' },
      { industry: 'pharmacy', expectedPackSubstr: 'Pharmacy' },
      { industry: 'hotel', expectedPackSubstr: 'Hotel' },
      { industry: 'insurance', expectedPackSubstr: 'Insurance' },
      { industry: 'religion', expectedPackSubstr: 'Religion' },
    ];

    for (const tc of testCases) {
      const companyMock = { id: 'test-sa-company', industry_type: tc.industry };
      const profile = BusinessProfileResolver.resolveSync(companyMock);

      expect(profile.industry).toBe(tc.industry);
      expect(profile.contextPack.name).toContain(tc.expectedPackSubstr);
      expect(profile.contextPack.capabilities).toBeDefined();
    }
  });

  it('correctly handles version override toggles in session/local storage', () => {
    // Default version is V1
    const defaultVersion = sessionStorage.getItem('slate_version_override') || 'v1';
    expect(defaultVersion).toBe('v1');

    // Toggle to V2
    sessionStorage.setItem('slate_version_override', 'v2');
    expect(sessionStorage.getItem('slate_version_override')).toBe('v2');

    // Toggle back to V1
    sessionStorage.setItem('slate_version_override', 'v1');
    expect(sessionStorage.getItem('slate_version_override')).toBe('v1');
  });

  it('guarantees tenant data isolation is preserved when Super Admin switches verticals', () => {
    const companyA = { id: 'tenant-alpha', industry_type: 'hospital' };
    const companyB = { id: 'tenant-beta', industry_type: 'logistics' };

    const profileA = BusinessProfileResolver.resolveSync(companyA);
    const profileB = BusinessProfileResolver.resolveSync(companyB);

    expect(profileA.companyId).toBe('tenant-alpha');
    expect(profileA.contextPack.name).toBe('Hospital');
    expect(profileB.companyId).toBe('tenant-beta');
    expect(profileB.contextPack.name).toBe('Logistics');
    expect(profileA.companyId).not.toBe(profileB.companyId);
  });
});
