import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ingestBrowserCapture, getUserCaptureSettings } from '../src/lib/clipadBrowserCaptureService';
import { createCapture } from '../src/lib/clipadCaptureService';
import { enqueueCaptureForProcessing } from '../src/lib/clipadCaptureQueueService';
import { isV3FeatureEnabled } from '../src/lib/clipadV3Flags';

// Mock dependencies
vi.mock('../src/lib/clipadCaptureService', () => ({
  createCapture: vi.fn().mockResolvedValue({ id: 'cap_123', visibility: 'PERSONAL' }),
  CAPTURE_VISIBILITY: { PERSONAL: 'PERSONAL' }
}));

vi.mock('../src/lib/clipadCaptureQueueService', () => ({
  enqueueCaptureForProcessing: vi.fn().mockResolvedValue({ id: 'queue_job_123' })
}));

vi.mock('../src/lib/clipadV3Flags', () => ({
  isV3FeatureEnabled: vi.fn(),
  V3_FLAGS: { BROWSER_CAPTURE_ENABLED: 'browser_capture_enabled' }
}));

const mockSettings = {
  is_capture_enabled: true,
  excluded_domains: ['private.com', 'bank.com']
};

vi.mock('../src/api/supabaseClient', () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => ({ data: mockSettings, error: null }))
  };
  return {
    supabase: {
      from: vi.fn(() => chain)
    }
  };
});

describe('Phase 6: Browser Extension Capture', () => {
  const user = { id: 'u1', company_id: 'c1' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects capture if global feature flag is disabled', async () => {
    isV3FeatureEnabled.mockReturnValue(false);
    
    await expect(ingestBrowserCapture(user, { url: 'https://example.com', domain: 'example.com' }))
      .rejects.toThrow('Browser capture is disabled globally');
  });

  it('rejects capture if domain is excluded', async () => {
    isV3FeatureEnabled.mockReturnValue(true);

    await expect(ingestBrowserCapture(user, { url: 'https://bank.com/account', domain: 'bank.com' }))
      .rejects.toThrow('Domain bank.com is excluded from capture');
  });

  it('successfully ingests valid capture, defaults to PERSONAL, and triggers contextualization', async () => {
    isV3FeatureEnabled.mockReturnValue(true);

    const payload = {
      url: 'https://docs.clipad.com/guide',
      domain: 'docs.clipad.com',
      pageTitle: 'Clipad Guide',
      selectedText: 'Some interesting insight',
      captureMode: 'highlight',
      extensionVersion: '1.2.0'
    };

    const result = await ingestBrowserCapture(user, payload);
    
    expect(result.id).toBe('cap_123');
    
    // Verify capture creation shape
    expect(createCapture).toHaveBeenCalledWith(expect.objectContaining({
      sourceType: 'browser_extension',
      captureType: 'LINK',
      visibility: 'PERSONAL',
      metadata: expect.objectContaining({
        url: 'https://docs.clipad.com/guide',
        domain: 'docs.clipad.com',
        capture_mode: 'highlight'
      })
    }));

    // Content formatting includes the selected text
    const createCallArgs = createCapture.mock.calls[0][0];
    expect(createCallArgs.content).toContain('Selected Content:');
    expect(createCallArgs.content).toContain('Some interesting insight');

    // Durable queueing triggered
    expect(enqueueCaptureForProcessing).toHaveBeenCalledWith(expect.objectContaining({
      captureId: 'cap_123',
      companyId: user.company_id,
      userId: user.id
    }));
  });
});
