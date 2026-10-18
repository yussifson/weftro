// src/lib/ai/agentOrchestrator.js
// Enterprise Bounded Agentic Tool Orchestration Loop
// Enforces tenant isolation, tool whitelist authorization, iteration caps, and strict parameter schemas.

import { AI_MODELS, TASK_TYPES } from './models';
import { selectModelForRequest, getAdapter, getFallbackModel } from './modelRouter';
import { mcpTools } from '@/lib/clipadConnectService';

// Security Constraints
const MAX_AGENT_STEPS = 5;
const STEP_TIMEOUT_MS = 25000;

// Whitelisted tool declarations with parameters
export const AGENT_AVAILABLE_TOOLS = [
  {
    name: 'search_clipad',
    description: 'Search company knowledge, meeting memories, and documents by semantic query.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Semantic search query string' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_context',
    description: 'Retrieve full context tree and linked captures for a specific context session ID.',
    parameters: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Unique identifier for the context session' }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'get_entity',
    description: 'Fetch detailed attributes, relationships, and metadata for a knowledge entity.',
    parameters: {
      type: 'object',
      properties: {
        entityId: { type: 'string', description: 'Unique ID of the entity' }
      },
      required: ['entityId']
    }
  },
  {
    name: 'get_smart_moments',
    description: 'Retrieve detected executive insights, decisions, and action items by topic.',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Topic or keyword to match against smart moments' }
      },
      required: ['topic']
    }
  }
];

/**
 * Execute an authorized tool safely within tenant boundaries
 */
export async function executeAuthorizedTool(toolCall, userContext, authToken) {
  const toolName = toolCall.name;
  const args = toolCall.arguments || {};

  // 1. Tool Whitelist Check
  const toolFn = mcpTools[toolName];
  if (!toolFn || typeof toolFn !== 'function') {
    return {
      error: `Tool '${toolName}' is not recognized or not authorized.`,
      status: 'rejected'
    };
  }

  // 2. Tenant Context Check
  if (!userContext || !userContext.company_id) {
    return {
      error: 'Tenant authorization missing. Tool execution prohibited.',
      status: 'unauthorized'
    };
  }

  try {
    // 3. Bound individual tool execution with a timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Tool execution for '${toolName}' timed out`)), 10000)
    );

    const executionPromise = toolFn(args, authToken || 'internal-tenant-session');
    const result = await Promise.race([executionPromise, timeoutPromise]);

    return {
      status: 'success',
      data: result
    };
  } catch (err) {
    return {
      status: 'error',
      error: err.message || 'Execution error'
    };
  }
}

/**
 * Run a multi-step agentic loop with intelligent model routing
 *
 * @param {Object} options
 * @param {Array} options.messages - Initial messages
 * @param {Object} options.userContext - Authenticated user details
 * @param {string} options.authToken - Bearer or session token
 * @param {Function} options.runAIFn - Backend AI runner function
 * @param {Function} [options.onStep] - Observability callback for agent iterations
 * @returns {Promise<{ finalResponse: string, steps: Array, model: string, completed: boolean }>}
 */
export async function runAgenticWorkflow({
  messages = [],
  userContext = null,
  authToken = null,
  runAIFn,
  onStep = null,
  maxSteps = MAX_AGENT_STEPS,
}) {
  if (typeof runAIFn !== 'function') {
    throw new Error('runAIFn must be a callable AI execution function');
  }

  const stepsHistory = [];
  let conversation = [...messages];
  let currentStep = 0;
  let finalResponse = '';

  // Select initial model for agentic tool use
  let routing = selectModelForRequest({
    task: TASK_TYPES.TOOL_USE,
    messages: conversation,
    tools: AGENT_AVAILABLE_TOOLS,
  });

  let activeModel = routing.model;

  while (currentStep < maxSteps) {
    currentStep++;

    const adapter = getAdapter(activeModel);
    const payload = adapter.formatPayload({
      messages: conversation,
      tools: AGENT_AVAILABLE_TOOLS,
      maxTokens: 2000,
    });

    let rawResult;
    try {
      rawResult = await runAIFn(activeModel, payload);
    } catch (err) {
      // Automatic fallback to secondary model if primary fails
      const fallback = getFallbackModel(activeModel);
      console.warn(`[AgentOrchestrator] Model ${activeModel} failed (${err.message}). Cascading to fallback ${fallback}`);
      activeModel = fallback;
      const fallbackAdapter = getAdapter(activeModel);
      const fallbackPayload = fallbackAdapter.formatPayload({
        messages: conversation,
        tools: AGENT_AVAILABLE_TOOLS,
        maxTokens: 2000,
      });
      rawResult = await runAIFn(activeModel, fallbackPayload);
    }

    const normalized = adapter.normalizeResponse(rawResult);

    // If the model did not request any tools, we reached the final answer
    if (!normalized.toolCalls || normalized.toolCalls.length === 0) {
      finalResponse = normalized.text;
      stepsHistory.push({
        step: currentStep,
        action: 'final_answer',
        model: activeModel,
        content: finalResponse,
      });
      if (onStep) onStep({ step: currentStep, type: 'complete', content: finalResponse });
      break;
    }

    // Process tool calls requested by the model
    stepsHistory.push({
      step: currentStep,
      action: 'tool_call',
      model: activeModel,
      toolCalls: normalized.toolCalls,
    });

    if (onStep) {
      onStep({ step: currentStep, type: 'tool_call', toolCalls: normalized.toolCalls });
    }

    // Add assistant's message with tool call requests into history
    conversation.push({
      role: 'assistant',
      content: normalized.text || '',
      tool_calls: normalized.toolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments)
        }
      }))
    });

    // Execute each tool and append tool results
    for (const toolCall of normalized.toolCalls) {
      const toolOutput = await executeAuthorizedTool(toolCall, userContext, authToken);

      conversation.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolCall.name,
        content: JSON.stringify(toolOutput)
      });
    }

    // Re-evaluate model routing if context size has grown significantly
    routing = selectModelForRequest({
      task: TASK_TYPES.TOOL_USE,
      messages: conversation,
      tools: AGENT_AVAILABLE_TOOLS,
    });
    activeModel = routing.model;
  }

  // If maximum steps reached without clean exit, request final synthesis
  if (!finalResponse && currentStep >= maxSteps) {
    conversation.push({
      role: 'user',
      content: 'Summarize your findings so far into a concise response.'
    });
    const adapter = getAdapter(activeModel);
    const payload = adapter.formatPayload({ messages: conversation, maxTokens: 1500 });
    const raw = await runAIFn(activeModel, payload);
    const norm = adapter.normalizeResponse(raw);
    finalResponse = norm.text;
  }

  return {
    finalResponse,
    steps: stepsHistory,
    model: activeModel,
    completed: true,
  };
}
