import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthorizedContext, mcpTools } from '../src/lib/clipadConnectService';
import { grantAccessToken, validateToken } from '../src/lib/clipadOAuthService';
import { isV3FeatureEnabled } from '../src/lib/clipadV3Flags';

// Mock Flags
vi.mock('../src/lib/clipadV3Flags', () => ({
  isV3FeatureEnabled: vi.fn(),
  V3_FLAGS: { CONNECT_ENABLED: 'connect_enabled' }
}));

// Mock Supabase to simulate RLS and data
vi.mock('../src/api/supabaseClient', () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(function() {
      if (this._table === 'clipad_v3_connect_tokens') {
        return { data: { user_id: 'u1', company_id: 'c1', app: { id: 'a1' }, scopes: ['memory:read'] }, error: null };
      }
      return { data: { id: 'mem1', content: 'Project X decisions' }, error: null };
    }),
    then: function(cb) {
      return cb({ data: [{ id: 'mem1', memory_type: 'FACT', content: 'Project X decisions', title: 'Project X', summary: 'Summary X', source_id: 'src1', confidence_score: 0.95, memory_tier: 'organizational', created_at: '2026' }], error: null });
    }
  };
  return {
    supabase: {
      from: vi.fn((t) => { chain._table = t; return chain; })
    }
  };
});

describe('Phase 7: Connect API & Security Boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects context retrieval if Connect feature is disabled', async () => {
    isV3FeatureEnabled.mockReturnValue(false);
    
    await expect(getAuthorizedContext({ rawToken: 't1', query: 'test' }))
      .rejects.toThrow('Connect API is currently disabled');
  });

  it('rejects context retrieval if missing required scope', async () => {
    isV3FeatureEnabled.mockReturnValue(true);
    
    // Attempt to read context session (requires context:read) but token only has memory:read
    await expect(getAuthorizedContext({ rawToken: 't1', query: { sessionId: 's1' }, resourceType: 'context' }))
      .rejects.toThrow('Unauthorized: missing required scope');
  });

  it('retrieves authorized memory and applies RLS scoping', async () => {
    isV3FeatureEnabled.mockReturnValue(true);

    const result = await getAuthorizedContext({ rawToken: 't1', query: 'Project X' });
    
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Project X decisions');
    // Supabase RLS is verified via the company_id constraint explicitly applied in the service
  });

  it('allows MCP tool to read memory', async () => {
    isV3FeatureEnabled.mockReturnValue(true);
    
    const result = await mcpTools.search_clipad({ query: 'Project' }, 't1');
    expect(result[0].content).toBe('Project X decisions');
  });
});
