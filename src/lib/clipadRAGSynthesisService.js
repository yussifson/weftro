// src/lib/clipadRAGSynthesisService.js
// Weftro V3 — Grounded RAG Synthesis Service
//
// Responsibilities:
//   1. Format retrieved evidence into a grounded LLM prompt
//   2. Detect unextractable documents (scanned PDFs, image-only, storage errors) and
//      PREVENT their processing metadata from leaking into the answer as fact
//   3. Produce honest abstention responses when all relevant evidence is unextractable
//   4. When there is a mix, synthesize from usable evidence only and cite unextractable
//      docs separately so users can click through to them
//   5. Validate citations and tag them with provenance metadata for the UI
//   6. Stage 3 Addition: Distinguish direct evidence from related context, capping related
//      context at a separate budget of max 4,000 characters while preserving the 18,000 max total budget.

import { generateText, TASK_TYPES } from '@/lib/cloudflareAI';

// ─────────────────────────────────────────────────────────────────────────────
// SYNTHESIS STATUS CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
export const SYNTHESIS_STATUS = {
  GROUNDED: 'grounded',                          // Answer backed by usable evidence
  INSUFFICIENT_EVIDENCE: 'insufficient_evidence', // No evidence covers the query
  UNEXTRACTABLE_ONLY: 'unextractable_only',       // All relevant docs are image/scan PDFs
  MIXED_EXTRACTABILITY: 'mixed_extractability',   // Synthesized from usable; some unextractable
  ERROR: 'error',                                // Service failure
};

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACTION ERROR MARKER DETECTION
// ─────────────────────────────────────────────────────────────────────────────
const UNEXTRACTABLE_MARKERS = [
  'pdf parsed successfully but contained only vector graphics',
  'rasterized image scan',
  'scanned image scan',
  'no extractable text',
  'no text content found',
  'storage fetch error',
  'nosuchkey',
  'failed to fetch',
  'extraction_status: unsupported_or_failed',
  'unsupported_or_failed',
  'http 400',
  'bad request',
  'content extraction failed',
  'could not extract text',
  'image-based pdf',
  'pdf contains only images',
  'text layer not present',
  'ocr required',
];

