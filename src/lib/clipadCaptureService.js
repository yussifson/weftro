// src/lib/clipadCaptureService.js
import { supabase } from '@/api/supabaseClient';

export const CAPTURE_STATUS = {
  CREATED: 'CREATED',
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED',
  CLASSIFIED: 'CLASSIFIED',
  CONTEXTUALIZED: 'CONTEXTUALIZED',
  INGESTED: 'INGESTED',
  FAILED: 'FAILED',
  DISMISSED: 'DISMISSED',
  ARCHIVED: 'ARCHIVED'
};

export const CAPTURE_VISIBILITY = {
  PERSONAL: 'PERSONAL',
  TEAM: 'TEAM',
  ORGANIZATIONAL: 'ORGANIZATIONAL'
};

/**
 * Creates a new capture
 */
export async function createCapture({
  companyId,
  userId,
  contextSessionId = null,
  sourceType,
  sourceId = null,
  captureType,
  title = null,
  content = null,
  contentType = 'text/plain',
  metadata = {},
  provenance = {},
  permissionInfo = {},
  visibility = CAPTURE_VISIBILITY.PERSONAL,
  status = CAPTURE_STATUS.CREATED
}) {
  if (!companyId || !userId || !sourceType || !captureType) {
    throw new Error('companyId, userId, sourceType, and captureType are required.');
  }

  // Force scope restriction for private sources
  let effectiveVisibility = visibility;
  if (permissionInfo?.is_private) {
    effectiveVisibility = CAPTURE_VISIBILITY.PERSONAL;
  }

  const { data, error } = await supabase
    .from('clipad_v3_captures')
    .insert([{
      company_id: companyId,
      user_id: userId,
      context_session_id: contextSessionId,
      source_type: sourceType,
      source_id: sourceId,
      capture_type: captureType,
      title,
      content,
      content_type: contentType,
      metadata,
      provenance: {
        ...provenance,
        captured_by: userId,
        source_type: sourceType,
        source_id: sourceId,
        capture_method: provenance.capture_method || 'api',
        original_metadata: provenance.original_metadata || {}
      },
      permission_info: permissionInfo,
      visibility: effectiveVisibility,
      status
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates a capture
 */
export async function updateCapture(id, updates) {
  const { data, error } = await supabase
    .from('clipad_v3_captures')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Retrieves a capture
 */
export async function getCapture(id) {
  const { data, error } = await supabase
    .from('clipad_v3_captures')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Archives a capture
 */
export async function archiveCapture(id) {
  return updateCapture(id, { status: CAPTURE_STATUS.ARCHIVED });
}

/**
 * Gets captures by session
 */
export async function getCapturesBySession(sessionId) {
  const { data, error } = await supabase
    .from('clipad_v3_captures')
    .select('*')
    .eq('context_session_id', sessionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
