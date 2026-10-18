// consumer.ts
// Sample consumer project verifying TypeScript consumption and type inference
// of the compiled @weftro/sdk package from dist/

import {
  WeftroClient,
  WeftroApiError,
  WeftroAuthenticationError,
  type MemoryResult,
  type CaptureRecord,
  type ApiResponse
} from '../../dist/index.js';

// 1. Instantiation type check
const client = new WeftroClient({
  apiKey: 'cpd_sample_key',
  baseUrl: 'https://example.com'
});

async function main() {
  // 2. Search typing
  const searchRes: ApiResponse<MemoryResult[]> = await client.search({ query: 'architecture' });
  for (const memory of searchRes.data) {
    const _id: string = memory.id;
    const _conf: number = memory.confidence;
  }

  // 3. Captures create typing with idempotencyKey
  const capRes: ApiResponse<CaptureRecord> = await client.captures.create(
    { title: 'Note', content: 'Text' },
    { idempotencyKey: 'idemp_sample_1' }
  );
  const _status: 'QUEUED' | 'PROCESSING' | 'PROCESSED' | 'FAILED' = capRes.data.status;

  // 4. Error handling type checks
  try {
    await client.health();
  } catch (err: unknown) {
    if (err instanceof WeftroAuthenticationError) {
      const _status: number = err.status;
    } else if (err instanceof WeftroApiError) {
      const _code: string = err.code;
    }
  }
}

main().catch(() => {});
