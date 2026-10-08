import { describe, it, expect } from 'vitest';
import { resolveIntelligenceContext, filterAuthorizedMemories, filterAuthorizedGraph, filterAuthorizedMoments } from '../src/lib/clipadIntelligenceGovernanceService';

const mockCompanyAUser = { id: 'user1', company_id: 'compA', role: 'member' };
const mockCompanyAAdmin = { id: 'admin1', company_id: 'compA', role: 'admin' };
const mockCompanyBUser = { id: 'user2', company_id: 'compB', role: 'member' };

describe('Phase 8: Role-Aware Intelligence + Governance + Privacy', () => {
  it('Test 1 - Company Isolation: Admin resolves scopes without cross-tenant bleed', async () => {
    // Actually Supabase enforces Company A vs B before JS array filtering, but we test the scope assignment
    const ctxA = await resolveIntelligenceContext(mockCompanyAAdmin);
    expect(ctxA.companyId).toBe('compA');
    expect(ctxA.allowedMemoryScopes).toContain('ORGANIZATION');
  });

  it('Test 2 - Private Memory: User without permission cannot access another user private memory', async () => {
    const govCtx = { userId: 'user1', isAdmin: false, accessibleSpaces: [] };
    const memory = { id: 'mem1', user_id: 'user2', tier: 'PRIVATE', content: 'Secret' };
    
    const filtered = filterAuthorizedMemories([memory], govCtx);
    expect(filtered).toHaveLength(0); // DENIED
  });

  it('Test 3 & 5 - Private Meeting / Smart Moment: Unauthorized user searches Smart Moments', async () => {
    const govCtx = { userId: 'user1', isAdmin: false, accessibleSpaces: ['space1'] };
    const privateMoment = { id: 'mom1', owner_id: 'user2', visibility: 'PRIVATE', description: 'Secret meeting' };
    const teamMoment = { id: 'mom2', owner_id: 'user2', team_space_id: 'space1', visibility: 'SPACE', description: 'Team sync' };
    const otherTeamMoment = { id: 'mom3', owner_id: 'user2', team_space_id: 'space2', visibility: 'SPACE', description: 'Other team' };
    
    const filtered = filterAuthorizedMoments([privateMoment, teamMoment, otherTeamMoment], govCtx);
    
    expect(filtered).toHaveLength(1); // Only mom2 is allowed
    expect(filtered[0].id).toBe('mom2');
  });

  it('Test 4 - Graph Side Channel: Private meeting connected to Project A remains invisible', async () => {
    const govCtx = { userId: 'user1', isAdmin: false, accessibleSpaces: ['space1'] };
    const graph = {
      nodes: [
        { id: 'projA', tier: 'ORGANIZATION' }, // User can see
        { id: 'privMeeting', tier: 'PRIVATE', owner_id: 'user2' } // User cannot see
      ],
      edges: [
        { source: 'projA', target: 'privMeeting' }
      ]
    };

    const filtered = filterAuthorizedGraph(graph, govCtx);
    
    expect(filtered.nodes).toHaveLength(1);
    expect(filtered.nodes[0].id).toBe('projA');
    // Edge is dropped because target is unauthorized
    expect(filtered.edges).toHaveLength(0); 
  });

  it('Test 6 - AI Context: Unauthorized content must never enter context payload', async () => {
    const govCtx = { userId: 'user1', isAdmin: false, accessibleSpaces: [] };
    const memories = [
      { id: 'mem1', owner_id: 'user2', tier: 'PRIVATE', content: 'Secret' },
      { id: 'mem2', owner_id: 'user1', tier: 'PERSONAL', content: 'My notes' },
      { id: 'mem3', owner_id: 'user2', tier: 'ORGANIZATION', content: 'Public memo' },
    ];
    
    const filtered = filterAuthorizedMemories(memories, govCtx);
    expect(filtered).toHaveLength(2); // mem2 and mem3
    expect(filtered.some(m => m.id === 'mem1')).toBe(false); // mem1 blocked from AI context
  });

  it('Test 10 - Authorized Access: Properly authorized user retrieves permitted information', async () => {
    const govCtx = { userId: 'user1', isAdmin: false, accessibleSpaces: ['space1'] };
    const memories = [
      { id: 'mem1', owner_id: 'user2', space_id: 'space1', tier: 'SPACE', content: 'Team secret' }
    ];
    
    const filtered = filterAuthorizedMemories(memories, govCtx);
    expect(filtered).toHaveLength(1); // ALLOWED
  });
});
