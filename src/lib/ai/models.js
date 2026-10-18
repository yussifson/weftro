// src/lib/ai/models.js
// Cloudflare Workers AI Intelligent Routing Model Definitions & Capabilities

export const AI_MODELS = {
  // Primary reasoning model
  PRIMARY_REASONING: '@cf/openai/gpt-oss-120b',
  // Long-context and agentic model
  LONG_CONTEXT_AGENT: '@cf/nvidia/nemotron-3-120b-a12b',
  // Dedicated Embedding Model (Must remain untouched)
  EMBEDDING: '@cf/baai/bge-base-en-v1.5',
  // Multimodal / Vision Model
  VISION: '@cf/zai-org/glm-4.7-flash',
};

export const TASK_TYPES = {
  GENERAL: 'general',
  REASONING: 'reasoning',
  CODING: 'coding',
  PLANNING: 'planning',
  TOOL_USE: 'tool_use',
  LONG_CONTEXT: 'long_context',
  DOCUMENT_ANALYSIS: 'document_analysis',
  RAG_SYNTHESIS: 'rag_synthesis',
  STRUCTURED_EXTRACTION: 'structured_extraction',
  CLASSIFICATION: 'classification',
  SUMMARIZATION: 'summarization',
};

// Verified Model Specifications, context bounds, and adapter flags
export const MODEL_SPECS = {
  [AI_MODELS.PRIMARY_REASONING]: {
    id: AI_MODELS.PRIMARY_REASONING,
    name: 'GPT-OSS 120B (OpenAI)',
    provider: 'cloudflare',
    // Practical context limit with safety buffer (safe input + output reservation)
    contextWindow: 128000,
    safeInputLimit: 110000,
    maxOutputTokens: 4096,
    supportsJsonSchema: true,
    supportsFunctionCalling: true,
    supportsStreaming: true,
    strengths: [
      'complex_reasoning',
      'code_generation',
      'strict_json_schema',
      'tool_parameter_accuracy',
      'zero_shot_classification'
    ],
    defaultTemperature: 0.2,
  },
  [AI_MODELS.LONG_CONTEXT_AGENT]: {
    id: AI_MODELS.LONG_CONTEXT_AGENT,
    name: 'Nemotron-3 120B A12B (NVIDIA)',
    provider: 'cloudflare',
    // Practical context limit for Nemotron 3 120B
    contextWindow: 128000,
    safeInputLimit: 112000,
    maxOutputTokens: 4096,
    supportsJsonSchema: true,
    supportsFunctionCalling: true,
    supportsStreaming: true,
    strengths: [
      'long_context_analysis',
      'multi_document_synthesis',
      'multi_turn_agentic_loop',
      'corpus_summarization',
      'workflow_orchestration'
    ],
    defaultTemperature: 0.3,
  }
};
