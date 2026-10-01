// src/lib/cloudflareAI.js
// Routes through Vite's dev proxy (/api/ai) for local development if desired,
// but defaults to secure Supabase Edge Function to prevent exposing API keys.
// ── STREAMING: When onStream callback is provided, uses real SSE token streaming ──
import { supabase } from '@/api/supabaseClient';

// Find all environment variable keys that match our pattern
const envKeys = Object.keys(import.meta.env);

// We look for VITE_CLOUDFLARE_AI_TOKEN, VITE_CLOUDFLARE_AI_TOKEN_2, etc.
// And their corresponding VITE_CLOUDFLARE_ACCOUNT_ID, VITE_CLOUDFLARE_ACCOUNT_ID_2, etc.
const API_ACCOUNTS = [];

// Handle the primary/default ones first (no number suffix)
const defaultToken = import.meta.env.VITE_CLOUDFLARE_AI_TOKEN;
const defaultAccountId = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID || "78b7b64f896a40f73928be7d40248fcc9793e94185e8ffb980cf243a6477ce8b";

if (defaultToken) {
  API_ACCOUNTS.push({ token: defaultToken, accountId: defaultAccountId });
}

// Handle the numbered ones (e.g. _2, _3, _4)
const tokenPattern = /^VITE_CLOUDFLARE_AI_TOKEN_(\d+)$/;
envKeys.forEach(key => {
  const match = key.match(tokenPattern);
  if (match) {
    const num = match[1];
    const token = import.meta.env[key];
    const accountId = import.meta.env[`VITE_CLOUDFLARE_ACCOUNT_ID_${num}`];

    if (token) {
      API_ACCOUNTS.push({
        token,
        accountId: accountId || defaultAccountId // Fallback to default ID if they forgot to add the ID variable
      });
    }
  }
});

let currentAccountIndex = 0;

const MODELS = {
  // Preferred model — the edge function cascades automatically:
  //   moonshotai/kimi-k3 → moonshotai/kimi-k2.5 → @cf/qwen/qwq-32b → DeepSeek-R1 → GLM-4.7 → Llama
  text: "moonshotai/kimi-k3",
  vision: "@cf/zai-org/glm-4.7-flash", // GLM-4.7 supports vision + 131k context
};

// ── Environment constants for production streaming ──
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Helper to make NON-STREAMING API requests to Cloudflare AI.
 * Used for background tasks (summaries, embeddings, entity extraction).
 */
