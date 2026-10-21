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
export const MAX_EVIDENCE_CHARS_PER_ITEM = 2000;  // per evidence item
export const MAX_TOTAL_EVIDENCE_CHARS    = 18000; // whole evidence pack total budget
export const MAX_RELATED_CONTEXT_CHARS   = 4000;  // Stage 3 & 4: Dedicated sub-budget for relationship-expanded context

// ─────────────────────────────────────────────────────────────────────────────
// PRIORITIZATION & DEDUPLICATION (STAGE 4)
// Deterministic scoring considering relevance, source confidence, relationship confidence, and freshness.
// Direct evidence is strictly prioritized over related evidence.
// Contradictory statements (different values/statuses) are preserved, while verbatim duplicates are pruned.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes a deterministic evidence priority score for ordering.
 * Direct evidence scores in [1.0, 3.0+]. Related evidence scores in [0.0, 1.0].
 */
export function computeEvidenceScore(item) {
  const isRelated = item.isRelatedEvidence === true;
  const relConf = Number(item.relationship?.confidence ?? 1.0);
  const srcConf = Number(item.confidence ?? item.confidence_score ?? 1.0);
  const baseRelevance = Number(item.rrf_score ?? item.score ?? 0.5);

  // Freshness decay (over 90 days)
  let freshnessScore = 0.5;
  if (item.created_at || item.updated_at) {
    const itemDate = new Date(item.updated_at || item.created_at).getTime();
    if (!isNaN(itemDate)) {
      const ageInDays = (Date.now() - itemDate) / (1000 * 60 * 60 * 24);
      freshnessScore = Math.max(0.1, 1.0 - (ageInDays / 90));
    }
  }

  if (isRelated) {
    // Related evidence scale: 0.0 - 0.999
    return Number(((baseRelevance * 0.3) + (relConf * 0.4) + (freshnessScore * 0.3)).toFixed(4));
  } else {
    // Direct evidence receives a baseline bonus of 1.0 to guarantee direct > related
    return Number((1.0 + (baseRelevance * 0.4) + (srcConf * 0.3) + (freshnessScore * 0.3)).toFixed(4));
  }
}

/**
 * Normalizes text content for exact duplicate detection.
 */
