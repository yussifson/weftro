// src/lib/clipadWebhookService.js
// Phase 7: Connect Layer - Outbound Webhooks Foundation

import { supabase } from '@/api/supabaseClient';
import { isV3FeatureEnabled, V3_FLAGS } from './clipadV3Flags';

/**
 * Registers a new webhook endpoint.
 */
export async function registerWebhook(userId, companyId, { endpointUrl, events, secret }) {
  if (!userId || !companyId) throw new Error('Unauthorized');
  
  const { data, error } = await supabase
    .from('clipad_v3_webhooks')
    .insert([{
      company_id: companyId,
      created_by: userId,
      endpoint_url: endpointUrl,
      secret: secret || crypto.randomUUID(), // In prod, hash/encrypt at rest if sensitive
      events: events || ['*']
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Gets all webhooks for a company
 */
export async function getWebhooks(companyId) {
  const { data, error } = await supabase
    .from('clipad_v3_webhooks')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Deletes a webhook
 */
export async function deleteWebhook(id) {
  const { error } = await supabase
    .from('clipad_v3_webhooks')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * Foundation for the Outbound Event Dispatcher.
 * In a real production environment, this runs on an Edge Function 
 * triggered by PostgreSQL Database Webhooks or pg_cron, ensuring reliable delivery.
 * Here we define the architectural signature.
 */
export async function dispatchWebhookEvent(user, eventName, payload) {
  if (!isV3FeatureEnabled(V3_FLAGS.WEBHOOKS_ENABLED, user)) {
    return false; // Silently drop if disabled
  }

  const companyId = user.company_id || user.user_metadata?.company_id;
  if (!companyId) return false;

  // 1. Fetch active webhooks subscribed to this event
  const { data: webhooks, error } = await supabase
    .from('clipad_v3_webhooks')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .contains('events', [eventName]); 
    // In postgres, you'd handle wildcard subscriptions as well.

  if (error || !webhooks || webhooks.length === 0) return false;

  // 2. Dispatch (Simulated via fetch for frontend foundation)
  // Real implementation requires retry queue, timeout, signature generation
  const dispatchPromises = webhooks.map(async (wh) => {
    try {
      const signature = await generateSignature(payload, wh.secret);
      
      // We do NOT block the main thread waiting for external webhooks.
      fetch(wh.endpoint_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Clipad-Signature': signature,
          'X-Clipad-Event': eventName
        },
        body: JSON.stringify({
          event: eventName,
          timestamp: new Date().toISOString(),
          data: payload
        })
      }).catch(err => {
        // Record failure to delivery tracking table (clipad_v3_webhook_deliveries)
        console.warn(\`[Webhook Delivery Failed] \${wh.endpoint_url}: \`, err);
      });
      return true;
    } catch (e) {
      return false;
    }
  });

  await Promise.allSettled(dispatchPromises);
  return true;
}

async function generateSignature(payload, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(JSON.stringify(payload))
  );
  
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