export function isUnextractableContent(content) {
  if (!content || typeof content !== 'string') return true;
  const lower = content.toLowerCase().trim();
  if (lower.length < 5) return true;
  return UNEXTRACTABLE_MARKERS.some(marker => lower.includes(marker));
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT TOKEN & CONTEXT BUDGETS
// ─────────────────────────────────────────────────────────────────────────────
const MAX_EVIDENCE_CHARS_PER_ITEM = 2000;  // per evidence item
const MAX_TOTAL_EVIDENCE_CHARS    = 18000; // whole evidence pack total budget
const MAX_RELATED_CONTEXT_CHARS   = 4000;  // Stage 3: Dedicated sub-budget for relationship-expanded context

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT EVIDENCE PACK
// Converts retrieved results into grounded direct and related context blocks.
// ─────────────────────────────────────────────────────────────────────────────
export function formatEvidencePack(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      evidenceText: '',
      directEvidenceText: '',
      relatedEvidenceText: '',
      citationMap: [],
      usableCount: 0,
      unextractableItems: [],
      relatedItemsCount: 0,
    };
  }

  const citationMap = [];
  const unextractableItems = [];
  const directBlocks = [];
  const relatedBlocks = [];

  let directChars = 0;
  let relatedChars = 0;
  let directIndex = 1;
  let relatedIndex = 1;

  for (const item of items) {
    const title = item.label || item.title || item.name || 'Untitled';
    const rawContent = item.snippet || item.content || item.summary || item.description || '';
    const isRelated = item.isRelatedEvidence === true;

    // Detect extraction failures
    if (isUnextractableContent(rawContent)) {
      unextractableItems.push({
        id: item.id,
        title,
        type: item.type || 'doc',
        isUnextractable: true,
        unextractableReason: detectUnextractableReason(rawContent),
        url: item.url || item.file_url || null,
        isRelatedEvidence: isRelated,
      });
      continue;
    }

    const truncated = rawContent.length > MAX_EVIDENCE_CHARS_PER_ITEM;
    const contentSlice = truncated
      ? rawContent.slice(0, MAX_EVIDENCE_CHARS_PER_ITEM) + '\n[... content truncated ...]'
      : rawContent;

    if (isRelated) {
      // Related context expansion: enforce separate MAX_RELATED_CONTEXT_CHARS sub-budget
      if (relatedChars + contentSlice.length > MAX_RELATED_CONTEXT_CHARS || (directChars + relatedChars + contentSlice.length) > MAX_TOTAL_EVIDENCE_CHARS) {
        citationMap.push({
          index: `R${relatedIndex}`,
          id: item.id,
          title,
          type: item.type,
          isTruncated: true,
          isUnextractable: false,
          isRelatedEvidence: true,
          relationship: item.relationship || null,
          url: item.url || item.file_url || null,
        });
        relatedIndex++;
        continue;
      }

      const relInfo = item.relationship
        ? ` (Related via ${item.relationship.type} to "${item.relationship.seedTitle || 'search seed'}")`
        : '';
      const block = `[RELATED CONTEXT #R${relatedIndex}: ${title}${relInfo}]\nTYPE: ${item.type || 'unknown'}\nCONTENT:\n${contentSlice}`;
      relatedBlocks.push(block);
      relatedChars += block.length;

      citationMap.push({
        index: `R${relatedIndex}`,
        id: item.id,
        title,
        type: item.type,
        isTruncated: truncated,
        isUnextractable: false,
        isRelatedEvidence: true,
        relationship: item.relationship || null,
        url: item.url || item.file_url || null,
      });
      relatedIndex++;
    } else {
      // Direct evidence
      if (directChars + relatedChars + contentSlice.length > MAX_TOTAL_EVIDENCE_CHARS) {
        citationMap.push({
          index: `${directIndex}`,
          id: item.id,
          title,
          type: item.type,
          isTruncated: true,
          isUnextractable: false,
          isRelatedEvidence: false,
          url: item.url || item.file_url || null,
        });
        directIndex++;
        continue;
      }

      const block = `[SOURCE #${directIndex}: ${title}]\nTYPE: ${item.type || 'unknown'}\nCONTENT:\n${contentSlice}`;
      directBlocks.push(block);
      directChars += block.length;

      citationMap.push({
        index: `${directIndex}`,
        id: item.id,
        title,
        type: item.type,
        isTruncated: truncated,
        isUnextractable: false,
        isRelatedEvidence: false,
        url: item.url || item.file_url || null,
      });
      directIndex++;
    }
  }

  const fullEvidenceParts = [];
  if (directBlocks.length > 0) {
    fullEvidenceParts.push(directBlocks.join('\n\n---\n\n'));
  }
  if (relatedBlocks.length > 0) {
    fullEvidenceParts.push('=== RELATED ORGANIZATIONAL CONTEXT (1-HOP RELATIONSHIPS) ===\n\n' + relatedBlocks.join('\n\n---\n\n'));
  }

  return {
    evidenceText: fullEvidenceParts.join('\n\n======\n\n'),
    directEvidenceText: directBlocks.join('\n\n---\n\n'),
    relatedEvidenceText: relatedBlocks.join('\n\n---\n\n'),
    citationMap,
    usableCount: directBlocks.length + relatedBlocks.length,
    directCount: directBlocks.length,
    relatedItemsCount: relatedBlocks.length,
    unextractableItems,
  };
}

