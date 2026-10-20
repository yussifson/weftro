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
// These are the exact strings the Supabase Edge Function returns when extraction
// fails — they must NOT be treated as factual document content.
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

/**
 * Returns true if a content string is an extraction error marker rather than
 * usable document text.
 *
 * @param {string|null|undefined} content
 * @returns {boolean}
 */
export function isUnextractableContent(content) {
  if (!content || typeof content !== 'string') return true;
  const lower = content.toLowerCase().trim();
  if (lower.length < 5) return true; // Too short to be real content
  return UNEXTRACTABLE_MARKERS.some(marker => lower.includes(marker));
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT TOKEN BUDGET
// ─────────────────────────────────────────────────────────────────────────────
const MAX_EVIDENCE_CHARS_PER_ITEM = 2000;  // per evidence item
const MAX_TOTAL_EVIDENCE_CHARS    = 18000; // whole evidence pack

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT EVIDENCE PACK
// Converts retrieved results into a grounded prompt evidence block.
// Unextractable items are annotated and excluded from the factual content block.
// ─────────────────────────────────────────────────────────────────────────────
function formatEvidencePack(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { evidenceText: '', citationMap: [], usableCount: 0, unextractableItems: [] };
  }

  const citationMap = [];
  const unextractableItems = [];
  const evidenceBlocks = [];
  let totalChars = 0;
  let index = 1;

  for (const item of items) {
    const title = item.label || item.title || item.name || 'Untitled';
    const rawContent = item.snippet || item.content || item.summary || item.description || '';

    // ── Detect extraction failures ──
    if (isUnextractableContent(rawContent)) {
      unextractableItems.push({
        id: item.id,
        title,
        type: item.type || 'doc',
        isUnextractable: true,
        unextractableReason: detectUnextractableReason(rawContent),
        url: item.url || item.file_url || null,
      });
      // Do NOT include in evidence blocks and do NOT assign a citation index
      continue;
    }

    const truncated = rawContent.length > MAX_EVIDENCE_CHARS_PER_ITEM;
    const contentSlice = truncated
      ? rawContent.slice(0, MAX_EVIDENCE_CHARS_PER_ITEM) + '\n[... content truncated ...]'
      : rawContent;

    if (totalChars + contentSlice.length > MAX_TOTAL_EVIDENCE_CHARS) {
      // Budget exhausted — record as truncated citation only, don't add to prompt
      citationMap.push({
        index,
        id: item.id,
        title,
        type: item.type,
        isTruncated: true,
        isUnextractable: false,
        url: item.url || item.file_url || null,
      });
      index++;
      continue;
    }

    const block = `[SOURCE #${index}: ${title}]\nTYPE: ${item.type || 'unknown'}\nCONTENT:\n${contentSlice}`;
    evidenceBlocks.push(block);
    totalChars += block.length;

    citationMap.push({
      index,
      id: item.id,
      title,
      type: item.type,
      isTruncated: truncated,
      isUnextractable: false,
      url: item.url || item.file_url || null,
    });
    index++;
  }

  return {
    evidenceText: evidenceBlocks.join('\n\n---\n\n'),
    citationMap,
    usableCount: evidenceBlocks.length,
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
2. Do NOT invent, extrapolate, or add information not present in the evidence.
3. Cite sources inline using their source number, e.g. [#1] or [#2, #3].
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
  const { evidenceText, citationMap, usableCount, unextractableItems } =
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

EVIDENCE PACK (${usableCount} source${usableCount === 1 ? '' : 's'}):

${evidenceText}
${unextractableItems.length > 0
    ? `\nNOTE: ${unextractableItems.length} additional document(s) were located but could not be extracted (scanned/image PDFs). They are NOT included in this evidence pack and must not be cited.\n`
    : ''}
Synthesize a grounded, cited answer using ONLY the evidence above. If the evidence does not address the query, say so honestly.`;

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
  // If the raw LLM output looks like an extraction error string, replace with honest abstention
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
