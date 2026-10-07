// src/lib/clipadBrowserCaptureService.js
// Phase 6: Browser Capture Architecture API Boundary

import { supabase } from '@/api/supabaseClient';
import { createCapture, CAPTURE_VISIBILITY } from './clipadCaptureService';
import { contextualizeCapture } from './clipadContextualizationService';
import { isV3FeatureEnabled, V3_FLAGS } from './clipadV3Flags';

/**
 * Get or initialize user capture settings.
 */
export async function getUserCaptureSettings(userId, companyId) {
  if (!userId || !companyId) throw new Error('User ID and Company ID required');

  const { data, error } = await supabase
    .from('clipad_v3_capture_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // Doesn't exist, create default
    const defaultSettings = {
      user_id: userId,
      company_id: companyId,
      is_capture_enabled: true,
      excluded_domains: []
    };
    const { data: newData, error: insertErr } = await supabase
      .from('clipad_v3_capture_settings')
      .insert([defaultSettings])
      .select()
      .single();
      
    if (insertErr) throw insertErr;
    return newData;
  }

  if (error) throw error;
  return data;
}

/**
 * Update capture settings (e.g., toggle on/off, add excluded domains)
 */
export async function updateUserCaptureSettings(userId, updates) {
  const { data, error } = await supabase
    .from('clipad_v3_capture_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Ingest a capture from the browser extension.
 * Rejects if disabled globally, if the user has disabled capture, or if domain is excluded.
 */
export async function ingestBrowserCapture(user, payload) {
  const companyId = user?.user_metadata?.company_id || user?.company_id;
  
  if (!isV3FeatureEnabled(V3_FLAGS.BROWSER_CAPTURE_ENABLED, user)) {
    throw new Error('Browser capture is disabled globally.');
  }

  const {
    url,
    domain,
    pageTitle,
    selectedText,
    captureMode,
    extensionVersion,
    contextSessionId
  } = payload;

  if (!url || !domain) {
    throw new Error('URL and domain are required for browser capture.');
  }

  // 1. Enforce Privacy / Exclusions
  const settings = await getUserCaptureSettings(user.id, companyId);
  
  if (!settings.is_capture_enabled) {
    throw new Error('Capture is currently paused by the user.');
  }

  if (settings.excluded_domains && settings.excluded_domains.includes(domain.toLowerCase())) {
    throw new Error(`Domain ${domain} is excluded from capture.`);
  }

  // 2. Format content for optimal AI extraction
  const content = [
    `Page Title: ${pageTitle || 'Unknown'}`,
    `URL: ${url}`,
    selectedText ? `\nSelected Content:\n${selectedText}` : ''
  ].join('\n').trim();

  // 3. Delegate to existing Capture Service
  const capture = await createCapture({
    companyId,
    userId: user.id,
    contextSessionId,
    sourceType: 'browser_extension',
    sourceId: `ext_${Date.now()}`,
    captureType: 'LINK',
    title: pageTitle || domain,
    content: content,
    visibility: CAPTURE_VISIBILITY.PERSONAL, // Browser captures default to personal for privacy
    metadata: {
      url,
      domain,
      capture_mode: captureMode || 'manual',
      extension_version: extensionVersion || '1.0.0',
      client: 'browser'
    }
  });

  // 4. Trigger contextualization asynchronously (non-blocking)
  contextualizeCapture(capture.id).catch(err => {
    console.error('Background contextualization failed for browser capture:', err);
  });

  return capture;
}