function detectUnextractableReason(content) {
  if (!content) return 'EMPTY_CONTENT';
  const lower = (content || '').toLowerCase();
  if (lower.includes('vector graphics') || lower.includes('rasterized')) return 'SCANNED_OR_IMAGE_PDF';
  if (lower.includes('nosuchkey') || lower.includes('storage fetch error')) return 'STORAGE_NOT_FOUND';
  if (lower.includes('http 400') || lower.includes('bad request')) return 'EXTRACTION_API_ERROR';
  if (lower.includes('no extractable text') || lower.includes('no text content')) return 'NO_TEXT_LAYER';
  return 'UNKNOWN_EXTRACTION_FAILURE';
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  return `You are Orbit, an organizational AI assistant for Weftro.

RULES — follow these exactly:
1. Answer ONLY using the evidence provided in the EVIDENCE PACK below.
2. Distinguish direct evidence (cited as [#1], [#2]) from related organizational context (cited as [#R1], [#R2]).
3. Do NOT claim that a related connected record proves a statement unless its actual content supports that statement.
4. If the evidence does not contain enough information to answer the question, say so clearly and honestly.
5. Keep answers concise. Use bullet points for lists. Use markdown headings where helpful.
6. Never expose internal system metadata, extraction errors, or storage paths in your answer.
7. Never fabricate policies, procedures, decisions, or data.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CANNED MESSAGES
// ─────────────────────────────────────────────────────────────────────────────
function buildInsufficientEvidenceMessage(query) {
  return `I don't have enough information in the organizational knowledge base to answer **"${query}"**.\n\nTry:\n- Broadening your search terms\n- Checking connected integrations (Google Drive, Notion, etc.)\n- Uploading or syncing relevant documents`;
}

