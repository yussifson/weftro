// src/lib/ai/adapters/baseAdapter.js
// Base Adapter Interface for Cloudflare Workers AI Model Standardization

export class BaseAIAdapter {
  constructor(modelId, specs) {
    this.modelId = modelId;
    this.specs = specs;
  }

  /**
   * Prepares and normalizes the request payload for Cloudflare Workers AI
   * @param {Object} params
   * @returns {Object} model-specific payload
   */
  formatPayload(params) {
    throw new Error('formatPayload must be implemented by concrete adapter');
  }

  /**
   * Normalizes the Cloudflare AI response to a uniform format
   * @param {any} rawResponse
   * @returns {{ text: string, raw: any, usage?: any, toolCalls?: any[] }}
   */
  normalizeResponse(rawResponse) {
    throw new Error('normalizeResponse must be implemented by concrete adapter');
  }

  /**
   * Extracts clean token from SSE chunk
   * @param {any} parsedSSE
   * @returns {string}
   */
  extractStreamToken(parsedSSE) {
    return parsedSSE?.response ?? parsedSSE?.choices?.[0]?.delta?.content ?? '';
  }
}
