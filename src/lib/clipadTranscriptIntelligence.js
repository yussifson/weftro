// src/lib/clipadTranscriptIntelligence.js
// Clipad V3 Transcript Segmentation & Smart Moment Extraction Intelligence Engine

import { defaultAIProvider } from '@/lib/clipadAIProvider';
import { createSmartMoment, getSmartMoments, MOMENT_TYPES, MOMENT_STATUS } from '@/lib/clipadSmartMomentService';

/**
 * Segment and format raw transcript entries for structured LLM analysis.
 */
export function segmentTranscript(transcriptItems = []) {
  if (!Array.isArray(transcriptItems) || transcriptItems.length === 0) return [];

  return transcriptItems.map((item, idx) => {
    const speaker = item.speaker_name || item.speaker || `Speaker ${(idx % 2) + 1}`;
    const timestamp = item.timestamp || item.start_time || `${Math.floor((idx * 15) / 60)}:${String((idx * 15) % 60).padStart(2, '0')}`;
    const text = item.text || item.content || '';
    return {
      index: idx,
      speaker,
      timestamp,
      text,
    };
  });
}

/**
 * Perform structured AI extraction on meeting transcript to discover Smart Moments.
 */
export async function extractSmartMomentsFromTranscript({
  companyId,
  teamSpaceId = null,
  meetingId = null,
  videoId = null,
  transcriptItems = [],
  title = 'Meeting Conversation',
}) {
  if (!companyId || (!meetingId && !videoId)) {
    throw new Error('companyId and meetingId/videoId are required for transcript intelligence.');
  }

  const segments = segmentTranscript(transcriptItems);
  if (segments.length === 0) return [];

  const formattedTranscript = segments
    .map(s => `[${s.timestamp}] ${s.speaker}: "${s.text}"`)
    .join('\n');

  const extractionSchema = `
Return a JSON object with a "moments" array. Each item MUST have:
- "moment_type": "DECISION" | "ACTION" | "COMMITMENT" | "QUESTION" | "RISK" | "BLOCKER" | "INSIGHT" | "FOLLOW_UP" | "IMPORTANT_TOPIC" | "AGREEMENT" | "DISAGREEMENT" | "CHANGE"
- "title": concise, action-oriented title (max 80 chars)
- "description": 1-2 sentence description explaining the moment and context
- "confidence": float between 0.0 and 1.0 (e.g. 0.92)
- "importance": float between 0.0 and 1.0 (e.g. 0.75)
- "timestamp_start": timestamp string when this moment occurred (e.g. "04:15")
- "speaker_name": string speaker name who made the statement
`;

  let extractedMoments = [];
  try {
    const response = await defaultAIProvider.extract(
      `Conversation Title: "${title}"\nTranscript:\n${formattedTranscript.substring(0, 8000)}`,
      extractionSchema
    );
    if (Array.isArray(response?.moments)) {
      extractedMoments = response.moments;
    }
  } catch (err) {
    console.warn('[extractSmartMomentsFromTranscript] AI extraction fallback:', err.message);
  }

  // Deduplication check: fetch existing moments for this meeting/video
  const existingMoments = await getSmartMoments({ companyId, meetingId, videoId });
  const existingKeys = new Set(existingMoments.map(m => `${m.title.toLowerCase().trim()}|${m.timestamp_start || ''}`));

  const createdMoments = [];
  for (const item of extractedMoments) {
    const key = `${(item.title || '').toLowerCase().trim()}|${item.timestamp_start || ''}`;
    if (!item.title || existingKeys.has(key)) {
      continue; // Skip duplicate moments
    }

    const typeKey = (item.moment_type || '').toUpperCase();
    const momentType = Object.values(MOMENT_TYPES).includes(typeKey) ? typeKey : MOMENT_TYPES.INSIGHT;

    const moment = await createSmartMoment({
      companyId,
      teamSpaceId,
      meetingId,
      videoId,
      momentType,
      title: item.title,
      description: item.description,
      content: item.description || item.title,
      confidence: item.confidence ?? 0.88,
      importance: item.importance ?? 0.50,
      timestampStart: item.timestamp_start || null,
      speakerName: item.speaker_name || null,
      status: MOMENT_STATUS.DETECTED,
    });

    if (moment) {
      createdMoments.push(moment);
      existingTitles.add(item.title.toLowerCase().trim());
    }
  }

  return createdMoments;
}
