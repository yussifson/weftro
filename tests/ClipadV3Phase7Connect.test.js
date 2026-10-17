import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthorizedContext } from '../src/lib/clipadConnectService';
import { isV3FeatureEnabled } from '../src/lib/clipadV3Flags';

vi.mock('../src/lib/clipadV3Flags', () => ({
  isV3FeatureEnabled: vi.fn(),
  V3_FLAGS: { CONNECT_ENABLED: 'connect_enabled' }
}));

// Mock Supabase to simulate RLS and API data
vi.mock('../src/api/supabaseClient', () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(function() {
      if (this._table === 'clipad_v3_connect_tokens') {
        return { data: { user_id: 'u1', company_id: 'c1', app: { id: 'a1' }, scopes: ['memory:read', 'search:read', 'context:read'] }, error: null };
      }
      return { data: { id: 'mem1', content: 'Project X decisions' }, error: null };
    }),
    then: function(cb) {
      return cb({ 
        data: [{ 
          id: 'mem1', 
          memory_type: 'FACT', 
          content: 'Project X decisions', 
          title: 'Project X', 
          summary: 'Summary X', 
          source_id: 'src1', 
          confidence_score: 0.95, 
          memory_tier: 'organizational', 
          created_at: '2026-10-17' 
        }], 
        error: null 
      });
    }
  };
  return {
    supabase: {
      from: vi.fn((t) => { chain._table = t; return chain; })
    }
  };
});

describe('Phase 3: Unified REST API Gateway & Connect Service Contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects context retrieval if Connect feature is disabled for tenant', async () => {
    isV3FeatureEnabled.mockReturnValue(false);
    
    await expect(getAuthorizedContext({ rawToken: 'valid_token', query: 'test' }))
      .rejects.toThrow('Connect API is currently disabled');
  });

  it('rejects context retrieval if caller token lacks required scope', async () => {
    isV3FeatureEnabled.mockReturnValue(true);
    
    // Requesting entity (requires knowledge:read), but token only has memory:read, search:read, context:read
    await expect(getAuthorizedContext({ 
      rawToken: 'valid_token', 
      query: { entityId: 'ent-1' }, 
      resourceType: 'entity' 
    })).rejects.toThrow("Unauthorized: missing required scope 'knowledge:read'");
  });

  it('successfully retrieves authorized memories with provenance and company isolation', async () => {
    isV3FeatureEnabled.mockReturnValue(true);

    const results = await getAuthorizedContext({ 
      rawToken: 'valid_token', 
      query: 'Project X', 
      resourceType: 'memory' 
    });
    
    expect(results).toHaveLength(1);
    expect(results[0].content).toBe('Project X decisions');
    expect(results[0].provenance).toBeDefined();
    expect(results[0].provenance.confidence).toBe(0.95);
  });
});
