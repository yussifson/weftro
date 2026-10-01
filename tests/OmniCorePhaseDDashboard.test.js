/**
 * Unit Tests for OmniCore Phase D: Adaptive Dashboard UI Component & Route Integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdaptiveDashboard from '../src/pages/omnicore/AdaptiveDashboard';
import { BusinessProfileResolver } from '../src/omnicore/config/BusinessProfileResolver';
import { BusinessHealth } from '../src/omnicore/intelligence/BusinessHealth';
import { ActionCenter } from '../src/omnicore/intelligence/ActionCenter';
import { Analytics } from '../src/omnicore/capabilities/Analytics';
import { Scheduling } from '../src/omnicore/capabilities/Scheduling';
import { Reporting } from '../src/omnicore/capabilities/Reporting';
import { OrbitPilotGate } from '../src/omnicore/orbit/OrbitPilotGate';

describe('OmniCore Phase D: AdaptiveDashboard Architecture & Integration', () => {

  const testCompanyId = 'comp-hospital-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies AdaptiveDashboard is exported as a valid React component function', () => {
    expect(typeof AdaptiveDashboard).toBe('function');
    expect(AdaptiveDashboard.name).toBe('AdaptiveDashboard');
  });

  it('resolves business profile and dynamic terminology for tenant company', () => {
    const mockCompany = { id: testCompanyId, industry_type: 'hospital' };
    const profile = BusinessProfileResolver.resolveSync(mockCompany);

    expect(profile.companyId).toBe(testCompanyId);
    expect(profile.industry).toBe('hospital');
    expect(profile.terms.client).toBe('Patient');
    expect(profile.terms.case).toBe('Admission');
    expect(profile.terms.staff).toBeDefined();
    expect(profile.contextPack.name).toBe('Hospital');
  });

  it('integrates signals across Analytics, Health, and ActionCenter for dashboard composition', async () => {
    // 1. Executive Analytics
    const execSummary = await Analytics.getExecutiveSummary('');
    expect(execSummary.revenue).toBe(0);
    expect(execSummary.supplierSpend).toBe(0);

    // 2. Business Health Radar
    const health = await BusinessHealth.evaluateHealth('');
    expect(health.overallStatus).toBeDefined();

    // 3. Action Center Feed
    const feed = await ActionCenter.getActionCenterFeed('');
    expect(feed.summary.totalActions).toBe(0);
    expect(feed.summary.categories).toBeDefined();

    // 4. Scheduling Roster
    const schedule = await Scheduling.getStaffSchedule('', '');
    expect(schedule.totalTasks).toBe(0);

    // 5. Operations Report
    const report = await Reporting.getWeeklyOperationsReport('');
    expect(report.reportType).toBe('weekly_operations');
  });

  it('verifies OrbitPilotGate authorizes allowlisted pilot companies for dashboard access', () => {
    const pilotConfig = {
      omnicore_enabled: true,
      slate_v2_enabled: true,
      pilot_companies: ['pilot-comp-001']
    };
    expect(OrbitPilotGate.isPilotCompanyActiveSync('pilot-comp-001', pilotConfig)).toBe(true);
    expect(OrbitPilotGate.isPilotCompanyActiveSync('unauthorized-company-xyz', pilotConfig)).toBe(false);
  });
});
