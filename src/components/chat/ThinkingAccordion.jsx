import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Robust parser for AI reasoning steps.
 *
 * Handles all the ways QwQ-32B, DeepSeek-R1, and similar models emit thinking:
 *  1. Explicit <think>...</think> blocks (possibly multiple, possibly unclosed during streaming)
 *  2. Orphan </think> closing tags mid-text (the model forgot to open the tag)
 *  3. Plain-text reasoning headers like "Thinking Process:" / "Reasoning:"
 *  4. Untagged 1st-person reasoning monologues at the start of a response
 */
export function parseThinking(text) {
  if (!text || typeof text !== 'string') {
    return { thinking: null, content: text || '', isThinkingDone: true };
  }

  let content = text;
  const thinkingParts = [];
  let isThinkingDone = true;

  // ── PASS 1: Extract ALL complete <think>...</think> blocks ───────────────────
  const closedTagRegex = /<(think|thought)>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = closedTagRegex.exec(content)) !== null) {
    const part = m[2].trim();
    if (part) thinkingParts.push(part);
  }
  content = content.replace(/<(think|thought)>[\s\S]*?<\/\1>/gi, '').trim();

  // ── PASS 2: Handle open/unclosed <think> (streaming in progress) ─────────────
  const openTagMatch = content.match(/<(think|thought)>([\s\S]*)$/i);
  if (openTagMatch) {
    const part = openTagMatch[2].trim();
    if (part) thinkingParts.push(part);
    content = content.replace(/<(think|thought)>[\s\S]*$/i, '').trim();
    isThinkingDone = false;
  }

  // ── PASS 3: Strip orphan closing tags (</think> leaked into response body) ────
  content = content.replace(/<\/think>/gi, '').replace(/<\/thought>/gi, '').trim();

  // ── PASS 4: If no XML tags found, try plain-text reasoning headers ────────────
  if (thinkingParts.length === 0) {
    const headerRegex = /^(Thinking Process|Thought|Reasoning|Let me think|Internal reasoning):\s*/i;
    if (headerRegex.test(content)) {
      // Split on first blank line after header as transition to actual answer
      const splits = content.split(/\n\n+/);
      if (splits.length > 1) {
        thinkingParts.push(splits[0].replace(headerRegex, '').trim());
        content = splits.slice(1).join('\n\n').trim();
      }
    }
  }

  // ── PASS 5: If still no reasoning found, try monologue detection ─────────────
  // Catches untagged 1st-person internal monologue at the start of response
  if (thinkingParts.length === 0) {
    const monologueStart = /^(okay,?\s+let\s+me|let\s+me\s+think|let\s+me\s+analyze|let\s+me\s+tackle|the\s+user\s+is\s+asking|first,?\s+i\s+(need|should|must|will)|looking\s+at\s+the|to\s+answer\s+this|i\s+need\s+to\s+check|i\s+should\s+focus)/i;

    if (monologueStart.test(content.trim())) {
      const paragraphs = content.split(/\n\n+/);

      // Find the index of the first "answer-like" paragraph
      // (not starting with first-person reasoning phrases)
      const answerStartIdx = paragraphs.findIndex((p, idx) => {
        if (idx === 0) return false; // skip first — always reasoning
        const lower = p.trim().toLowerCase();
        const isStillReasoning = /^(i (need|should|must|will|can|cannot|don't)|the user|looking at|wait,|actually,|so i|let me|first,|second,|third,|now i|next,|finally,|in summary|to summarize|therefore,|thus,|hence,|conclusion:|the answer is \()/.test(lower);
        return !isStillReasoning;
      });

      if (answerStartIdx > 0) {
        thinkingParts.push(paragraphs.slice(0, answerStartIdx).join('\n\n').trim());
        content = paragraphs.slice(answerStartIdx).join('\n\n').trim();
      } else if (paragraphs.length > 1) {
        // Fallback: first paragraph is reasoning, rest is answer
        thinkingParts.push(paragraphs[0].trim());
        content = paragraphs.slice(1).join('\n\n').trim();
      }
    }
  }

  return {
    thinking: thinkingParts.length > 0 ? thinkingParts.join('\n\n') : null,
    content: content || text, // Never return empty content
    isThinkingDone,
  };
}

/**
 * Collapsible Thinking Accordion — hides AI reasoning steps by default.
 * Users can click "Reasoning | View" to expand and read the thought process.
 */
export default function ThinkingAccordion({ thinking, isThinkingDone = true }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!thinking) return null;

  return (
    <div className="mb-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] overflow-hidden transition-all text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-slate-500 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-white/[0.05] transition-colors font-medium select-none"
      >
        <div className="flex items-center gap-2">
          <Brain className={`w-3.5 h-3.5 ${!isThinkingDone ? 'animate-pulse text-amber-500' : 'text-emerald-500'}`} />
          <span className="text-[12px]">
            {!isThinkingDone ? 'Reasoning...' : 'Reasoning'}
          </span>
          {!isThinkingDone && (
            <span className="text-[10px] opacity-60 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono animate-pulse">
              Thinking
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] opacity-60 hover:opacity-100 transition-opacity">
          <span>{isOpen ? 'Hide' : 'View'}</span>
          {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-3.5 py-3 border-t border-slate-200/60 dark:border-white/5 text-[11.5px] font-mono leading-relaxed opacity-75 whitespace-pre-wrap max-h-64 overflow-y-auto bg-slate-900/5 dark:bg-black/30 text-slate-700 dark:text-muted-foreground">
          {thinking}
        </div>
      )}
    </div>
  );
}
