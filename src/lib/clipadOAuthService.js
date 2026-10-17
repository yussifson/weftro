// src/lib/clipadOAuthService.js
// Phase 7: Connect Layer - OAuth & Credentials Foundation

import { supabase } from '@/api/supabaseClient';

/**
 * Creates a new Developer Application / OAuth Client
 */
export async function createConnectApp(userId, companyId, { name, description, redirectUris }) {
  if (!userId || !companyId) throw new Error('Unauthorized');
  
  const clientId = `client_${crypto.randomUUID().replace(/-/g, '')}`;
  const clientSecret = `secret_${crypto.randomUUID().replace(/-/g, '')}`; 
  // In a real production system, NEVER store raw secrets. Hash them via an Edge Function/Backend.
  // For Phase 7 foundation, we simulate the secret hash locally to represent the architectural intent.
  const clientSecretHash = await simulateHash(clientSecret);

  const { data, error } = await supabase
    .from('clipad_v3_connect_apps')
    .insert([{
      company_id: companyId,
      created_by: userId,
      name,
      description,
      client_id: clientId,
      client_secret_hash: clientSecretHash,
      redirect_uris: redirectUris || []
    }])
    .select()
    .single();

  if (error) throw error;
  // Return the raw secret ONLY once during creation
  return { ...data, raw_secret: clientSecret };
}

/**
 * Grants an access token to an app (simulates the end of an OAuth flow or Personal Access Token)
 */
export async function grantAccessToken(userId, companyId, appId, scopes) {
  const rawToken = `cpd_${crypto.randomUUID().replace(/-/g, '')}`;
  const tokenHash = await simulateHash(rawToken);
  
  const { data, error } = await supabase
    .from('clipad_v3_connect_tokens')
    .insert([{
      app_id: appId,
      user_id: userId,
      company_id: companyId,
      token_hash: tokenHash,
      scopes: scopes || ['memory:read', 'context:read']
    }])
    .select()
    .single();

  if (error) throw error;
  return { ...data, access_token: rawToken };
}

/**
 * Validates a token and returns authorized context
 */
export async function validateToken(rawToken) {
  const tokenHash = await simulateHash(rawToken);
  
  const { data, error } = await supabase
    .from('clipad_v3_connect_tokens')
    .select('*, user:user_id ( id, email ), app:app_id ( id, name, client_id )')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .single();

  if (error || !data) {
    throw new Error('Invalid, expired, or revoked token');
  }

  return {
    user: { id: data.user_id, company_id: data.company_id },
    app: data.app,
    scopes: data.scopes
  };
}

/**
 * Revokes a token
 */
export async function revokeToken(tokenId) {
  const { data, error } = await supabase
    .from('clipad_v3_connect_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Rotates client secret for an existing app
 */
export async function rotateClientSecret(appId, companyId) {
  if (!appId || !companyId) throw new Error('Application ID and Company ID are required');
  const newSecret = `secret_${crypto.randomUUID().replace(/-/g, '')}`;
  const newHash = await simulateHash(newSecret);

  const { data, error } = await supabase
    .from('clipad_v3_connect_apps')
    .update({
      client_secret_hash: newHash,
      updated_at: new Date().toISOString()
    })
    .eq('id', appId)
    .eq('company_id', companyId)
    .select()
    .single();

  if (error) throw error;
  return { ...data, raw_secret: newSecret };
}

/**
 * Updates application properties (name, description, is_active, redirect_uris)
 */
export async function updateConnectApp(appId, companyId, updates) {
  if (!appId || !companyId) throw new Error('Application ID and Company ID are required');

  const { data, error } = await supabase
    .from('clipad_v3_connect_apps')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', appId)
    .eq('company_id', companyId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes an application
 */
export async function deleteConnectApp(appId, companyId) {
  if (!appId || !companyId) throw new Error('Application ID and Company ID are required');

  const { error } = await supabase
    .from('clipad_v3_connect_apps')
    .delete()
    .eq('id', appId)
    .eq('company_id', companyId);

  if (error) throw error;
  return { success: true, id: appId };
}

/**
 * Lists tokens for an application
 */
export async function listConnectTokens(appId, companyId) {
  let query = supabase
    .from('clipad_v3_connect_tokens')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (appId) {
    query = query.eq('app_id', appId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Minimal simulated hashing for architecture completeness.
// Do not use in prod without a Node.js crypto / bcrypt backend edge function.
async function simulateHash(secret) {
  const msgUint8 = new TextEncoder().encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
