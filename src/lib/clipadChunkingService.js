// src/lib/clipadChunkingService.js
// Weftro V3 — Structure-Aware Document & Transcript Chunking Engine
// Author: AGENT-RAG (Phase 4 Implementation)
//
// Features:
// 1. Structure-Aware Segmentation:
//    - Respects Markdown headings (# ## ###), double newlines (\n\n), and bullet points
//    - Preserves transcript speaker labels (e.g., "Speaker 1:", "Alice:", "Host:")
//    - Preserves timestamp markers (e.g., "[00:15]", "(01:23:45)", "02:14 -")
// 2. Configurable Window & Overlap:
//    - Default target: ~500 tokens (~2000 characters)
//    - Default overlap: ~50 tokens (~200 characters)
// 3. Boundary Safety & Idempotency:
//    - Empty / whitespace inputs safely return []
//    - Short content (< target chunk size) returns a single complete chunk without truncation
//    - Oversized documents chunk cleanly without losing trailing text
//    - Deterministic chunk indexing (0, 1, 2...) with parent provenance metadata

export const CHUNKING_DEFAULTS = {
  TARGET_CHARS: 2000,    // ~500 tokens (avg 4 chars/token in English)
  OVERLAP_CHARS: 200,    // ~50 tokens overlap
  MIN_CHUNK_CHARS: 100,  // Minimum chunk threshold to prevent trivial trailing fragments
};