async function runAI(model, payload, retryCount = 0) {
  // Use local Vite dev proxy ONLY when explicitly running on localhost or 127.0.0.1
  const isLocalProxy = API_ACCOUNTS.length > 0 && 
    typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (isLocalProxy) {
    const accountConfig = API_ACCOUNTS[currentAccountIndex];
    const url = `/api/ai/${accountConfig.accountId}/${model}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accountConfig.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Cloudflare AI Error (Account Index ${currentAccountIndex}):`, response.status, errText);

      if (retryCount < API_ACCOUNTS.length - 1) {
        console.warn("Rotating to next Cloudflare AI API account...");
        currentAccountIndex = (currentAccountIndex + 1) % API_ACCOUNTS.length;
        return runAI(model, payload, retryCount + 1);
      }

      throw new Error(`AI request failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    
    // Native OpenAI/Moonshot response format
    if (data.choices) {
      return { response: data.choices[0]?.message?.content || "" };
    }

    if (!data.success) {
      const errMsg = data.errors?.map(e => e.message).join(', ') || 'Unknown error';
      throw new Error(`Cloudflare AI error: ${errMsg}`);
    }
    return data.result;
  } else {
    // Production: try Supabase Edge Function first
    try {
      const { data, error } = await supabase.functions.invoke('clipad-ai-proxy', {
        body: { model, payload }
      });

      if (error) {
        throw new Error(`Edge Function error: ${error.message}`);
      }

      if (!data || (data.success === false && !data.choices)) {
        throw new Error(`Cloudflare AI error: ${data?.error || 'Unknown error'}`);
      }

      // If it's a native Moonshot format returning choices array
      if (data.choices) {
         return { response: data.choices[0]?.message?.content || "" };
      }

      return data.result || data;
    } catch (e) {
      throw new Error(`AI Gateway unavailable: ${e.message}`);
    }
  }
}

/**
 * Parse SSE lines from a ReadableStream reader.
 * Cloudflare AI SSE format per line: "data: {"response":"token"}\n\n"
 * Returns accumulated text token by token, calling onToken for each new token.
 */
async function consumeSSEStream(reader, onToken) {
  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    // Keep the last (possibly incomplete) line in the buffer
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const raw = trimmed.slice(6);
      if (raw === '[DONE]') return accumulated;
      try {
        const parsed = JSON.parse(raw);
        const token = parsed?.response ?? parsed?.choices?.[0]?.delta?.content ?? '';
        if (token) {
          accumulated += token;
          onToken(accumulated);
        }
      } catch (_) {
        // Partial JSON — safe to skip
      }
    }
  }
  return accumulated;
}

/**
 * Generate text using Kimi K2.5 or faster models depending on options
 * @param {Array|string} input - Array of {role, content} objects or a prompt string
 * @param {Function|null} onStream - If provided, uses REAL SSE streaming. Called with accumulated text on each token.
 * @param {Object} options - Options object, e.g. { fast: boolean }
 */
export async function generateText(input, onStream = null, options = {}) {
  let messages = [];
  if (Array.isArray(input)) {
    messages = input;
  } else if (typeof input === 'string') {
    messages = [{ role: "user", content: input }];
  }

  const useStream = typeof onStream === 'function';
  const isLocalProxy = API_ACCOUNTS.length > 0 && 
    typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const selectedModel = options.fast ? "@cf/zai-org/glm-4.7-flash" : MODELS.text;
  const maxTokens = options.fast ? 800 : 2500;

  // ── REAL STREAMING PATH ────────────────────────────────────────────────────
  if (useStream) {
    try {
      let response;

      if (isLocalProxy) {
        // Local dev: call Cloudflare directly via Vite proxy with stream:true
        const accountConfig = API_ACCOUNTS[currentAccountIndex];
        const url = `/api/ai/${accountConfig.accountId}/${selectedModel}`;
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accountConfig.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages, max_tokens: maxTokens, stream: true }),
        });
      } else {
        // Production: call Supabase edge function via raw fetch
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token || SUPABASE_ANON_KEY;

        response = await fetch(`${SUPABASE_URL}/functions/v1/clipad-ai-proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            model: selectedModel,
            payload: { messages, max_tokens: maxTokens },
            stream: true,
          }),
        });
      }

      if (!response.ok || !response.body) {
        console.warn('[OrbitFlow] Streaming not available, falling back to non-stream.');
        return generateText(input, null, options);
      }

      const reader = response.body.getReader();
      return await consumeSSEStream(reader, onStream);

    } catch (streamErr) {
      console.warn('[OrbitFlow] Streaming error, falling back:', streamErr.message);
      return generateText(input, null, options);
    }
  }

  // ── NON-STREAMING PATH (used for background AI tasks: summaries, extraction) ──
  try {
    const result = await runAI(selectedModel, { messages, max_tokens: maxTokens });

    let finalText = result?.response || '';
    if (result?.choices && result.choices.length > 0) {
      if (result.choices[0].message && result.choices[0].message.content) {
        finalText = result.choices[0].message.content;
      } else if (result.choices[0].text) {
        finalText = result.choices[0].text;
      }
    }
    if (!finalText && typeof result === 'string') finalText = result;

    // Strip ALL <think>...</think> tags and orphan </think> tags from non-streaming responses.
    // Non-streaming callers (daily briefing, context capsule, etc.) never need to see reasoning steps.
    if (finalText && (finalText.includes('<think>') || finalText.includes('</think>') || finalText.includes('<thought>'))) {
      finalText = finalText
        .replace(/<(think|thought)>[\s\S]*?<\/\1>/gi, '') // complete blocks
        .replace(/<(think|thought)>[\s\S]*$/gi, '')        // unclosed opening tags
        .replace(/<\/(think|thought)>/gi, '')              // orphan closing tags
        .trim();
    }

    return finalText || "I am unable to generate a response right now. Please try again.";
  } catch (err) {
    console.error("generateText error:", err);
    
    // Check if current logged-in user is a super admin
    let isSuperAdmin = false;
    try {
      if (typeof window !== 'undefined' && window.__SLATE_USER__) {
        const u = window.__SLATE_USER__;
        isSuperAdmin = u?.role === 'super_admin' || u?.user_metadata?.role === 'super_admin';
      }
    } catch (_) {}

    if (isSuperAdmin) {
      const errStr = `⚠️ [Admin Debug] AI Gateway Error: ${err.message || 'Check Supabase Edge Function & CORS setup'}`;
      if (messages.some(m => m.content && m.content.toLowerCase().includes('json'))) {
        return JSON.stringify({ error: errStr });
      }
      return errStr;
    }

    const fallbackMsg = "Our AI servers are currently busy or experiencing a brief connection delay. Please try again in a few moments!";
    if (messages.some(m => m.content && typeof m.content === 'string' && m.content.toLowerCase().includes('json'))) {
      return JSON.stringify({ error: fallbackMsg });
    }
    return fallbackMsg;
  }
}

