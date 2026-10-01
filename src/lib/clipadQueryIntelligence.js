// src/lib/clipadQueryIntelligence.js
// Clipad V3 — Phase 4: Query Understanding & Transformation
//
// Lightweight, deterministic query understanding layer.
// Maps user intent → retrieval strategy, without building autonomous agents.
// Falls back gracefully when classification is uncertain.

// ─── Intent Types ─────────────────────────────────────────────────────────────

export const QUERY_INTENT = {
  DECISION_SEARCH: 'DECISION_SEARCH',
  ACTION_SEARCH: 'ACTION_SEARCH',
  COMMITMENT_SEARCH: 'COMMITMENT_SEARCH',
  RISK_SEARCH: 'RISK_SEARCH',
  PROJECT_STATUS: 'PROJECT_STATUS',
  PEOPLE_SEARCH: 'PEOPLE_SEARCH',
  MEETING_SEARCH: 'MEETING_SEARCH',
  DOCUMENT_SEARCH: 'DOCUMENT_SEARCH',
  GENERAL: 'GENERAL',
};

// ─── Source Type Mappings ─────────────────────────────────────────────────────

const INTENT_TO_SOURCE_TYPES = {
  [QUERY_INTENT.DECISION_SEARCH]:  ['smart_moment', 'memory', 'decision'],
  [QUERY_INTENT.ACTION_SEARCH]:    ['smart_moment', 'task', 'memory'],
  [QUERY_INTENT.COMMITMENT_SEARCH]: ['smart_moment', 'memory'],
  [QUERY_INTENT.RISK_SEARCH]:      ['smart_moment', 'memory', 'blocker'],
  [QUERY_INTENT.PROJECT_STATUS]:   ['meeting', 'task', 'decision', 'smart_moment', 'memory'],
  [QUERY_INTENT.PEOPLE_SEARCH]:    ['person'],
  [QUERY_INTENT.MEETING_SEARCH]:   ['meeting', 'video', 'smart_moment'],
  [QUERY_INTENT.DOCUMENT_SEARCH]:  ['doc', 'integration', 'memory'],
  [QUERY_INTENT.GENERAL]:          ['meeting', 'doc', 'task', 'decision', 'smart_moment', 'memory', 'message'],
};

const MOMENT_TYPES_FOR_INTENT = {
  [QUERY_INTENT.DECISION_SEARCH]:  ['DECISION'],
  [QUERY_INTENT.ACTION_SEARCH]:    ['ACTION', 'COMMITMENT'],
  [QUERY_INTENT.COMMITMENT_SEARCH]: ['COMMITMENT'],
  [QUERY_INTENT.RISK_SEARCH]:      ['RISK', 'BLOCKER'],
};

// ─── Pattern Libraries ────────────────────────────────────────────────────────

const DECISION_PATTERNS = [
  /\bdecid/i, /\bdecision/i, /\bagreed?\b/i, /\bchose?\b/i, /\bapproved?\b/i,
  /\bsettled?\s+on\b/i, /\bresolve/i, /\bchosen\b/i,
];

const ACTION_PATTERNS = [
  /\baction item/i, /\btask/i, /\bassigned?\b/i, /\bto-?do\b/i, /\bfollow.?up/i,
  /\bdeliverable/i, /\bdue\b/i,
];

const COMMITMENT_PATTERNS = [
  /\bcommitment/i, /\bpromised?\b/i, /\bcommit(?:ted)?\b/i, /\bwill\s+do\b/i,
  /\bwill\s+deliver/i, /\bpledged?\b/i,
];

const RISK_PATTERNS = [
  /\brisk/i, /\bblocker/i, /\bblocked?\b/i, /\bimpediment/i, /\bdanger/i,
  /\bthreat/i, /\bvulnerability/i, /\bconcern/i,
];

const PROJECT_PATTERNS = [
  /\bproject\b/i, /\bstatus\b/i, /\bprogress\b/i, /\bupdate\s+on\b/i,
  /\bhow\s+is\b/i, /\bwhere\s+(are\s+we|do\s+we\s+stand)\b/i,
  /\binitiative\b/i, /\bphase\b/i,
];

const PEOPLE_PATTERNS = [
  /\bwho\s+is\b/i, /\bwho\s+did\b/i, /\bwho\s+owns\b/i, /\bfind\s+person\b/i, /\bfind\s+someone\b/i,
  /\bperson\b/i, /\bpeople\b/i, /\bteam\s+member/i, /\bprofile\b/i,
];


const MEETING_PATTERNS = [
  /\bmeeting/i, /\bcall\b/i, /\bsync\b/i, /\brecording/i, /\btranscript/i,
  /\bstandup/i, /\bsprint\s+review/i, /\bwhat\s+was\s+discussed/i,
];

const DOCUMENT_PATTERNS = [
  /\bdocument/i, /\bdoc\b/i, /\bspec\b/i, /\bwiki/i, /\bknowledge\b/i,
  /\bnotes?\b/i, /\bwrite\s*up/i, /\bpaper\b/i,
];

// ─── Time Extraction ──────────────────────────────────────────────────────────

const TIME_PATTERNS = [
  { pattern: /\blast\s+week\b/i, label: 'last_week', days: 7 },
  { pattern: /\blast\s+month\b/i, label: 'last_month', days: 30 },
  { pattern: /\blast\s+3\s+months?\b/i, label: 'last_3_months', days: 90 },
  { pattern: /\btoday\b/i, label: 'today', days: 1 },
  { pattern: /\byesterday\b/i, label: 'yesterday', days: 2 },
  { pattern: /\bthis\s+week\b/i, label: 'this_week', days: 7 },
  { pattern: /\bthis\s+month\b/i, label: 'this_month', days: 30 },
  { pattern: /\brecent(?:ly)?\b/i, label: 'recent', days: 14 },
];

