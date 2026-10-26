import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const authHeader = req.headers.get('Authorization');

    // Authenticate caller (optional check: allow authenticated user or valid session)
    let callerUser = null;
    if (authHeader && supabaseUrl) {
      const client = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await client.auth.getUser();
      callerUser = user;
    }

    const { fileName, contentType = 'video/webm', prefix = 'recordings' } = await req.json();

    if (!fileName) {
      return new Response(JSON.stringify({ error: 'fileName is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accountId = (Deno.env.get('CLOUDFLARE_R2_ACCOUNT_ID') || 'bf5126510c1f8f2759cc81c4e7d795ef').trim();
    const bucketName = (Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME') || 'weftro-videos').trim();
    const accessKeyId = (Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID') || '').trim();
    const secretAccessKey = (Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY') || '').trim();
    const publicUrlBase = (Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL') || 'https://pub-71012eb3ac4443d09f38983c4801a1c0.r2.dev').trim().replace(/\/$/, '');

    if (!accessKeyId || !secretAccessKey) {
      return new Response(JSON.stringify({ 
        error: 'Cloudflare R2 storage credentials are not configured in environment secrets.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build the sanitized object key
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const userFolder = callerUser?.id || 'public';
    const objectKey = `${prefix}/${userFolder}/${Date.now()}_${sanitizedFileName}`;

    const r2 = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: 's3',
      region: 'auto',
    });

    // Endpoint for R2
    const targetUrl = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${objectKey}`);
    targetUrl.searchParams.set('X-Amz-Expires', '7200'); // 2 hours upload window

    const signedRequest = await r2.sign(new Request(targetUrl, { method: 'PUT' }), {
      aws: { signQuery: true },
    });

    const publicUrl = `${publicUrlBase}/${objectKey}`;

    return new Response(JSON.stringify({
      success: true,
      uploadUrl: signedRequest.url,
      publicUrl,
      objectKey,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error generating R2 presigned upload URL:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to generate upload URL' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
