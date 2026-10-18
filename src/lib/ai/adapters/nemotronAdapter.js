// src/lib/ai/adapters/nemotronAdapter.js
// Adapter for @cf/nvidia/nemotron-3-120b-a12b
import { BaseAIAdapter } from './baseAdapter';

export class NemotronAdapter extends BaseAIAdapter {
  constructor(specs) {
    super('@cf/nvidia/nemotron-3-120b-a12b', specs);
  }

  formatPayload({
    messages = [],
    maxTokens = 3000,
    temperature = 0.3,
    tools = null,
    responseFormat = null,
    stream = false,
  }) {
    // Nemotron-3 120B accepts standard chat messages.
    // For agentic workflows or JSON schema, inject clear instructions into system prompt if needed.
    const normalizedMessages = messages.map(m => ({
      role: m.role || 'user',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    }));

    // If structured JSON output is requested, Nemotron benefits from an explicit directive
    if (responseFormat && (responseFormat.type === 'json_object' || responseFormat.json_schema)) {
      const hasSystem = normalizedMessages.some(m => m.role === 'system');
      const jsonDirective = responseFormat.json_schema
        ? `\nIMPORTANT: Respond ONLY with valid JSON conforming to this schema:\n${JSON.stringify(responseFormat.json_schema)}`
        : `\nIMPORTANT: Respond ONLY with a valid JSON object.`;

      if (hasSystem) {
        normalizedMessages.forEach(m => {
          if (m.role === 'system') m.content += jsonDirective;
        });
      } else {
        normalizedMessages.unshift({
          role: 'system',
          content: `You are an enterprise AI assistant. ${jsonDirective}`
        });
      }
    }

    const payload = {
      messages: normalizedMessages,
      max_tokens: Math.min(maxTokens, this.specs?.maxOutputTokens || 4096),
      temperature,
      stream: !!stream,
    };

    if (Array.isArray(tools) && tools.length > 0) {
      payload.tools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name || t.function?.name,
          description: t.description || t.function?.description || '',
          parameters: t.parameters || t.function?.parameters || { type: 'object', properties: {} }
        }
      }));
      payload.tool_choice = 'auto';
    }

    return payload;
  }

  normalizeResponse(rawResponse) {
    let text = '';
    let toolCalls = [];

    if (typeof rawResponse === 'string') {
      text = rawResponse;
    } else if (rawResponse?.choices && rawResponse.choices.length > 0) {
      const choice = rawResponse.choices[0];
      const message = choice.message || choice;
      text = message.content || '';

      if (message.tool_calls && Array.isArray(message.tool_calls)) {
        toolCalls = message.tool_calls.map(tc => ({
          id: tc.id || `call_${Math.random().toString(36).slice(2, 9)}`,
          name: tc.function?.name || tc.name,
          arguments: typeof tc.function?.arguments === 'string'
            ? safeParseJson(tc.function.arguments)
            : (tc.function?.arguments || tc.arguments || {})
        }));
      }
    } else if (rawResponse?.result) {
      const res = rawResponse.result;
      text = res.response || res.text || (typeof res === 'string' ? res : '');
      if (res.tool_calls) {
        toolCalls = res.tool_calls;
      }
    } else if (rawResponse?.response) {
      text = rawResponse.response;
    }

    // Clean reasoning tags
    text = cleanReasoningTags(text);

    return {
      text,
      toolCalls,
      raw: rawResponse,
      usage: rawResponse?.usage || null
    };
  }
}

function safeParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return { raw: str };
  }
}

function cleanReasoningTags(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<(think|thought)>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(think|thought)>[\s\S]*$/gi, '')
    .replace(/<\/(think|thought)>/gi, '')
    .trim();
}
