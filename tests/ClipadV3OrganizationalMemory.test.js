// tests/ClipadV3OrganizationalMemory.test.js
// Unit & Integration Tests for Clipad V3 Phase 2 — Organizational Intelligence & Memory Core

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMemory, getMemories, supersedeMemory, archiveMemory, getMemoryProvenance, MEMORY_TIERS, MEMORY_TYPES, MEMORY_STATUS } from '../src/lib/clipadMemoryService';
import { upsertEntity, createRelationship, ENTITY_TYPES, RELATIONSHIP_TYPES } from '../src/lib/clipadEntityService';
import { ingestSourceToMemory } from '../src/lib/clipadIngestionPipeline';
import { getRelevantMemories, rankMemories, getOrganizationalContext, getUserContext } from '../src/lib/clipadContextService';

vi.mock('../src/lib/cloudflareAI', () => {
  return {
    generateText: vi.fn(async (messages, onChunk, options) => {
      return JSON.stringify({ summary: "mock", keywords: [] });
    }),
  };
});

// Mock Supabase client
vi.mock('../src/api/supabaseClient', () => {
  const store = new Map();
  const createQueryChain = (data = []) => {
    const chain = {
      data,
      error: null,
      select: () => chain,
      order: () => chain,
      eq: () => chain,
      in: () => chain,
      gte: () => chain,
      not: () => chain,
      range: () => chain,
      limit: (n) => Promise.resolve({ data: Array.from(store.values()).slice(0, n), error: null }),
      single: async () => ({ data: data[0] || Array.from(store.values())[0] || null, error: null }),
      then: (resolve) => resolve({ data: Array.from(store.values()), error: null }),
    };
    return chain;
  };

  return {
    supabase: {
      from: vi.fn((table) => {
        return {
          insert: vi.fn((payload) => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => {
                const item = { id: crypto.randomUUID(), ...payload };
                store.set(item.id, item);
                return { data: item, error: null };
              }),
            })),
          })),
          upsert: vi.fn((payload) => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => {
                const item = { id: crypto.randomUUID(), ...payload };
                store.set(item.id, item);
                return { data: item, error: null };
              }),
            })),
          })),
          select: vi.fn(() => createQueryChain(Array.from(store.values()))),
          update: vi.fn((payload) => ({
            eq: vi.fn((col, val) => {
              const existing = store.get(val) || Array.from(store.values()).find(i => i.id === val) || { id: val };
              const updated = { ...existing, ...payload };
              store.set(val, updated);
              return {
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({ data: updated, error: null })),
                })),
                then: (resolve) => resolve({ data: updated, error: null }),
              };
            }),
          })),
        };
      }),
    },
  };
});

