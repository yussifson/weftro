# @weftro/sdk

Official TypeScript/JavaScript SDK for **Weftro Organizational Memory & Connect API**.

Provides typed access to Weftro's versioned REST API gateway across Node.js, browsers, and Edge runtimes.

## Installation

```bash
npm install @weftro/sdk
```

## Features

- **Full OpenAPI Coverage**: 100% typed methods for all 23 paths in the Weftro Connect API.
- **Explicit Credential Injection**: Zero hidden state or automatic token persistence.
- **Caller-Supplied Idempotency**: Safe retry semantics for mutation operations (`captures.create`, `memories.create`).
- **Structured Error Hierarchy**: Specific error classes for 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Rate Limit, and timeouts.
- **Zero Heavy Dependencies**: Uses standard `fetch`, Web Crypto, and ES Modules.

## Quick Start

```typescript
import { WeftroClient } from '@weftro/sdk';

const client = new WeftroClient({
  apiKey: process.env.WEFTRO_TOKEN!,
  baseUrl: 'https://wmabgiafwamxkcgxyhee.supabase.co/functions/v1/connect' // Optional override
});

// Grounded semantic search across organizational memory
const results = await client.search({
  query: 'Quarterly architecture roadmap',
  limit: 10
});

console.log(`Found ${results.data.length} memories:`, results.data);
```

## Creating Organizational Knowledge & Captures

```typescript
// 1. Ingest asynchronous external capture (QUEUED state)
const capture = await client.captures.create({
  title: 'Architecture Review Meeting',
  content: 'Decided to standardize on Model Context Protocol across all AI agents.',
  source_type: 'meeting_transcript'
}, {
  idempotencyKey: 'review_meeting_2026_q4' // Optional caller idempotency key
});

// 2. Publish verified active organizational memory
const memory = await client.memories.create({
  title: 'Standard Agent Architecture Pattern',
  content: 'All internal agent workstreams delegate to the Connect API Gateway.',
  memory_type: 'PATTERN',
  memory_tier: 'organizational',
  importance: 0.95
});
```

## Error Handling

```typescript
import {
  WeftroClient,
  WeftroAuthenticationError,
  WeftroForbiddenError,
  WeftroRateLimitError
} from '@weftro/sdk';

try {
  await client.memories.list();
} catch (err) {
  if (err instanceof WeftroAuthenticationError) {
    console.error('Invalid or expired API token');
  } else if (err instanceof WeftroForbiddenError) {
    console.error('Insufficient token scopes for this endpoint');
  } else if (err instanceof WeftroRateLimitError) {
    console.warn(`Rate limit reached. Retry after ${err.retryAfterSeconds}s`);
  }
}
```

## License

Apache-2.0
