import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// A simplified mock of the connect service for Edge Function deployment

serve(async (req) => {
  // CORS setup
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    } });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } }
  });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const token = authHeader.replace('Bearer ', '');
    const url = new URL(req.url);
    const pathname = url.pathname;
    const body = req.method === 'POST' ? await req.json() : {};

    // Validate Token and Retrieve Authorized Context via local edge logic 
    // (Simulating the clipadConnectService boundary for the real API handler)
    
    // In actual deployment, we'd import getAuthorizedContext, but for Edge Functions 
    // it requires Deno module resolution. We validate the DB token directly here 
    // as the real API integration boundary.

    // 1. Authenticate Token & Enforce Scope
    const { data: tokenData, error: tokenError } = await supabase
      .from('clipad_v3_connect_tokens')
      .select('*, user:user_id ( id, email ), app:app_id ( id, name, client_id )')
      .eq('token_hash', await simulateHash(token))
      .is('revoked_at', null)
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: 'Unauthorized token' }), { status: 401 });
    }

    // 2. Audit Logging
    await supabase.from('clipad_v3_events').insert([{
      company_id: tokenData.company_id,
      user_id: tokenData.user_id,
      event_type: 'connect.api.access',
      source_domain: 'connect_api',
      payload: { app: tokenData.app.id, path: pathname, method: req.method, query: body.query }
    }]);

    // 3. Routing
    if (pathname.includes('/search')) {
      if (!tokenData.scopes.includes('memory:read')) {
        return new Response(JSON.stringify({ error: 'Missing memory:read scope' }), { status: 403 });
      }
      
      const { data, error } = await supabase
        .from('clipad_v3_memories')
        .select('*')
        .eq('company_id', tokenData.company_id)
        .eq('is_active', true)
        .ilike('content', \`%\${body.query}%\`)
        .limit(10);
        
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { status: 200, headers: { 'Content-Type': 'application/json' }});
    }

    return new Response(JSON.stringify({ error: 'Endpoint not implemented in foundation' }), { status: 404 });
    
  } catch (err) {
    console.error('Connect Edge Function Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});

async function simulateHash(secret) {
  const msgUint8 = new TextEncoder().encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
