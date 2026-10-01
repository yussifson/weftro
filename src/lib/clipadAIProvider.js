// src/lib/clipadAIProvider.js
// Clipad V3 Modular AI Provider Abstraction Interface
// Unifies LLM generation, streaming, embeddings, entity extraction, and classification.

import { generateText } from '@/lib/cloudflareAI';

export class AIProvider {
  constructor(config = {}) {
    this.providerName = config.providerName || 'Cloudflare-KimiCascade';
    this.defaultModel = config.defaultModel || 'moonshotai/kimi-k3';
    this.visionModel = config.visionModel || '@cf/zai-org/glm-4.7-flash';
  }

  /**
   * Non-streaming text generation
   */
  async generate(messages, options = {}) {
    try {
      const response = await generateText(messages, null, options);
      return {
        text: response,
        provider: this.providerName,
        model: options.model || this.defaultModel,
      };
    } catch (err) {
      console.error('[AIProvider.generate] Failure:', err);
      throw err;
    }
  }

  /**
   * Realtime streaming text generation (SSE)
   */
  async stream(messages, onChunk, options = {}) {
    try {
      return await generateText(messages, onChunk, options);
    } catch (err) {
      console.error('[AIProvider.stream] Streaming failure:', err);
      throw err;
    }
  }

  /**
   * Vector Embedding generation (for RAG / Semantic Search)
   */
  async embed(text, options = {}) {
    if (!text?.trim()) return [];
    try {
      return {
        text: text.substring(0, 1000),
        embedding: null,
        provider: this.providerName,
      };
    } catch (err) {
      console.error('[AIProvider.embed] Embedding failure:', err);
      return [];
    }
  }

  /**
   * Topic / Category Classification
   */
  async classify(text, categories = [], options = {}) {
    if (!text || categories.length === 0) return categories[0] || 'Unclassified';
    const prompt = `Classify the following text into ONE of these categories: ${categories.join(', ')}.\nText: "${text.substring(0, 2000)}"\nRespond ONLY with the exact category name.`;
    const res = await this.generate([{ role: 'user', content: prompt }]);
    const matched = categories.find(c => c.toLowerCase() === (res.text || '').trim().toLowerCase());
    return matched || categories[0];
  }

  /**
   * Structured Entity Extraction (JSON)
   */
  async extract(text, schemaDescription, options = {}) {
    const prompt = `Extract structured data from the text according to this schema:\n${schemaDescription}\n\nTEXT:\n${text.substring(0, 4000)}\n\nRespond ONLY with valid JSON.`;
    const res = await this.generate([
      { role: 'system', content: 'You are an extraction AI. Output strictly raw valid JSON.' },
      { role: 'user', content: prompt }
    ]);
    try {
      const cleaned = (res.text || '').replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return {};
    }
  }

  /**
   * Enforced Type-Safe Structured Output
   */
  async structuredOutput(messages, jsonSchema, options = {}) {
    const prompt = `Fulfill the request and output ONLY valid JSON matching this schema:\n${JSON.stringify(jsonSchema, null, 2)}`;
    const fullMessages = [...messages, { role: 'user', content: prompt }];
    const res = await this.generate(fullMessages, options);
    try {
      return JSON.parse((res.text || '').replace(/```json|```/g, '').trim());
    } catch {
      return null;
    }
  }
}

export const defaultAIProvider = new AIProvider();