function extractTimeFilter(text) {
  for (const { pattern, label, days } of TIME_PATTERNS) {
    if (pattern.test(text)) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      return { label, since: since.toISOString(), days };
    }
  }
  return null;
}

// ─── Entity Extraction (lightweight regex, no LLM) ───────────────────────────

/**
 * Extracts likely entity names/topics from query text.
 * Uses capitalized word sequences as candidate names.
 */
function extractTopicCandidates(text) {
  const candidates = [];
  // Quoted phrases
  const quoted = text.match(/"([^"]+)"/g);
  if (quoted) candidates.push(...quoted.map(q => q.replace(/"/g, '').trim()));

  // Proper nouns (sequences of capitalized words, 1–4 words)
  const proper = text.match(/\b[A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*){0,3}\b/g);
  if (proper) {
    const filtered = proper.filter(p => p.length > 2 && !/^(What|Who|Where|When|How|Which|Show|Find|Get|Tell|Give|List|Summarize|Any|Are|Is|Did|Do|The|A|An)$/.test(p));
    candidates.push(...filtered);
  }

  return [...new Set(candidates)].slice(0, 5);
}

// ─── Main Classifier ──────────────────────────────────────────────────────────

/**
 * Classifies a search query into a structured intent object.
 * Purely deterministic — no LLM call, no async.
 *
 * @param {string} query
 * @returns {object} Structured query intent
 */
export function classifyQuery(query) {
  if (!query?.trim()) {
    return { intent: QUERY_INTENT.GENERAL, sourceTypes: INTENT_TO_SOURCE_TYPES[QUERY_INTENT.GENERAL], momentTypes: null, timeFilter: null, topicCandidates: [] };
  }

  const q = query.trim();
  let intent = QUERY_INTENT.GENERAL;

  // Priority order: most specific first
  if (DECISION_PATTERNS.some(p => p.test(q))) intent = QUERY_INTENT.DECISION_SEARCH;
  else if (COMMITMENT_PATTERNS.some(p => p.test(q))) intent = QUERY_INTENT.COMMITMENT_SEARCH;
  else if (ACTION_PATTERNS.some(p => p.test(q))) intent = QUERY_INTENT.ACTION_SEARCH;
  else if (RISK_PATTERNS.some(p => p.test(q))) intent = QUERY_INTENT.RISK_SEARCH;
  else if (PROJECT_PATTERNS.some(p => p.test(q))) intent = QUERY_INTENT.PROJECT_STATUS;
  else if (PEOPLE_PATTERNS.some(p => p.test(q))) intent = QUERY_INTENT.PEOPLE_SEARCH;
  else if (MEETING_PATTERNS.some(p => p.test(q))) intent = QUERY_INTENT.MEETING_SEARCH;
  else if (DOCUMENT_PATTERNS.some(p => p.test(q))) intent = QUERY_INTENT.DOCUMENT_SEARCH;

  const timeFilter = extractTimeFilter(q);
  const topicCandidates = extractTopicCandidates(q);
  const sourceTypes = INTENT_TO_SOURCE_TYPES[intent];
  const momentTypes = MOMENT_TYPES_FOR_INTENT[intent] || null;

  return {
    intent,
    sourceTypes,
    momentTypes,
    timeFilter,
    topicCandidates,
    normalizedQuery: q,
  };
}

/**
 * Build a structured system prompt supplement based on query intent.
 * Gives the AI assistant precise instructions for the specific query type.
 */
export function buildIntentPromptSupplement(intentResult) {
  const { intent, timeFilter, topicCandidates } = intentResult;

  let focus = '';
  switch (intent) {
    case QUERY_INTENT.DECISION_SEARCH:
      focus = 'Focus specifically on DECISION and AGREEMENT Smart Moments, decisions, and confirmed memory nodes. Cite the source meeting or document where each decision was made.';
      break;
    case QUERY_INTENT.ACTION_SEARCH:
      focus = 'Focus on ACTION and COMMITMENT Smart Moments, assigned tasks, and action items. Include the assignee and due date where available.';
      break;
    case QUERY_INTENT.RISK_SEARCH:
      focus = 'Focus on RISK and BLOCKER Smart Moments and open blockers. Include severity where available.';
      break;
    case QUERY_INTENT.PROJECT_STATUS:
      focus = `Provide a status synthesis for${topicCandidates.length > 0 ? ` "${topicCandidates[0]}"` : ' the mentioned project'}. Include recent meetings, open tasks, decisions, and commitments.`;
      break;
    case QUERY_INTENT.PEOPLE_SEARCH:
      focus = 'Focus on people entities and their participation in meetings, tasks, and decisions.';
      break;
    case QUERY_INTENT.MEETING_SEARCH:
      focus = 'Focus on meeting records, Smart Moments extracted from those meetings, and any key outcomes.';
      break;
    default:
      focus = 'Provide a comprehensive synthesis from all available organizational context.';
  }

  const timeNote = timeFilter ? `Restrict results to the last ${timeFilter.days} days (since ${new Date(timeFilter.since).toLocaleDateString()}).` : '';

  return [focus, timeNote].filter(Boolean).join(' ');
}