function buildUnextractableOnlyMessage(query, unextractableItems) {
  const docList = unextractableItems
    .map(d => `- **${d.title}** *(${d.unextractableReason.replace(/_/g, ' ').toLowerCase()})*`)
    .join('\n');

  return `The following document(s) were found that may be relevant to **"${query}"**, but their contents could not be extracted for AI analysis:\n\n${docList}\n\nThis typically happens with scanned PDFs or image-only files that have no selectable text layer. To make these searchable, consider:\n- Re-uploading a text-based PDF version\n- Running OCR on the document before uploading\n- Pasting the document text directly into a Weftro space document`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT: synthesizeGroundedAnswer
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Synthesizes a grounded, cited AI answer from retrieved organizational evidence.
 *
 * @param {Object} params
 * @param {string} params.query - The user's search query
 * @param {Array<Object>} params.retrievedEvidence - Retrieved search results from SearchHub
 * @param {Object} [params.user] - Authenticated user context
 * @param {Function} [params.onStream] - Optional streaming callback (text: string) => void
 *
 * @returns {Promise<{
 *   answer: string,
 *   sources: Array<Object>,
 *   citations: { valid: Array<Object>, unextractable: Array<Object> } | null,
 *   status: string,
 *   grounded: boolean
 * }>}
 */
export async function synthesizeGroundedAnswer({
  query,
  retrievedEvidence = [],
  user,
  onStream,
}) {
  if (!query?.trim()) {
    return {
      answer: buildInsufficientEvidenceMessage('(empty query)'),
      sources: [],
      citations: null,
      status: SYNTHESIS_STATUS.INSUFFICIENT_EVIDENCE,
      grounded: false,
    };
  }

  // ── Step 1: Separate usable evidence from unextractable documents ──
  const { evidenceText, citationMap, usableCount, unextractableItems, directCount, relatedItemsCount } =
    formatEvidencePack(retrievedEvidence);

  // ── Step 2: All-unextractable — honest abstention with document citations ──
  if (usableCount === 0 && unextractableItems.length > 0) {
    const answer = buildUnextractableOnlyMessage(query, unextractableItems);
    if (onStream) onStream(answer);
    return {
      answer,
      sources: unextractableItems,
      citations: {
        valid: [],
        unextractable: unextractableItems,
      },
      status: SYNTHESIS_STATUS.UNEXTRACTABLE_ONLY,
      grounded: false,
    };
  }

  // ── Step 3: No evidence at all ──
  if (usableCount === 0) {
    const answer = buildInsufficientEvidenceMessage(query);
    if (onStream) onStream(answer);
    return {
      answer,
      sources: [],
      citations: null,
      status: SYNTHESIS_STATUS.INSUFFICIENT_EVIDENCE,
      grounded: false,
    };
  }

  // ── Step 4: Build grounded LLM prompt using ONLY usable evidence ──
  const userPrompt = `QUERY: ${query.trim()}

EVIDENCE PACK (${usableCount} source${usableCount === 1 ? '' : 's'}${relatedItemsCount > 0 ? ` including ${relatedItemsCount} related context record(s)` : ''}):

${evidenceText}
${unextractableItems.length > 0
    ? `\nNOTE: ${unextractableItems.length} additional document(s) were located but could not be extracted (scanned/image PDFs). They are NOT included in this evidence pack and must not be cited.\n`
    : ''}
Synthesize a grounded, cited answer using ONLY the evidence above. Distinguish direct evidence [#1] from related context [#R1]. If the evidence does not address the query, say so honestly.`;

  // ── Step 5: LLM call with streaming support ──
  let llmAnswer = '';
  try {
    const messages = [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: userPrompt },
    ];

    const taskType = (TASK_TYPES && TASK_TYPES.RAG_SYNTHESIS) || (TASK_TYPES && TASK_TYPES.CONVERSATIONAL) || undefined;

    if (onStream) {
      llmAnswer = await generateText(messages, onStream, taskType ? { task: taskType } : undefined);
    } else {
      llmAnswer = await generateText(messages, null, taskType ? { task: taskType } : undefined);
    }
  } catch (err) {
    console.error('[clipadRAGSynthesisService] LLM synthesis error:', err);
    const answer = `I encountered an error while synthesizing an answer. Please try again.\n\n*Error: ${err?.message || 'Unknown error'}*`;
    if (onStream) onStream(answer);
    return {
      answer,
      sources: citationMap,
      citations: { valid: citationMap, unextractable: unextractableItems },
      status: SYNTHESIS_STATUS.ERROR,
      grounded: false,
    };
  }

  // ── Step 6: Guard against LLM echoing extraction metadata as fact ──
  if (isUnextractableContent(llmAnswer) && llmAnswer.length < 500) {
    const fallback = buildInsufficientEvidenceMessage(query);
    if (onStream) onStream(fallback);
    return {
      answer: fallback,
      sources: citationMap,
      citations: { valid: citationMap, unextractable: unextractableItems },
      status: SYNTHESIS_STATUS.INSUFFICIENT_EVIDENCE,
      grounded: false,
    };
  }

  // ── Step 7: Append unextractable notice when there are mixed sources ──
  let finalAnswer = llmAnswer || buildInsufficientEvidenceMessage(query);
  if (unextractableItems.length > 0 && llmAnswer) {
    const unextractableNote = unextractableItems
      .map(d => `- **${d.title}** — could not be extracted (${d.unextractableReason.replace(/_/g, ' ').toLowerCase()})`)
      .join('\n');
    finalAnswer +=
      `\n\n---\n> **⚠ Unextractable documents** (found but not searchable):\n${unextractableNote}\n` +
      `> These may contain additional relevant information. Consider re-uploading as text-based PDFs.`;
  }

  const status = unextractableItems.length > 0
    ? SYNTHESIS_STATUS.MIXED_EXTRACTABILITY
    : SYNTHESIS_STATUS.GROUNDED;

  return {
    answer: finalAnswer,
    sources: [...citationMap, ...unextractableItems],
    citations: {
      valid: citationMap,
      unextractable: unextractableItems,
    },
    status,
    grounded: usableCount > 0,
  };
}
