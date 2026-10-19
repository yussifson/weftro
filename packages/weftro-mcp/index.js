#!/usr/bin/env node

/**
 * Official Model Context Protocol (MCP) Server for Weftro V3
 *
 * Exposes Weftro's organizational memory and intelligence to AI clients
 * (Cursor, Claude Desktop, Windsurf, LangChain, custom agents) via stdio transport.
 *
 * Strictly delegates all data access and authorization to the Connect API Gateway:
 * - Never communicates with the database directly.
 * - Inherits all organization isolation, token scopes, and rate limits.
 * - Scrubbing applied to prevent token leakage in errors and logging.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_GATEWAY_URL = 'https://www.weftro.com';
const GATEWAY_URL = (process.env.WEFTRO_API_URL || DEFAULT_GATEWAY_URL).replace(/\/+$/, '');
const API_TOKEN = process.env.WEFTRO_TOKEN || process.env.WEFTRO_API_KEY || '';

// Secret scrubber to prevent credential leakage in logs or exceptions
function sanitizeOutput(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/(cpd_[a-zA-Z0-9_-]{8})[a-zA-Z0-9_-]+/g, '$1••••••••')
    .replace(/(secret_[a-zA-Z0-9_-]{8})[a-zA-Z0-9_-]+/g, '$1••••••••')
    .replace(/(client_[a-zA-Z0-9_-]{8})[a-zA-Z0-9_-]+/g, '$1••••••••')
    .replace(/(Bearer\s+)[a-zA-Z0-9_.-]{20,}/gi, '$1••••••••••••••••');
}

/**
 * Centralized HTTP client forwarding requests to the Weftro Connect Gateway
 */
