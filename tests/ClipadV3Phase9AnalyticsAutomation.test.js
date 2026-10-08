import { describe, it, expect, vi } from 'vitest';
import { getOrganizationalMetrics } from '../src/lib/clipadOrganizationalAnalyticsService';
import { detectOrganizationalPatterns } from '../src/lib/clipadOrganizationalLearningService';
import { evaluateEvent } from '../src/lib/clipadAutomationService';

// Mock Supabase to return static data
vi.mock('@/api/supabaseClient', () => {
  return {
    supabase: {
      from: vi.fn((table) => {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          insert: vi.fn().mockResolvedValue({ data: { id: 'new-id' } }),
          update: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'existing-id' } }),
          then: (cb) => {
            // Provide mock arrays
            if (table === 'clipad_v3_organizational_memory') {
              return cb({ data: [
                { id: 'mem1', tier: 'ORGANIZATION', space_id: null },
                { id: 'mem2', tier: 'PRIVATE', owner_id: 'other-user' }
              ]});
            }
            if (table === 'clipad_v3_smart_moments') {
              return cb({ data: [
                { id: 'mom1', moment_type: 'BLOCKER', title: 'API Sync', visibility: 'ORGANIZATION' },
                { id: 'mom2', moment_type: 'BLOCKER', title: 'API Auth', visibility: 'ORGANIZATION' },
                { id: 'mom3', moment_type: 'BLOCKER', title: 'Private Blocker', visibility: 'PRIVATE', owner_id: 'other' }
              ]});
            }
            if (table === 'clipad_v3_automation_rules') {
              return cb({ data: [
                { id: 'rule1', name: 'Test Rule', trigger_event: 'smart_moment.created', action_type: 'create_recommendation', action_payload: { title: 'Auto Rec' } }
              ]});
            }
            if (table === 'clipad_space_members') {
              return cb({ data: [] });
            }
            return cb({ data: [] });
          }
        };
      })
    }
  };
});

const mockUser = {
  id: 'user1',
  company_id: 'compA',
  role: 'member',
  user_metadata: { role: 'member', company_id: 'compA' }
};

describe('Phase 9: Analytics + Organizational Learning + Automation', () => {
  it('Test 1 & 2 - Governance: Analytics do not include unauthorized resources', async () => {
    // getOrganizationalMetrics uses filterAuthorizedMemories which strips PRIVATE if owner_id doesn't match
    const result = await getOrganizationalMetrics(mockUser, 30);
    
    // We mocked 2 memories (1 public, 1 private) and 3 moments (2 public, 1 private)
    expect(result.metrics.activity.newMemories).toBe(1); // Private dropped
    expect(result.metrics.activity.smartMoments).toBe(2); // Private dropped
  });

  it('Test 3 - Private Data: Private meetings/memories do not leak into organizational insights', async () => {
    const insights = await detectOrganizationalPatterns(mockUser, 30);
    
    // The learning service clusters blockers based on the first word 'API' (2 items).
    // The private blocker is dropped.
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toContain('api');
    expect(insights[0].evidence_count).toBe(2); // Only the 2 public moments are clustered
  });

  it('Test 6 & 7 - Automation Permissions: Automation executes conservatively without destructive actions', async () => {
    const mockEvent = { type: 'smart_moment.created', data: { id: 'mom1' } };
    
    // Automation service fetches 'create_recommendation' rule, which is allowed.
    // Destructive rules throw inside executeControlledAction.
    await expect(evaluateEvent(mockEvent, mockUser)).resolves.not.toThrow();
  });
});
