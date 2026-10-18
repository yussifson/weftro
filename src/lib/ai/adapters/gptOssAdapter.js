// src/lib/ai/adapters/gptOssAdapter.js
// Adapter for @cf/openai/gpt-oss-120b
import { BaseAIAdapter } from './baseAdapter';

export class GptOssAdapter extends BaseAIAdapter {
  constructor(specs) {
    super('@cf/openai/gpt-oss-120b', specs);
  }

  formatPayload({
    messages = [],
    maxTokens = 2500,
    temperature = 0.2,
    tools = null,
    responseFormat = null,
    reasoningEffort = null,
    stream = false,
  }) {
    const payload = {
      messages: messages.map(m => ({
        role: m.role || 'user',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
      })),
      max_tokens: Math.min(maxTokens, this.specs?.maxOutputTokens || 4096),
      temperature,
      stream: !!stream,
    };

    if (reasoningEffort) {
      payload.reasoning_effort = reasoningEffort;
    }

    if (responseFormat) {
      if (responseFormat.type === 'json_object' || responseFormat.type === 'json') {
        payload.response_format = { type: 'json_object' };
      } else if (responseFormat.json_schema) {
        payload.response_format = {
          type: 'json_schema',
          json_schema: responseFormat.json_schema
        };
      }
    }

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

    // Clean any lingering reasoning tags
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
