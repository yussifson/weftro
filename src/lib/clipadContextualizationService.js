// src/lib/clipadContextualizationService.js
import { generateText } from '@/lib/cloudflareAI';
import { getCapture, updateCapture, CAPTURE_STATUS } from './clipadCaptureService';
import { createMemory, MEMORY_TIERS, MEMORY_TYPES, MEMORY_STATUS } from './clipadMemoryService';
import { upsertEntity, createRelationship, ENTITY_TYPES, RELATIONSHIP_TYPES } from './clipadEntityService';
import { supabase } from '@/api/supabaseClient';

/**
 * Process a capture to extract context, create memories, and link entities.
 * Expected to be run asynchronously (e.g. background job).
 */
export async function contextualizeCapture(captureId) {
  // 1. Fetch Capture
  const capture = await getCapture(captureId);
  if (!capture) throw new Error('Capture not found');

  if (capture.status === CAPTURE_STATUS.ARCHIVED || capture.status === CAPTURE_STATUS.DISMISSED) {
    return capture;
  }

  // Idempotency check / state transition
  await updateCapture(captureId, { status: CAPTURE_STATUS.PROCESSING });

  try {
    // 2. Extract Metadata & Memory Candidates using AI
    const extractionPrompt = `
You are an intelligent organizational assistant. Analyze the following capture content.
Extract key entities, topics, potential decisions, action items, and determine if this is a strong candidate for organizational memory.
Respond ONLY in valid JSON format matching this schema:
{
  "entities": [{"name": "Name", "type": "person|organization|project|topic"}],
  "topics": ["topic1"],
  "possible_decisions": ["decision1"],
  "possible_actions": ["action1"],
  "importance": 0.0-1.0,
  "memory_candidate": boolean,
  "memory_summary": "Short summary if memory candidate"
}

Capture Title: ${capture.title || 'Untitled'}
Content:
${capture.content || ''}
    `;

    const aiMessages = [
      { role: 'system', content: 'You extract structured metadata from context.' },
      { role: 'user', content: extractionPrompt }
    ];

    let aiResultText;
    try {
      aiResultText = await generateText(aiMessages);
    } catch (e) {
      console.warn('AI generation failed, proceeding with basic metadata.', e);
      aiResultText = JSON.stringify({ entities: [], topics: [], possible_decisions: [], possible_actions: [], importance: 0.5, memory_candidate: false });
    }

    // Attempt to parse JSON response (handle markdown wrapping if present)
    let extraction;
    try {
      const cleanJson = aiResultText.replace(/```json/g, '').replace(/```/g, '').trim();
      extraction = JSON.parse(cleanJson);
    } catch (e) {
      console.warn('Failed to parse AI output, proceeding with defaults.', e);
      extraction = { entities: [], topics: [], possible_decisions: [], possible_actions: [], importance: 0.5, memory_candidate: false };
    }

    // 3. Entity integration
    if (extraction.entities && extraction.entities.length > 0) {
      for (const ent of extraction.entities) {
        let entityType = ENTITY_TYPES.KNOWLEDGE;
        if (ent.type === 'person') entityType = ENTITY_TYPES.PERSON;
        if (ent.type === 'organization') entityType = ENTITY_TYPES.ORGANIZATION;
        if (ent.type === 'project') entityType = ENTITY_TYPES.PROJECT;

        await upsertEntity({
          companyId: capture.company_id,
          entityType,
          name: ent.name,
          sourceId: `capture_entity_${ent.name}`,
          visibility: capture.visibility === 'ORGANIZATIONAL' ? 'organization' : 'personal'
        });
        // We could create relationships here if we had more context
      }
    }

    // 4. Memory Integration (Only if authorized and appropriate)
    let memoryCandidateId = null;
    if (extraction.memory_candidate && capture.visibility === 'ORGANIZATIONAL') {
      const memory = await createMemory({
        companyId: capture.company_id,
        userId: capture.user_id,
        memoryTier: MEMORY_TIERS.ORGANIZATIONAL,
        memoryType: MEMORY_TYPES.FACT,
        title: `Insight from ${capture.title || capture.capture_type}`,
        content: capture.content,
        summary: extraction.memory_summary || `Extracted from capture ${captureId}`,
        importance: extraction.importance || 0.5,
        sourceType: 'capture',
        sourceId: captureId,
        metadata: {
          capture_type: capture.capture_type,
          topics: extraction.topics
        }
      });
      memoryCandidateId = memory.id;
    }

    // 5. Finalize capture processing
    const updated = await updateCapture(captureId, {
      status: CAPTURE_STATUS.CONTEXTUALIZED,
      processed_at: new Date().toISOString(),
      metadata: {
        ...capture.metadata,
        extracted_topics: extraction.topics,
        memory_candidate_id: memoryCandidateId
      }
    });

    return updated;
  } catch (error) {
    console.error('Contextualization failed:', error);
    await updateCapture(captureId, { status: CAPTURE_STATUS.FAILED });
    throw error;
  }
}
