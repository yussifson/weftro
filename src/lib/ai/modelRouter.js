// src/lib/ai/modelRouter.js
// Cloudflare Workers AI Intelligent Model Router
// Routes between @cf/openai/gpt-oss-120b and @cf/nvidia/nemotron-3-120b-a12b

import { AI_MODELS, TASK_TYPES, MODEL_SPECS } from './models';
import { GptOssAdapter } from './adapters/gptOssAdapter';
import { NemotronAdapter } from './adapters/nemotronAdapter';

const adapters = {
  [AI_MODELS.PRIMARY_REASONING]: new GptOssAdapter(MODEL_SPECS[AI_MODELS.PRIMARY_REASONING]),
  [AI_MODELS.LONG_CONTEXT_AGENT]: new NemotronAdapter(MODEL_SPECS[AI_MODELS.LONG_CONTEXT_AGENT]),
};

/**
 * Heuristic context token estimator.
 * Accounts for characters in messages, system prompts, tool schemas, and structure.
 * Average ~3.8 - 4 characters per token for English / technical text.
 * @param {Array} messages
 * @param {Array|null} tools
 * @returns {number} estimated token count
 */
export function estimateContextTokens(messages = [], tools = null) {
  let charCount = 0;

  if (Array.isArray(messages)) {
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        charCount += msg.content.length;
      } else if (msg.content) {
        charCount += JSON.stringify(msg.content).length;
      }
      if (msg.role) charCount += msg.role.length + 10;
    }
  }

  if (Array.isArray(tools)) {
    charCount += JSON.stringify(tools).length;
  }

  // 1 token ~= 3.8 chars + 15% structural overhead for safety
  const estimatedTokens = Math.ceil((charCount / 3.8) * 1.15);
  return estimatedTokens;
}

/**
 * Policy Matrix: Resolves optimal model based on task, estimated token context, and constraints
 *
 * Routing Rules:
 * 1. Overriding model explicitly: Only allowed if in AI_MODELS whitelist and context allows.
 * 2. Long context (> 30,000 tokens): Favor Nemotron-3 120B.
 * 3. Multi-turn Agentic / tool execution: Nemotron-3 120B or GPT-OSS 120B based on context & task.
 * 4. Strict structured JSON extraction, coding, reasoning, planning: GPT-OSS 120B.
 * 5. Fallback logic: If selected model fails or context limit is exceeded, cascade to the alternative.
 */
export function selectModelForRequest({
  task = TASK_TYPES.GENERAL,
  messages = [],
  tools = null,
  responseFormat = null,
  modelOverride = null,
  contextSizeEstimate = null,
}) {
  const estimatedTokens = contextSizeEstimate || estimateContextTokens(messages, tools);

  // 1. Validated override check (for authorized admin / dev benchmarking)
  if (modelOverride) {
    if (modelOverride === AI_MODELS.PRIMARY_REASONING || modelOverride === AI_MODELS.LONG_CONTEXT_AGENT) {
      return {
        model: modelOverride,
        reason: 'Explicitly requested authorized override',
        estimatedTokens,
        task,
      };
    }
  }

  // 2. High Context Boundary (> 25,000 tokens) -> Route to Long-Context Model (Nemotron)
  if (estimatedTokens > 25000) {
    return {
      model: AI_MODELS.LONG_CONTEXT_AGENT,
      reason: `Context size (${estimatedTokens} tokens) exceeds standard reasoning window threshold`,
      estimatedTokens,
      task,
    };
  }

  // 3. Task-specific Policy Routing
  switch (task) {
    case TASK_TYPES.CODING:
    case TASK_TYPES.REASONING:
    case TASK_TYPES.STRUCTURED_EXTRACTION:
      // GPT-OSS 120B excels at precision code generation and strict JSON schema conformance
      return {
        model: AI_MODELS.PRIMARY_REASONING,
        reason: 'Task requires strict precision reasoning, coding, or JSON schema conformity',
        estimatedTokens,
        task,
      };

    case TASK_TYPES.PLANNING:
    case TASK_TYPES.GENERAL:
    case TASK_TYPES.CLASSIFICATION:
      return {
        model: AI_MODELS.PRIMARY_REASONING,
        reason: 'Primary reasoning model optimized for general conversation and planning',
        estimatedTokens,
        task,
      };

    case TASK_TYPES.LONG_CONTEXT:
    case TASK_TYPES.DOCUMENT_ANALYSIS:
      return {
        model: AI_MODELS.LONG_CONTEXT_AGENT,
        reason: 'Task requires deep document synthesis and extensive multi-source context',
        estimatedTokens,
        task,
      };

    case TASK_TYPES.TOOL_USE:
      // If tools with large payload, route to Nemotron; otherwise GPT-OSS 120B
      if (estimatedTokens > 8000) {
        return {
          model: AI_MODELS.LONG_CONTEXT_AGENT,
          reason: 'Agentic tool execution with substantial historical context',
          estimatedTokens,
          task,
        };
      }
      return {
        model: AI_MODELS.PRIMARY_REASONING,
        reason: 'Deterministic tool selection and parameter schema enforcement',
        estimatedTokens,
        task,
      };

    case TASK_TYPES.RAG_SYNTHESIS:
      // RAG with evidence: if evidence pack is heavy, Nemotron; else GPT-OSS
      if (estimatedTokens > 12000) {
        return {
          model: AI_MODELS.LONG_CONTEXT_AGENT,
          reason: 'Extensive multi-document RAG evidence pack',
          estimatedTokens,
          task,
        };
      }
      return {
        model: AI_MODELS.PRIMARY_REASONING,
        reason: 'Concise grounded RAG synthesis with strict citation validation',
        estimatedTokens,
        task,
      };

    default:
      return {
        model: AI_MODELS.PRIMARY_REASONING,
        reason: 'Default primary reasoning router selection',
        estimatedTokens,
        task,
      };
  }
}

/**
 * Returns the adapter instance for a given model
 * @param {string} modelId
 * @returns {BaseAIAdapter}
 */
export function getAdapter(modelId) {
  const adapter = adapters[modelId];
  if (!adapter) {
    // Fall back to Primary Reasoning adapter if unknown
    return adapters[AI_MODELS.PRIMARY_REASONING];
  }
  return adapter;
}

/**
 * Gets fallback model in case of failure or rate limit
 * @param {string} currentModel
 * @returns {string} fallback model id
 */
export function getFallbackModel(currentModel) {
  if (currentModel === AI_MODELS.PRIMARY_REASONING) {
    return AI_MODELS.LONG_CONTEXT_AGENT;
  }
  return AI_MODELS.PRIMARY_REASONING;
}