/**
 * Perform image analysis / OCR / vision on an image using Kimi K2.5
 * Accepts: Uint8Array, ArrayBuffer, or base64 string
 */
export async function analyzeImage(imageBytes, prompt) {
  // ── Convert to base64 ──────────────────────────────────────────────────────
  let base64String = '';
  if (typeof imageBytes === 'string') {
    // Already base64 or data URL
    base64String = imageBytes.startsWith('data:')
      ? imageBytes.split(',')[1]
      : imageBytes;
  } else if (imageBytes instanceof ArrayBuffer) {
    const bytes = new Uint8Array(imageBytes);
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    base64String = btoa(binary);
  } else if (imageBytes instanceof Uint8Array || Array.isArray(imageBytes)) {
    const arr = imageBytes instanceof Uint8Array ? imageBytes : new Uint8Array(imageBytes);
    let binary = '';
    arr.forEach(b => { binary += String.fromCharCode(b); });
    base64String = btoa(binary);
  }

  // ── Strategy 1: Vision API with base64 payload ────────────────────────────
  try {
    const result = await runAI(MODELS.vision, {
      prompt: prompt || 'Describe this image in detail and provide relevant business insights.',
      image: base64String,  // Kimi K2.5 vision expects base64 string, not byte array
    });
    const text = result?.response || result?.result?.response || (typeof result === 'string' ? result : '');
    if (text && text.length > 10) return text;
  } catch (e) {
    console.warn('[Vision] Primary vision API failed, trying message embed fallback:', e.message);
  }

  // ── Strategy 2: Embed base64 image in a chat message (multimodal) ─────────
  try {
    const result = await runAI(MODELS.vision, {
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64String}` } },
            { type: 'text', text: prompt || 'Describe this image in detail and provide relevant business insights.' },
          ],
        },
      ],
      max_tokens: 1500,
    });
    const text = result?.response || result?.choices?.[0]?.message?.content || (typeof result === 'string' ? result : '');
    if (text && text.length > 10) return text;
  } catch (e) {
    console.warn('[Vision] Multimodal message embed also failed:', e.message);
  }

  // ── Strategy 3: Describe what we know without vision (graceful degradation) ─
  return await generateText([
    { role: 'system', content: 'The user has uploaded an image for analysis. The vision API is temporarily unavailable. Acknowledge the image was received, explain that vision processing is currently unavailable, and offer to help with any text-based questions about the image.' },
    { role: 'user', content: prompt || 'Please analyze this image.' },
  ]);
}

export async function invokeCloudflareAi(prompt, systemPrompt = "") {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });
  return await generateText(messages);
}