async function callGateway(path, method = 'GET', body = null) {
  if (!API_TOKEN) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      'Authentication required: WEFTRO_TOKEN environment variable is missing. Obtain a scoped token from the Weftro Developer Platform.'
    );
  }

  const url = `${GATEWAY_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = {
    'Authorization': `Bearer ${API_TOKEN.trim()}`,
    'Accept': 'application/json',
    'User-Agent': 'weftro-mcp-server/1.0.0'
  };

  if (body && method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body && method !== 'GET' ? JSON.stringify(body) : undefined
    });
  } catch (netErr) {
    throw new McpError(
      ErrorCode.InternalError,
      `Network error connecting to Weftro Gateway: ${sanitizeOutput(netErr.message)}`
    );
  }

  let data;
  try {
    data = await res.json();
  } catch (_e) {
    data = await res.text();
  }

  if (!res.ok) {
    const errorMsg = data?.error?.message || (typeof data === 'string' ? data : res.statusText);
    const errorCode = data?.error?.code || 'GATEWAY_ERROR';
    
    // Map HTTP error codes to MCP error semantics
    if (res.status === 401) {
      throw new McpError(ErrorCode.InvalidRequest, `Weftro Authentication Failed (${errorCode}): ${sanitizeOutput(errorMsg)}`);
    }
    if (res.status === 403) {
      throw new McpError(ErrorCode.InvalidRequest, `Weftro Authorization Denied (${errorCode}): ${sanitizeOutput(errorMsg)}`);
    }
    if (res.status === 404) {
      throw new McpError(ErrorCode.InvalidRequest, `Weftro Resource Not Found (${errorCode}): ${sanitizeOutput(errorMsg)}`);
    }
    if (res.status === 429) {
      throw new McpError(ErrorCode.InternalError, `Weftro Rate Limit Exceeded: ${sanitizeOutput(errorMsg)}`);
    }

    throw new McpError(ErrorCode.InternalError, `Weftro Gateway Error (${res.status} ${errorCode}): ${sanitizeOutput(errorMsg)}`);
  }

  return data;
}

// Initialize MCP Server
const server = new Server(
  {
    name: 'weftro-mcp-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Define Authorized Read-Only Tools
const TOOLS = [
  {
    name: 'search_organizational_memory',
    description: 'Execute semantic and grounded search across authorized organizational memories, documents, and technical notes with confidence scores and provenance.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query or technical concept to retrieve from organizational memory.'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of memories to return (1-50, default 10).'
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip for pagination (default 0).'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'query_organizational_context',
    description: 'Retrieve structured context session records and chronologically bound captures by session ID or search keywords.',
    inputSchema: {
      type: 'object',
      properties: {
        context_session_id: {
          type: 'string',
          description: 'Specific UUID of an existing context session.'
        },
        query: {
          type: 'string',
          description: 'Optional query keywords to match against context sessions.'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of items to return (1-50, default 10).'
        }
      }
    }
  },
  {
    name: 'get_memory_by_id',
    description: 'Retrieve the complete content, importance score, memory tier, and metadata for a specific organizational memory by its UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        memory_id: {
          type: 'string',
          description: 'The UUID of the memory record to retrieve.'
        }
      },
      required: ['memory_id']
    }
  },
  {
    name: 'list_organizational_memories',
    description: 'List paginated organizational memories with optional filtering by status (ACTIVE/ARCHIVED).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of memories to return (1-50, default 10).'
        },
        offset: {
          type: 'number',
          description: 'Pagination offset (default 0).'
        },
        status: {
          type: 'string',
          description: 'Optional memory status filter (e.g. "ACTIVE").'
        }
      }
    }
  },
  {
    name: 'get_entity_by_id',
    description: 'Retrieve a knowledge graph entity node, entity type, attributes, and relationships array by entity UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        entity_id: {
          type: 'string',
          description: 'The UUID of the entity node.'
        }
      },
      required: ['entity_id']
    }
  },
  {
    name: 'list_captures',
    description: 'List authorized organizational captures, source types (audio, video, text notes), and processing states.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of captures to return (1-50, default 10).'
        },
        offset: {
          type: 'number',
          description: 'Pagination offset (default 0).'
        },
        source_type: {
          type: 'string',
          description: 'Filter by source type (e.g. "text_note", "meeting_recording", "slack_message").'
        }
      }
    }
  },
  {
    name: 'get_capture_by_id',
    description: 'Retrieve a specific capture record, transcript or note content, and queue processing status by capture UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        capture_id: {
          type: 'string',
          description: 'The UUID of the capture.'
        }
      },
      required: ['capture_id']
    }
  },
  {
    name: 'list_smart_moments',
    description: 'List extracted smart moments, key decisions, action items, and topic highlights with source timecodes.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of moments to return (1-50, default 10).'
        },
        offset: {
          type: 'number',
          description: 'Pagination offset (default 0).'
        },
        moment_type: {
          type: 'string',
          description: 'Optional moment type filter (e.g. "DECISION", "ACTION_ITEM", "KEY_POINT").'
        }
      }
    }
  },
  {
    name: 'get_source_provenance',
    description: 'Retrieve full source provenance, timestamps, original creator metadata, and media references for an organizational item.',
    inputSchema: {
      type: 'object',
      properties: {
        source_id: {
          type: 'string',
          description: 'The UUID of the source item (capture, meeting, or note).'
        }
      },
      required: ['source_id']
    }
  },
  {
    name: 'create_capture',
    description: 'Ingest raw external content, notes, or ideas into the organization capture inbox with asynchronous queue scheduling.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Optional headline or title for the captured note or resource.'
        },
        content: {
          type: 'string',
          description: 'The raw text content, note, transcript snippet, or meeting summary.'
        },
        source_type: {
          type: 'string',
          description: 'Type of origin source (e.g., "text_note", "slack_message", "cli_capture", "browser_clipper"). Default: "text_note".'
        },
        capture_type: {
          type: 'string',
          description: 'Category classification (e.g., "NOTE", "AUDIO", "MEETING", "DOCUMENT"). Default: "NOTE".'
        },
        context_session_id: {
          type: 'string',
          description: 'Optional UUID of an existing context session in the organization.'
        },
        metadata: {
          type: 'object',
          description: 'Optional JSON metadata to attach to the capture.'
        },
        idempotency_key: {
          type: 'string',
          description: 'Optional unique client request key to guarantee exactly-once ingestion on retries.'
        }
      },
      required: ['content']
    }
  },
  {
    name: 'create_organizational_memory',
    description: 'Synthesize verified, durable organizational memory (Fact, Decision, Preference, Pattern) with explicit importance, confidence score, and provenance.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Concise summary or subject title of the organizational memory.'
        },
        content: {
          type: 'string',
          description: 'Comprehensive, verified knowledge statement or architectural decision.'
        },
        memory_type: {
          type: 'string',
          description: 'Classification: "FACT", "DECISION", "PREFERENCE", "PATTERN", "LESSON_LEARNED". Default: "FACT".'
        },
        memory_tier: {
          type: 'string',
          description: 'Scope tier: "organizational", "team", "personal". Default: "organizational".'
        },
        importance: {
          type: 'number',
          description: 'Priority score between 0.0 and 1.0 (default 0.5).'
        },
        confidence_score: {
          type: 'number',
          description: 'Certainty rating between 0.0 and 1.0 (default 1.0).'
        },
        source_id: {
          type: 'string',
          description: 'Optional UUID of a verified source (capture or video) in the organization.'
        },
        source_type: {
          type: 'string',
          description: 'Identifier for source medium (e.g., "manual_entry", "capture_distillation", "design_review").'
        },
        idempotency_key: {
          type: 'string',
          description: 'Optional unique client request key to guarantee exactly-once creation on retries.'
        }
      },
      required: ['title', 'content']
    }
  }
];

// Tool Discovery Handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const enableMutations = process.env.WEFTRO_ENABLE_MUTATIONS === 'true' || process.env.WEFTRO_WRITE_TOOLS === 'true';
  const toolsToReturn = enableMutations
    ? TOOLS
    : TOOLS.filter(t => t.name !== 'create_capture' && t.name !== 'create_organizational_memory');
  return { tools: toolsToReturn };
});

// Tool Invocation Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case 'search_organizational_memory': {
        const schema = z.object({
          query: z.string().min(1, 'Query must not be empty'),
          limit: z.number().int().min(1).max(50).optional(),
          offset: z.number().int().min(0).optional()
        });
        const validated = schema.parse(args);
        const result = await callGateway('/api/v1/search', 'POST', validated);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'query_organizational_context': {
        const schema = z.object({
          context_session_id: z.string().uuid().optional(),
          query: z.string().optional(),
          limit: z.number().int().min(1).max(50).optional()
        });
        const validated = schema.parse(args);
        const result = await callGateway('/api/v1/context/query', 'POST', validated);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'get_memory_by_id': {
        const schema = z.object({
          memory_id: z.string().uuid('Invalid memory UUID format')
        });
        const validated = schema.parse(args);
        const result = await callGateway(`/api/v1/memories/${validated.memory_id}`, 'GET');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'list_organizational_memories': {
        const schema = z.object({
          limit: z.number().int().min(1).max(50).optional(),
          offset: z.number().int().min(0).optional(),
          status: z.string().optional()
        });
        const validated = schema.parse(args);
        const params = new URLSearchParams();
        if (validated.limit) params.set('limit', String(validated.limit));
        if (validated.offset) params.set('offset', String(validated.offset));
        if (validated.status) params.set('status', validated.status);

        const qs = params.toString() ? `?${params.toString()}` : '';
        const result = await callGateway(`/api/v1/memories${qs}`, 'GET');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'get_entity_by_id': {
        const schema = z.object({
          entity_id: z.string().uuid('Invalid entity UUID format')
        });
        const validated = schema.parse(args);
        const result = await callGateway(`/api/v1/entities/${validated.entity_id}`, 'GET');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'list_captures': {
        const schema = z.object({
          limit: z.number().int().min(1).max(50).optional(),
          offset: z.number().int().min(0).optional(),
          source_type: z.string().optional()
        });
        const validated = schema.parse(args);
        const params = new URLSearchParams();
        if (validated.limit) params.set('limit', String(validated.limit));
        if (validated.offset) params.set('offset', String(validated.offset));
        if (validated.source_type) params.set('source_type', validated.source_type);

        const qs = params.toString() ? `?${params.toString()}` : '';
        const result = await callGateway(`/api/v1/captures${qs}`, 'GET');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'get_capture_by_id': {
        const schema = z.object({
          capture_id: z.string().uuid('Invalid capture UUID format')
        });
        const validated = schema.parse(args);
        const result = await callGateway(`/api/v1/captures/${validated.capture_id}`, 'GET');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'list_smart_moments': {
        const schema = z.object({
          limit: z.number().int().min(1).max(50).optional(),
          offset: z.number().int().min(0).optional(),
          moment_type: z.string().optional()
        });
        const validated = schema.parse(args);
        const params = new URLSearchParams();
        if (validated.limit) params.set('limit', String(validated.limit));
        if (validated.offset) params.set('offset', String(validated.offset));
        if (validated.moment_type) params.set('moment_type', validated.moment_type);

        const qs = params.toString() ? `?${params.toString()}` : '';
        const result = await callGateway(`/api/v1/smart-moments${qs}`, 'GET');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'get_source_provenance': {
        const schema = z.object({
          source_id: z.string().uuid('Invalid source UUID format')
        });
        const validated = schema.parse(args);
        const result = await callGateway(`/api/v1/sources/${validated.source_id}`, 'GET');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'create_capture': {
        const schema = z.object({
          title: z.string().optional(),
          content: z.string().min(1, 'Capture content cannot be empty'),
          source_type: z.string().optional(),
          capture_type: z.string().optional(),
          context_session_id: z.string().uuid('Invalid session UUID').optional(),
          metadata: z.record(z.any()).optional(),
          idempotency_key: z.string().optional()
        });
        const validated = schema.parse(args);
        const result = await callGateway('/api/v1/captures', 'POST', validated);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'create_organizational_memory': {
        const schema = z.object({
          title: z.string().min(1, 'Memory title cannot be empty'),
          content: z.string().min(1, 'Memory content cannot be empty'),
          memory_type: z.enum(['FACT', 'DECISION', 'PREFERENCE', 'PATTERN', 'LESSON_LEARNED']).optional(),
          memory_tier: z.enum(['organizational', 'team', 'personal']).optional(),
          importance: z.number().min(0).max(1).optional(),
          confidence_score: z.number().min(0).max(1).optional(),
          source_id: z.string().uuid('Invalid source UUID').optional(),
          source_type: z.string().optional(),
          idempotency_key: z.string().optional()
        });
        const validated = schema.parse(args);
        const result = await callGateway('/api/v1/memories', 'POST', validated);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool name: ${name}`);
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issueDetails = err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new McpError(ErrorCode.InvalidParams, `Invalid tool arguments: ${issueDetails}`);
    }
    if (err instanceof McpError) {
      throw err;
    }
    throw new McpError(ErrorCode.InternalError, `Tool execution error: ${sanitizeOutput(err.message)}`);
  }
});

// Start Stdio Transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Stdio transport uses stdout for JSON-RPC messages; stderr is used for informational logging
  console.error('[weftro-mcp-server] Weftro MCP Server running on stdio');
  console.error(`[weftro-mcp-server] Connected gateway: ${GATEWAY_URL}`);
}

main().catch((err) => {
  console.error('[weftro-mcp-server] Fatal error starting server:', sanitizeOutput(err.message));
  process.exit(1);
});
