export const config = {
  runtime: 'edge',
};

// Simple in-memory rate limiting for Edge functions
const rateLimitMap = new Map();

export default async function handler(req) {
  try {
    // 1. Rate Limiting Logic (5 requests per minute per IP/User)
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const windowMs = 60000;
    const maxRequests = 5;

    let userRecord = rateLimitMap.get(ip);
    if (!userRecord) {
      userRecord = { count: 1, resetTime: now + windowMs };
      rateLimitMap.set(ip, userRecord);
    } else {
      if (now > userRecord.resetTime) {
        userRecord.count = 1;
        userRecord.resetTime = now + windowMs;
      } else {
        userRecord.count++;
        if (userRecord.count > maxRequests) {
          return new Response(JSON.stringify({ error: "Too Many Requests. AI Generation is limited to 5 requests per minute." }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': userRecord.resetTime.toString()
            }
          });
        }
      }
    }

    // Clean up old entries occasionally (naive approach for edge)
    if (Math.random() < 0.05) {
      for (const [key, val] of rateLimitMap.entries()) {
        if (now > val.resetTime) rateLimitMap.delete(key);
      }
    }

    // 2. Extract path params from Vercel rewritten URL
    const url = new URL(req.url);
    // Vercel routes `/api/ai/[...path]` automatically.
    // url.pathname will be /api/ai/bf512651.../@cf/moonshotai/kimi-k2.5
    const pathParts = url.pathname.replace('/api/ai/', '').split('/');
    const accountId = pathParts[0];
    const model = pathParts.slice(1).join('/');
    
    if (!accountId || !model) {
      return new Response(JSON.stringify({ error: "Invalid path. Expected /api/ai/:account/:model" }), { status: 400 });
    }

    const cloudflareUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

    const headers = new Headers(req.headers);
    headers.delete('host');
    headers.delete('x-forwarded-for');
    headers.delete('x-forwarded-host');
    headers.delete('x-forwarded-proto');

    const fetchOptions = {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    };

    const cfResponse = await fetch(cloudflareUrl, fetchOptions);
    const responseBody = await cfResponse.text();

    const responseHeaders = new Headers(cfResponse.headers);
    // Remove headers that might interfere with Vercel
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('transfer-encoding');

    return new Response(responseBody, {
      status: cfResponse.status,
      headers: responseHeaders,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