// Regex patterns to detect structure boundaries and transcript metadata
const SECTION_BREAK_REGEX = /(?:\r?\n){2,}/; // Double newline / paragraph break
const HEADING_REGEX = /^(?:#{1,6}\s+|[A-Z0-9\s_-]{3,}:)/m; // Markdown header or uppercase label
const SPEAKER_LABEL_REGEX = /(?:^|\n)(?:\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*)?(?:(?:Speaker\s*\d+|[A-Z][a-zA-Z0-9_.\s]{1,24})\s*:\s*)/i;
const TIMESTAMP_REGEX = /\[?\b\d{1,2}:\d{2}(?::\d{2})?\b\]?/g;

/**
 * Extract speaker and timestamp markers present in a given text block.
 * @param {string} text
 * @returns {{ speaker: string|null, timestamps: string[] }}
 */
export function extractChunkProvenance(text) {
  if (!text || typeof text !== 'string') return { speaker: null, timestamps: [] };

  let speaker = null;
  const speakerMatch = text.match(SPEAKER_LABEL_REGEX);
  if (speakerMatch) {
    const rawMatch = speakerMatch[0].trim();
    const colonIdx = rawMatch.lastIndexOf(':');
    if (colonIdx !== -1) {
      speaker = rawMatch.slice(0, colonIdx)
        .replace(/\[?\b\d{1,2}:\d{2}(?::\d{2})?\b\]?/g, '')
        .replace(/[\[\]]/g, '')
        .trim();
    }
  }

  const timestampMatches = text.match(TIMESTAMP_REGEX) || [];
  const uniqueTimestamps = Array.from(new Set(timestampMatches.map(ts => ts.replace(/[\[\]]/g, '').trim())));

  return {
    speaker,
    timestamps: uniqueTimestamps,
  };
}

/**
 * Split text into semantic segments (paragraphs, headings, speaker turns).
 * @param {string} text
 * @returns {string[]}
 */
export function splitIntoSemanticUnits(text) {
  if (!text || typeof text !== 'string') return [];

  // Step 1: Split along natural paragraph breaks
  const rawParagraphs = text.split(SECTION_BREAK_REGEX);
  const semanticUnits = [];

  for (const para of rawParagraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // If paragraph contains multiple speaker turns, further break on speaker labels
    const speakerTurns = trimmed.split(/(?=(?:^|\n)(?:\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*)?(?:Speaker\s*\d+|[A-Z][a-zA-Z0-9_.\s]{1,20})\s*:)/i);

    for (const turn of speakerTurns) {
      const turnTrimmed = turn.trim();
      if (turnTrimmed) {
        semanticUnits.push(turnTrimmed);
      }
    }
  }

  return semanticUnits;
}

/**
 * Structure-Aware Chunking Engine
 *
 * @param {Object} options
 * @param {string} options.content - The long-form text content or transcript
 * @param {string} [options.title=''] - Optional title of parent document
 * @param {string} [options.parentId=null] - Parent record ID (knowledge_id, video_id, doc_id)
 * @param {string} [options.parentType='document'] - Source type ('knowledge', 'video', 'meeting', 'doc')
 * @param {number} [options.targetChars=CHUNKING_DEFAULTS.TARGET_CHARS]
 * @param {number} [options.overlapChars=CHUNKING_DEFAULTS.OVERLAP_CHARS]
 * @param {Object} [options.metadata={}] - Additional parent metadata to attach
 * @returns {Array<Object>} List of structured, indexed chunks with provenance
 */
export function chunkTextContent({
  content,
  title = '',
  parentId = null,
  parentType = 'document',
  targetChars = CHUNKING_DEFAULTS.TARGET_CHARS,
  overlapChars = CHUNKING_DEFAULTS.OVERLAP_CHARS,
  metadata = {},
}) {
  if (!content || typeof content !== 'string') return [];

  const trimmed = content.trim();
  if (trimmed.length === 0) return [];

  // Short content optimization: If within target chunk size, return single full chunk
  if (trimmed.length <= targetChars) {
    const prov = extractChunkProvenance(trimmed);
    return [{
      chunk_index: 0,
      content: trimmed,
      char_count: trimmed.length,
      estimated_tokens: Math.ceil(trimmed.length / 4),
      speaker: prov.speaker,
      timestamps: prov.timestamps,
      parent_id: parentId,
      parent_type: parentType,
      parent_title: title,
      metadata: { ...metadata },
    }];
  }

  const units = splitIntoSemanticUnits(trimmed);
  const chunks = [];
  let currentBuffer = [];
  let currentLength = 0;
  let chunkIndex = 0;

  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    const unitLen = unit.length;

    // Handle single oversized unit (e.g. unbroken wall of text without newlines)
    if (unitLen > targetChars) {
      // Flush any current accumulated buffer first
      if (currentBuffer.length > 0) {
        const text = currentBuffer.join('\n\n').trim();
        if (text.length > 0) {
          const prov = extractChunkProvenance(text);
          chunks.push({
            chunk_index: chunkIndex++,
            content: text,
            char_count: text.length,
            estimated_tokens: Math.ceil(text.length / 4),
            speaker: prov.speaker,
            timestamps: prov.timestamps,
            parent_id: parentId,
            parent_type: parentType,
            parent_title: title,
            metadata: { ...metadata },
          });
        }
        currentBuffer = [];
        currentLength = 0;
      }

      // Hard-slice oversized unit cleanly with sentence or word boundary snapping
      let start = 0;
      while (start < unitLen) {
        let end = Math.min(start + targetChars, unitLen);
        if (end < unitLen) {
          // Look back for last sentence end or space
          const lastPeriod = unit.lastIndexOf('. ', end);
          const lastSpace = unit.lastIndexOf(' ', end);
          if (lastPeriod > start + targetChars * 0.7) {
            end = lastPeriod + 1;
          } else if (lastSpace > start + targetChars * 0.7) {
            end = lastSpace;
          }
        }

        const sliceText = unit.slice(start, end).trim();
        if (sliceText.length > 0) {
          const prov = extractChunkProvenance(sliceText);
          chunks.push({
            chunk_index: chunkIndex++,
            content: sliceText,
            char_count: sliceText.length,
            estimated_tokens: Math.ceil(sliceText.length / 4),
            speaker: prov.speaker,
            timestamps: prov.timestamps,
            parent_id: parentId,
            parent_type: parentType,
            parent_title: title,
            metadata: { ...metadata, is_split_segment: true },
          });
        }

        start = Math.max(end - overlapChars, start + 1);
        if (start >= unitLen) break;
      }
      continue;
    }

    // Normal accumulation
    if (currentLength + unitLen + 2 > targetChars && currentBuffer.length > 0) {
      // Create chunk from currentBuffer
      const chunkText = currentBuffer.join('\n\n').trim();
      const prov = extractChunkProvenance(chunkText);
      chunks.push({
        chunk_index: chunkIndex++,
        content: chunkText,
        char_count: chunkText.length,
        estimated_tokens: Math.ceil(chunkText.length / 4),
        speaker: prov.speaker,
        timestamps: prov.timestamps,
        parent_id: parentId,
        parent_type: parentType,
        parent_title: title,
        metadata: { ...metadata },
      });

      // Prepare next buffer with overlap from the tail of currentBuffer
      const overlapUnits = [];
      let overlapLen = 0;
      for (let j = currentBuffer.length - 1; j >= 0; j--) {
        const u = currentBuffer[j];
        if (overlapLen + u.length <= overlapChars) {
          overlapUnits.unshift(u);
          overlapLen += u.length;
        } else {
          break;
        }
      }

      currentBuffer = [...overlapUnits, unit];
      currentLength = currentBuffer.reduce((sum, u) => sum + u.length, 0);
    } else {
      currentBuffer.push(unit);
      currentLength += unitLen + 2;
    }
  }

  // Flush remaining buffer
  if (currentBuffer.length > 0) {
    const trailingText = currentBuffer.join('\n\n').trim();
    if (trailingText.length > 0) {
      const prov = extractChunkProvenance(trailingText);
      chunks.push({
        chunk_index: chunkIndex++,
        content: trailingText,
        char_count: trailingText.length,
        estimated_tokens: Math.ceil(trailingText.length / 4),
        speaker: prov.speaker,
        timestamps: prov.timestamps,
        parent_id: parentId,
        parent_type: parentType,
        parent_title: title,
        metadata: { ...metadata },
      });
    }
  }

  return chunks;
}
