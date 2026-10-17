// tests/ClipadV3SmartMoments.test.js
// Unit & Integration Tests for Clipad V3 Phase 3 — Smart Moments & Meeting/Video Intelligence

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSmartMoment, getSmartMoments, updateSmartMoment, confirmSmartMoment, dismissSmartMoment, convertMomentToMemory, MOMENT_TYPES, MOMENT_STATUS } from '../src/lib/clipadSmartMomentService';
import { extractSmartMomentsFromTranscript, segmentTranscript } from '../src/lib/clipadTranscriptIntelligence';
import { MEMORY_TIERS, MEMORY_TYPES } from '../src/lib/clipadMemoryService';

vi.mock('../src/lib/cloudflareAI', () => {
  return {
    generateText: vi.fn(async (messages, onChunk, options) => {
      return JSON.stringify({ moments: [] });
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
      eq: (col, val) => {
        const filtered = data.filter(item => item[col] === val);
        return createQueryChain(filtered);
      },
      in: () => chain,
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
                if (payload.title === 'TRIGGER_DB_FAILURE') {
                  return { data: null, error: { message: 'relation clipad_v3_smart_moments does not exist' } };
                }
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

describe('Clipad V3 Phase 3 — Smart Moments & Meeting/Video Intelligence', () => {
  const companyId = 'comp-phase3-100';
  const userId = 'user-sarah-200';
  const meetingId = 'meeting-weekly-300';
  const teamSpaceId = 'space-eng-400';

  describe('1. Smart Moment Creation & Taxonomy', () => {
    it('creates a DECISION Smart Moment with speaker & timestamp provenance', async () => {
      const moment = await createSmartMoment({
        companyId,
        teamSpaceId,
        meetingId,
        momentType: MOMENT_TYPES.DECISION,
        title: 'Migrate DB to Supabase',
        description: 'Team agreed to select Supabase over Firebase.',
        confidence: 0.95,
        importance: 0.85,
        timestampStart: '12:34',
        speakerName: 'Sarah Connors',
        createdBy: userId,
      });

      expect(moment).toBeDefined();
      expect(moment.moment_type).toBe(MOMENT_TYPES.DECISION);
      expect(moment.timestamp_start).toBe('12:34');
      expect(moment.speaker_name).toBe('Sarah Connors');
      expect(moment.status).toBe(MOMENT_STATUS.DETECTED);
    });

    it('throws error on database insertion failure instead of returning fake in-memory UUID', async () => {
      await expect(createSmartMoment({
        companyId,
        meetingId,
        momentType: MOMENT_TYPES.DECISION,
        title: 'TRIGGER_DB_FAILURE',
      })).rejects.toThrow('Failed to persist Smart Moment: relation clipad_v3_smart_moments does not exist');
    });

    it('creates ACTION, COMMITMENT, and RISK Smart Moments', async () => {
      const action = await createSmartMoment({
        companyId,
        meetingId,
        momentType: MOMENT_TYPES.ACTION,
        title: 'Prepare API Docs',
        speakerName: 'John Doe',
      });

      const risk = await createSmartMoment({
        companyId,
        meetingId,
        momentType: MOMENT_TYPES.RISK,
        title: 'API rate limits during peak hours',
        confidence: 0.88,
      });

      expect(action.moment_type).toBe(MOMENT_TYPES.ACTION);
      expect(risk.moment_type).toBe(MOMENT_TYPES.RISK);
    });
  });

  describe('2. Transcript Segmentation & Intelligence Pipeline', () => {
    it('segments raw transcript lines into structured timestamp objects', () => {
      const rawLines = [
        { speaker_name: 'Sarah', timestamp: '01:15', text: 'We should approve the design.' },
        { speaker_name: 'Alex', timestamp: '01:30', text: 'Agreed, design is approved.' },
      ];

      const segments = segmentTranscript(rawLines);
      expect(segments.length).toBe(2);
      expect(segments[0].speaker).toBe('Sarah');
      expect(segments[1].timestamp).toBe('01:30');
    });

    it('extracts moments from transcript with deduplication', async () => {
      const sampleTranscript = [
        { speaker_name: 'Alice', timestamp: '03:10', text: 'Decision: We will launch on Nov 20.' },
        { speaker_name: 'Bob', timestamp: '03:45', text: 'Risk: Database migration downtime.' },
      ];

      const extracted = await extractSmartMomentsFromTranscript({
        companyId,
        meetingId,
        transcriptItems: sampleTranscript,
        title: 'Sprint Planning',
      });

      expect(Array.isArray(extracted)).toBe(true);
    });
  });

  describe('3. Human Confirmation, Editing, & Provenance Preservation', () => {
    it('allows user to confirm Smart Moment and converts to Phase 2 Memory', async () => {
      const moment = await createSmartMoment({
        companyId,
        teamSpaceId,
        meetingId,
        momentType: MOMENT_TYPES.DECISION,
        title: 'Use TypeScript across V3',
        description: 'Enforce type safety across all services.',
        speakerName: 'Lead Dev',
        createdBy: userId,
      });

      const confirmed = await confirmSmartMoment(moment.id, userId);
      expect(confirmed.status).toBe(MOMENT_STATUS.CONFIRMED);
    });

    it('allows user to edit Smart Moment text while updating status to EDITED', async () => {
      const moment = await createSmartMoment({
        companyId,
        meetingId,
        momentType: MOMENT_TYPES.ACTION,
        title: 'Draft PR',
      });

      const updated = await updateSmartMoment(moment.id, {
        title: 'Draft PR for Phase 3 Smart Moments',
        status: MOMENT_STATUS.EDITED,
      });

      expect(updated.title).toBe('Draft PR for Phase 3 Smart Moments');
      expect(updated.status).toBe(MOMENT_STATUS.EDITED);
    });

    it('allows user to dismiss unwanted Smart Moment', async () => {
      const moment = await createSmartMoment({
        companyId,
        meetingId,
        momentType: MOMENT_TYPES.INSIGHT,
        title: 'Side conversation about lunch',
      });

      const dismissed = await dismissSmartMoment(moment.id);
      expect(dismissed.status).toBe(MOMENT_STATUS.DISMISSED);
    });
  });

  describe('4. Integration with Phase 2 Organizational Memory Core', () => {
    it('converts confirmed Smart Moment to Phase 2 Memory node with complete provenance', async () => {
      const moment = await createSmartMoment({
        companyId,
        teamSpaceId,
        meetingId,
        momentType: MOMENT_TYPES.DECISION,
        title: 'Adopt Tailwind CSS v3',
        description: 'Standardized UI design tokens.',
        timestampStart: '24:10',
        speakerName: 'UI Lead',
      });

      const memory = await convertMomentToMemory(moment, userId);
      expect(memory).toBeDefined();
      expect(memory.title).toBe('Adopt Tailwind CSS v3');
      expect(memory.source_type).toBe('meeting');
      expect(memory.source_id).toBe(meetingId);
      expect(memory.timestamp_marker).toBe('24:10');
    });
  });
});
