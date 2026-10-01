// src/lib/clipadIngestionPipeline.js
// Clipad V3 Controlled Knowledge Ingestion Pipeline
// Transforms raw source data (meetings, transcripts, documents, chat, async videos) into permission-aware memories and entity relationships.

import { defaultAIProvider } from '@/lib/clipadAIProvider';
import { createMemory, MEMORY_TIERS, MEMORY_TYPES, MEMORY_STATUS } from '@/lib/clipadMemoryService';
import { upsertEntity, createRelationship, ENTITY_TYPES, RELATIONSHIP_TYPES } from '@/lib/clipadEntityService';

/**
 * Ingest raw content into normalized, permission-aware memory candidates.
 */
export async function ingestSourceToMemory({
  companyId,
  userId = null,
  teamSpaceId = null,
  sourceType, // 'meeting' | 'document' | 'chat' | 'video' | 'imported_knowledge'
  sourceId,
  sourceUrl = null,
  title,
  content,
  speakerName = null,
  sourcePermissions = { visibility: 'inherit', is_private: false },
}) {
  if (!companyId || !content || !sourceType || !sourceId) {
    throw new Error('companyId, content, sourceType, and sourceId are required for ingestion.');
  }

  // 1. Determine Memory Tier based on Source Permissions
  let memoryTier = MEMORY_TIERS.ORGANIZATIONAL;
  if (sourcePermissions.is_private || sourcePermissions.visibility === 'personal') {
    memoryTier = MEMORY_TIERS.PERSONAL;
  } else if (teamSpaceId || sourcePermissions.visibility === 'space') {
    memoryTier = MEMORY_TIERS.TEAM;
  }

  // 2. Structured Extraction with AIProvider
  const extractionSchema = `
Return a JSON object with:
- "summary": string summary of the core knowledge (max 200 chars)
- "memories": array of items, each with:
    - "type": "FACT" | "DECISION" | "COMMITMENT" | "PROCESS" | "POLICY" | "PROJECT_CONTEXT" | "INSIGHT"
    - "title": concise memory title
    - "content": detailed memory statement
    - "importance": float 0.0 - 1.0
    - "confidence": float 0.0 - 1.0
- "entities": array of extracted entity names/types:
    - "name": string
    - "type": "person" | "project" | "team" | "document" | "decision"
- "relationships": array of connections:
    - "source_name": string
    - "target_name": string
    - "relationship": "member_of" | "participated_in" | "belongs_to" | "produced" | "creates" | "relates_to" | "concerns"
`;

  let extractedData = null;
  try {
    extractedData = await defaultAIProvider.extract(
      `Source Title: "${title}"\nContent:\n${content.substring(0, 4000)}`,
      extractionSchema
    );
  } catch (err) {
    console.warn('[ingestSourceToMemory] AI extraction warning:', err.message);
  }

  const memoryCandidates = [];
  const memoryItems = Array.isArray(extractedData?.memories) ? extractedData.memories : [];

  // Fallback memory if no structured memories returned by LLM
  if (memoryItems.length === 0) {
    memoryItems.push({
      type: 'SUMMARY',
      title: `Summary of ${title}`,
      content: extractedData?.summary || content.substring(0, 300),
      importance: 0.5,
      confidence: 0.85,
    });
  }

  // 3. Persist Derived Memories with Provenance
  for (const item of memoryItems) {
    const memType = Object.values(MEMORY_TYPES).includes(item.type) ? item.type : MEMORY_TYPES.FACT;
    const created = await createMemory({
      companyId,
      userId,
      teamSpaceId,
      memoryTier,
      memoryType: memType,
      title: item.title || title,
      content: item.content || content.substring(0, 300),
      summary: extractedData?.summary || item.title,
      confidenceScore: item.confidence ?? 0.9,
      importance: item.importance ?? 0.5,
      sourceType,
      sourceId,
      sourceUrl,
      sourceMetadata: {
        source_title: title,
        ingested_at: new Date().toISOString(),
        source_permissions: sourcePermissions,
      },
      speakerName,
      permissionsPolicy: {
        visibility: sourcePermissions.visibility || 'inherit',
        is_private: sourcePermissions.is_private || false,
        allowed_space_id: teamSpaceId,
      },
      status: MEMORY_STATUS.ACTIVE,
    });
    memoryCandidates.push(created);
  }

  // 4. Register Extracted Entities & Relationships (Graph-Ready Model)
  if (Array.isArray(extractedData?.entities)) {
    for (const ent of extractedData.entities) {
      if (ent.name && ent.type) {
        await upsertEntity({
          companyId,
          entityType: Object.values(ENTITY_TYPES).includes(ent.type) ? ent.type : ENTITY_TYPES.KNOWLEDGE,
          entityId: `${sourceType}:${sourceId}:${ent.name.toLowerCase().replace(/\s+/g, '_')}`,
          name: ent.name,
        });
      }
    }
  }

  return {
    sourceId,
    sourceType,
    memoryTier,
    memoriesCreated: memoryCandidates.length,
    memories: memoryCandidates,
    extractedEntities: extractedData?.entities || [],
  };
}