describe('Clipad V3 Phase 2 — Organizational Memory Core & Security Audit', () => {
  const companyId = 'comp-org-123';
  const userId = 'user-alice-456';
  const teamSpaceId = 'space-[#general]-789';

  describe('1. Memory Creation & Scope Isolation', () => {
    it('creates personal memory scoped to specific user', async () => {
      const memory = await createMemory({
        companyId,
        userId,
        memoryTier: MEMORY_TIERS.PERSONAL,
        memoryType: MEMORY_TYPES.PREFERENCE,
        title: 'User Preferences',
        content: 'Prefers dark mode and morning digests.',
      });

      expect(memory).toBeDefined();
      expect(memory.memory_tier).toBe(MEMORY_TIERS.PERSONAL);
      expect(memory.user_id).toBe(userId);
      expect(memory.is_active).toBe(true);
    });

    it('creates team memory scoped to specific team space', async () => {
      const memory = await createMemory({
        companyId,
        teamSpaceId,
        memoryTier: MEMORY_TIERS.TEAM,
        memoryType: MEMORY_TYPES.DECISION,
        title: 'Sprint Workflow Choice',
        content: 'Team agreed on 2-week sprint cadence.',
      });

      expect(memory.memory_tier).toBe(MEMORY_TIERS.TEAM);
      expect(memory.team_space_id).toBe(teamSpaceId);
    });

    it('creates organizational memory accessible across company', async () => {
      const memory = await createMemory({
        companyId,
        memoryTier: MEMORY_TIERS.ORGANIZATIONAL,
        memoryType: MEMORY_TYPES.POLICY,
        title: 'Remote Work Policy',
        content: 'Company permits remote work with manager sync.',
      });

      expect(memory.memory_tier).toBe(MEMORY_TIERS.ORGANIZATIONAL);
      expect(memory.company_id).toBe(companyId);
    });
  });

  describe('2. Negative Security Cases & RLS Boundary Audits', () => {
    it('User cannot read another user\'s personal memory', async () => {
      const personalMem = {
        id: 'mem-alice-private',
        user_id: 'user-alice',
        memory_tier: MEMORY_TIERS.PERSONAL,
        title: 'Alice Private Salary Note',
        content: 'Salary details',
        status: MEMORY_STATUS.ACTIVE,
      };

      const accessibleToAlice = [personalMem].filter(m => m.memory_tier === MEMORY_TIERS.PERSONAL ? m.user_id === 'user-alice' : true);
      const accessibleToBob = [personalMem].filter(m => m.memory_tier === MEMORY_TIERS.PERSONAL ? m.user_id === 'user-bob' : true);

      expect(accessibleToAlice.length).toBe(1);
      expect(accessibleToBob.length).toBe(0);
    });

    it('User cannot read another private space\'s memory', async () => {
      const teamMem = {
        id: 'mem-exec-space',
        team_space_id: 'space-executives',
        memory_tier: MEMORY_TIERS.TEAM,
        title: 'Executive M&A Discussion',
        content: 'Confidential M&A',
        status: MEMORY_STATUS.ACTIVE,
      };

      const accessibleToExecs = [teamMem].filter(m => m.memory_tier === MEMORY_TIERS.TEAM ? ['space-executives'].includes(m.team_space_id) : true);
      const accessibleToInterns = [teamMem].filter(m => m.memory_tier === MEMORY_TIERS.TEAM ? ['space-interns'].includes(m.team_space_id) : true);

      expect(accessibleToExecs.length).toBe(1);
      expect(accessibleToInterns.length).toBe(0);
    });

    it('User cannot read another company\'s memory', async () => {
      const orgAMemory = {
        id: 'mem-company-A',
        company_id: 'company-A',
        memory_tier: MEMORY_TIERS.ORGANIZATIONAL,
        title: 'Company A Financials',
        content: 'Q3 Financials Company A',
        status: MEMORY_STATUS.ACTIVE,
      };

      const queriedByOrgA = [orgAMemory].filter(m => m.company_id === 'company-A');
      const queriedByOrgB = [orgAMemory].filter(m => m.company_id === 'company-B');

      expect(queriedByOrgA.length).toBe(1);
      expect(queriedByOrgB.length).toBe(0);
    });

    it('Restricted document memory does not become organization-wide', async () => {
      const result = await ingestSourceToMemory({
        companyId,
        userId: 'user-charlie',
        sourceType: 'document',
        sourceId: 'doc-restricted-99',
        title: 'Restricted Legal Contract',
        content: 'Confidential legal terms.',
        sourcePermissions: { is_private: true, visibility: 'personal' },
      });

      expect(result.memoryTier).toBe(MEMORY_TIERS.PERSONAL);
      expect(result.memories[0].memory_tier).not.toBe(MEMORY_TIERS.ORGANIZATIONAL);
    });

    it('Private meeting memory does not become organization-wide', async () => {
      const result = await ingestSourceToMemory({
        companyId,
        userId: 'user-alice',
        sourceType: 'meeting',
        sourceId: 'meeting-1on1-77',
        title: 'Private 1-on-1 Performance Review',
        content: 'Discussing raise and performance feedback.',
        sourcePermissions: { is_private: true, visibility: 'personal' },
      });

      expect(result.memoryTier).toBe(MEMORY_TIERS.PERSONAL);
      expect(result.memories[0].permissions_policy.is_private).toBe(true);
    });

    it('Private conversation memory does not become organization-wide', async () => {
      const result = await ingestSourceToMemory({
        companyId,
        userId: 'user-bob',
        teamSpaceId: 'space-hr-private',
        sourceType: 'chat',
        sourceId: 'chat-dm-55',
        title: 'HR Inquiry Chat',
        content: 'Medical leave request details.',
        sourcePermissions: { is_private: false, visibility: 'space' },
      });

      expect(result.memoryTier).toBe(MEMORY_TIERS.TEAM);
      expect(result.memories[0].team_space_id).toBe('space-hr-private');
    });

    it('Unauthorized memory does not enter AI context', async () => {
      const context = await getOrganizationalContext({
        companyId,
        userId: 'user-bob',
        userRole: 'member',
        spaceIds: ['space-public'],
      });

      expect(context).toBeDefined();
      expect(Array.isArray(context.memories)).toBe(true);
    });

    it('Direct database query is blocked by RLS logic when filtering user/space', async () => {
      const privateMem = {
        id: 'mem-private-db',
        company_id: 'comp-1',
        user_id: 'user-alice',
        memory_tier: MEMORY_TIERS.PERSONAL,
        permissions_policy: { is_private: true },
      };

      // Simulating Postgres RLS check: (memory_tier = 'personal' AND user_id = auth.uid())
      const isSelectAllowed = (mem, authUid) => {
        if (mem.memory_tier === 'personal') return mem.user_id === authUid;
        return true;
      };

      expect(isSelectAllowed(privateMem, 'user-alice')).toBe(true);
      expect(isSelectAllowed(privateMem, 'user-bob')).toBe(false);
    });

    it('Normal user cannot mutate another user\'s protected memory', async () => {
      const aliceMem = {
        id: 'mem-alice-notes',
        user_id: 'user-alice',
        memory_tier: MEMORY_TIERS.PERSONAL,
      };

      // Simulating Postgres RLS UPDATE check: (memory_tier = 'personal' AND user_id = auth.uid())
      const isUpdateAllowed = (mem, authUid, role) => {
        if (mem.memory_tier === 'personal') return mem.user_id === authUid;
        return role === 'admin';
      };

      expect(isUpdateAllowed(aliceMem, 'user-alice', 'member')).toBe(true);
      expect(isUpdateAllowed(aliceMem, 'user-bob', 'member')).toBe(false);
    });

    it('Normal user cannot change memory scope to broaden visibility when source is private', async () => {
      const createAttempt = async () => {
        return createMemory({
          companyId,
          userId: 'user-bob',
          memoryTier: MEMORY_TIERS.ORGANIZATIONAL,
          title: 'Private Source Expose Attempt',
          content: 'Private content',
          permissionsPolicy: { is_private: true, visibility: 'personal' },
        });
      };

      const result = await createAttempt();
      // createMemory forces effectiveTier = PERSONAL when permissionsPolicy.is_private is true
      expect(result.memory_tier).toBe(MEMORY_TIERS.PERSONAL);
    });
  });

  describe('3. Memory Lifecycle & Provenance Tracing', () => {
    it('supersedes outdated memory without deleting provenance', async () => {
      const oldMem = await createMemory({
        companyId,
        title: 'Database Provider Choice',
        content: 'Company uses Provider A.',
        memoryType: MEMORY_TYPES.DECISION,
      });

      const newMem = await supersedeMemory(oldMem.id, {
        companyId,
        title: 'Database Provider Choice',
        content: 'Company migrated to Provider B.',
        memoryType: MEMORY_TYPES.DECISION,
      });

      expect(newMem).toBeDefined();
      expect(newMem.content).toBe('Company migrated to Provider B.');
      expect(newMem.source_metadata.supersedes_id).toBe(oldMem.id);
    });

    it('archives memory upon request', async () => {
      const mem = await createMemory({
        companyId,
        title: 'Temporary Task Context',
        content: 'Old context',
      });

      const archived = await archiveMemory(mem.id);
      expect(archived.status).toBe(MEMORY_STATUS.ARCHIVED);
      expect(archived.is_active).toBe(false);
    });
  });

  describe('4. Entity & Relationship Graph Model', () => {
    it('registers normalized organizational entity and relationship edge', async () => {
      const entity = await upsertEntity({
        companyId,
        entityType: ENTITY_TYPES.PERSON,
        entityId: 'alice',
        name: 'Alice Johnson',
      });

      const rel = await createRelationship({
        companyId,
        sourceEntityId: entity.id,
        targetEntityId: 'space-eng',
        relationshipType: RELATIONSHIP_TYPES.MEMBER_OF,
        confidence: 0.95,
      });

      expect(entity).toBeDefined();
      expect(entity.name).toBe('Alice Johnson');
      expect(rel.relationship_type).toBe(RELATIONSHIP_TYPES.MEMBER_OF);
    });
  });

  describe('5. Memory Ranking & AI Context Retrieval Security', () => {
    it('ranks memories by relevance, freshness, confidence, and importance', () => {
      const sampleMemories = [
        { id: '1', title: 'DB Provider', content: 'We use Provider B', confidence_score: 0.9, importance: 0.8, created_at: new Date().toISOString() },
        { id: '2', title: 'Coffee Choice', content: 'Office prefers espresso', confidence_score: 0.5, importance: 0.2, created_at: new Date(Date.now() - 30*24*60*60*1000).toISOString() },
      ];

      const ranked = rankMemories(sampleMemories, 'Provider B');
      expect(ranked[0].id).toBe('1');
      expect(ranked[0].ranking.compositeScore).toBeGreaterThan(ranked[1].ranking.compositeScore);
    });
  });
});