function normalizeContentForDedup(text) {
  if (!text || typeof text !== 'string') return '';
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Detects whether two items contain contradictory information (e.g. differing statuses or dates)
 * so they are deliberately PRESERVED rather than pruned as duplicate.
 */
function isMeaningfulContradiction(itemA, itemB) {
  const statusA = (itemA.status || itemA.state || itemA.metadata?.status || '').toLowerCase().trim();
  const statusB = (itemB.status || itemB.state || itemB.metadata?.status || '').toLowerCase().trim();
  if (statusA && statusB && statusA !== statusB) {
    return true;
  }
  return false;
}

/**
 * Deduplicates and prioritizes retrieved evidence deterministically.
 */
export function prioritizeAndDeduplicateEvidence(items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];

  // 1. Tag each item with its deterministic score
  const scoredItems = items.map(item => ({
    ...item,
    _evidenceScore: computeEvidenceScore(item),
  }));

  // 2. Deterministic sort: direct first, highest score descending, ID tie-breaker
  scoredItems.sort((a, b) => {
    if (a.isRelatedEvidence !== b.isRelatedEvidence) {
      return a.isRelatedEvidence ? 1 : -1; // direct (false) comes before related (true)
    }
    if (b._evidenceScore !== a._evidenceScore) {
      return b._evidenceScore - a._evidenceScore;
    }
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  // 3. Deduplication: prune verbatim content duplicates unless they represent a meaningful contradiction
  // We track by normContent -> Set of seen statuses
  const seenContentStatuses = new Map();
  const prioritized = [];

  for (const item of scoredItems) {
    const rawContent = item.snippet || item.content || item.summary || item.description || '';
    const norm = normalizeContentForDedup(rawContent);

    // Short snippets are not deduplicated by content alone
    if (norm.length > 20) {
      const status = (item.status || item.state || item.metadata?.status || '').toLowerCase().trim();
      const existingStatuses = seenContentStatuses.get(norm);
      if (existingStatuses) {
        if (status && !existingStatuses.has(status)) {
          // New contradictory status for the same content: preserve it!
          existingStatuses.add(status);
          prioritized.push(item);
        }
        // If status is empty or already seen for this content, skip duplicate excerpt
        continue;
      }
      seenContentStatuses.set(norm, new Set([status]));
    }
    prioritized.push(item);
  }

  return prioritized;
}

/**
 * Detects potential contradictions, conflicts, and uncertainties across retrieved evidence.
 */
export function detectEvidenceConflicts(items = []) {
  const conflicts = [];
  const statusBySubject = new Map();

  for (const item of items) {
    const title = (item.label || item.title || item.name || '').trim();
    const status = (item.status || item.state || item.metadata?.status || '').trim();
    const date = item.updated_at || item.created_at;

    if (title && status) {
      const normTitle = title.toLowerCase();
      if (statusBySubject.has(normTitle)) {
        const prev = statusBySubject.get(normTitle);
        if (prev.status.toLowerCase() !== status.toLowerCase()) {
          conflicts.push({
            subject: title,
            recordA: { id: prev.id, title: prev.title, status: prev.status, date: prev.date, citation: prev.citationIndex },
            recordB: { id: item.id, title, status, date },
            description: `Conflicting status for "${title}": recorded as "${prev.status}"${prev.date ? ` on ${prev.date.slice(0, 10)}` : ''} vs "${status}"${date ? ` on ${date.slice(0, 10)}` : ''}`
          });
        }
      } else {
        statusBySubject.set(normTitle, { id: item.id, title, status, date });
      }
    }
  }

  return conflicts;
}

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
// SYSTEM PROMPT (STAGE 4: EVIDENCE-AWARE AI REASONING)
// ─────────────────────────────────────────────────────────────────────────────
export function buildSystemPrompt() {
  return `You are Orbit, an organizational intelligence AI assistant for Weftro.

EVIDENCE HIERARCHY & REASONING RULES — follow these strictly:
1. EVIDENCE DISCRIMINATION:
   - DIRECT EVIDENCE [#1], [#2]: Information directly retrieved matching the query. Represents explicitly stated facts from source records.
   - RELATED EVIDENCE [#R1], [#R2]: Context retrieved via verified organizational links (e.g. meetings where decisions were made, tasks associated with projects).
   - ORGANIZATIONAL CONTEXT: Structural context regarding people, spaces, teams, and projects.

2. FACTUAL GROUNDING & NON-CAUSATION:
   - A documented relationship or link NEVER proves that an underlying claim is true.
   - A task linked to a decision does NOT prove that the decision was implemented.
   - A task assigned to an employee does NOT prove that the employee finished or approved it.
   - An attendee at a meeting does NOT prove that they agreed to or approved every decision reached.
   - Two records in the same space or project do NOT necessarily describe the same event.
   - An older status does NOT automatically override a newer verified status; always inspect available dates.

3. CONFLICTS & DISCREPANCIES:
   - When evidence contains conflicting dates, statuses, or statements from different sources, describe the discrepancy neutrally and cite both sources.
   - Do NOT arbitrarily pick one source over another without explicit evidence explaining the resolution.

4. INSUFFICIENT EVIDENCE & HONEST ABSTENTION:
   - If the retrieved evidence does not contain sufficient facts to answer the question, clearly state that the organizational knowledge base does not establish the answer.
   - Do NOT extrapolate, speculate, or fabricate details not explicitly supported by cited evidence.

5. CITATION INTEGRITY:
   - Every factual assertion MUST cite its exact supporting source: [#1] for direct evidence or [#R1] for related evidence.
   - Never cite [#R...] as direct proof of a factual occurrence.
   - Never expose internal processing metadata, unextractable document errors, or system paths.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CANNED MESSAGES
// ─────────────────────────────────────────────────────────────────────────────
export function buildInsufficientEvidenceMessage(query) {
  return `I don't have enough information in the organizational knowledge base to answer **"${query}"**.\n\nTry:\n- Broadening your search terms\n- Checking connected integrations (Google Drive, Notion, etc.)\n- Uploading or syncing relevant documents`;
}

export function buildUnextractableOnlyMessage(query, unextractableItems) {
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
 *   conflicts: Array<Object>,
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
      conflicts: [],
      status: SYNTHESIS_STATUS.INSUFFICIENT_EVIDENCE,
      grounded: false,
    };
  }

  // ── Step 1: Prioritize and deduplicate evidence deterministically ──
  const prioritizedEvidence = prioritizeAndDeduplicateEvidence(retrievedEvidence);
  const detectedConflicts = detectEvidenceConflicts(prioritizedEvidence);

  // ── Step 2: Format evidence pack and enforce context budgets ──
  const { evidenceText, citationMap, usableCount, unextractableItems, directCount, relatedItemsCount } =
    formatEvidencePack(prioritizedEvidence);

  // ── Step 3: All-unextractable — honest abstention with document citations ──
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
      conflicts: [],
      status: SYNTHESIS_STATUS.UNEXTRACTABLE_ONLY,
      grounded: false,
    };
  }

  // ── Step 4: No evidence at all ──
  if (usableCount === 0) {
    const answer = buildInsufficientEvidenceMessage(query);
    if (onStream) onStream(answer);
    return {
      answer,
      sources: [],
      citations: null,
      conflicts: [],
      status: SYNTHESIS_STATUS.INSUFFICIENT_EVIDENCE,
      grounded: false,
    };
  }

  // ── Step 5: Build grounded LLM prompt using ONLY usable evidence ──
  let conflictAnnotation = '';
  if (detectedConflicts.length > 0) {
    conflictAnnotation = `\nDETECTED POTENTIAL CONFLICTS / STATUS DISCREPANCIES IN EVIDENCE:\n` +
      detectedConflicts.map(c => `- ${c.description}`).join('\n') +
      `\nNOTE: Mention discrepancies neutrally, comparing dates/sources rather than choosing one arbitrarily.\n`;
  }

  const userPrompt = `QUERY: ${query.trim()}

EVIDENCE PACK (${usableCount} source${usableCount === 1 ? '' : 's'}${relatedItemsCount > 0 ? ` including ${relatedItemsCount} related context record(s)` : ''}):

${evidenceText}
${conflictAnnotation}
${unextractableItems.length > 0
    ? `\nNOTE: ${unextractableItems.length} additional document(s) were located but could not be extracted (scanned/image PDFs). They are NOT included in this evidence pack and must not be cited.\n`
    : ''}
Synthesize a grounded, cited answer using ONLY the evidence above. Distinguish direct evidence [#1] from related context [#R1]. If the evidence does not address the query, say so honestly.`;

  // ── Step 6: LLM call with streaming support ──
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
      conflicts: detectedConflicts,
      status: SYNTHESIS_STATUS.ERROR,
      grounded: false,
    };
  }

  // ── Step 7: Guard against LLM echoing extraction metadata as fact ──
  if (isUnextractableContent(llmAnswer) && llmAnswer.length < 500) {
    const fallback = buildInsufficientEvidenceMessage(query);
    if (onStream) onStream(fallback);
    return {
      answer: fallback,
      sources: citationMap,
      citations: { valid: citationMap, unextractable: unextractableItems },
      conflicts: detectedConflicts,
      status: SYNTHESIS_STATUS.INSUFFICIENT_EVIDENCE,
      grounded: false,
    };
  }

  // ── Step 8: Append unextractable notice when there are mixed sources ──
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
    conflicts: detectedConflicts,
    status,
    grounded: usableCount > 0,
  };
}
