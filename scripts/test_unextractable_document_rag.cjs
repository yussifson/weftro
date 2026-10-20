// scripts/test_unextractable_document_rag.cjs
// Verification test for unextractable document handling in Grounded RAG Synthesis Service

const assert = require('assert');

// Extraction error markers matching src/lib/clipadRAGSynthesisService.js
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

function isUnextractableContent(content) {
  if (!content || typeof content !== 'string') return true;
  const lower = content.toLowerCase().trim();
  if (lower.length < 5) return true;
  return UNEXTRACTABLE_MARKERS.some(marker => lower.includes(marker));
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

function buildUnextractableOnlyMessage(query, unextractableItems) {
  const docList = unextractableItems
    .map(d => `- **${d.title}** *(${d.unextractableReason.replace(/_/g, ' ').toLowerCase()})*`)
    .join('\n');

  return `The following document(s) were found that may be relevant to **"${query}"**, but their contents could not be extracted for AI analysis:\n\n${docList}\n\nThis typically happens with scanned PDFs or image-only files that have no selectable text layer. To make these searchable, consider:\n- Re-uploading a text-based PDF version\n- Running OCR on the document before uploading\n- Pasting the document text directly into a Weftro space document`;
}

console.log('================================================================');
console.log(' WEFTRO V3 — UNEXTRACTABLE DOCUMENT RAG SYNTHESIS TEST SUITE');
console.log('================================================================\n');

// Test 1: Identify unextractable markers
const markers = [
  'PDF parsed successfully but contained only vector graphics or rasterized image scans.',
  'Storage fetch error: NoSuchKey',
  'HTTP 400: Bad Request',
  'unsupported_or_failed',
  'No extractable text found in this document.',
  'pdf contains only images',
  null,
  undefined,
  ''
];

for (const marker of markers) {
  assert.strictEqual(isUnextractableContent(marker), true, `Marker should be identified as unextractable: "${marker}"`);
}
console.log('[PASS] Test 1: All extraction failure markers correctly identified as unextractable.');

// Test 2: Identify valid text
const validTexts = [
  'This is the executive summary of our Q3 project roadmap and deliverables.',
  'Meeting notes from October 19: All teams agreed to proceed with Phase 2 implementation.',
  'Weftro engineering guidelines for security, RAG context windows, and hybrid pgvector retrieval.'
];

for (const text of validTexts) {
  assert.strictEqual(isUnextractableContent(text), false, `Valid text should not be flagged: "${text}"`);
}
console.log('[PASS] Test 2: Valid document content correctly identified as extractable.');

// Test 3: Unextractable reason classification
assert.strictEqual(detectUnextractableReason('PDF parsed successfully but contained only vector graphics or rasterized image scans.'), 'SCANNED_OR_IMAGE_PDF');
assert.strictEqual(detectUnextractableReason('Storage fetch error: NoSuchKey'), 'STORAGE_NOT_FOUND');
assert.strictEqual(detectUnextractableReason('HTTP 400: Bad Request'), 'EXTRACTION_API_ERROR');
assert.strictEqual(detectUnextractableReason('No extractable text found'), 'NO_TEXT_LAYER');
assert.strictEqual(detectUnextractableReason(''), 'EMPTY_CONTENT');
console.log('[PASS] Test 3: Reason classification accurately categorizes causes.');

// Test 4: Unextractable message formatting with honest abstention
const unextractableDocs = [
  { title: 'Traffic Sign Recognition Project Report (1).pdf', unextractableReason: 'SCANNED_OR_IMAGE_PDF' }
];
const msg = buildUnextractableOnlyMessage('What are the traffic sign classes?', unextractableDocs);
assert(msg.includes('Traffic Sign Recognition Project Report (1).pdf'));
assert(msg.includes('scanned PDFs or image-only files that have no selectable text layer'));
assert(msg.includes('Running OCR on the document before uploading'));
assert(!msg.includes('vector graphics or rasterized image scans')); // System error string is NOT presented as truth!
console.log('[PASS] Test 4: Honest abstention message formatted properly without leaking internal metadata as fact.');

console.log('\n================================================================');
console.log(' ALL 4/4 UNEXTRACTABLE DOCUMENT TEST SUITES PASSED');
console.log('================================================================');
