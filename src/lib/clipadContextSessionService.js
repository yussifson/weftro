// src/lib/clipadContextSessionService.js
import { supabase } from '@/api/supabaseClient';

export const CONTEXT_SESSION_STATUS = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED'
};

/**
 * Creates a new context session
 */
export async function createContextSession({
  companyId,
  userId,
  title,
  description = null,
  metadata = {},
  permissions = {},
  status = CONTEXT_SESSION_STATUS.ACTIVE,
  startedAt = new Date().toISOString()
}) {
  if (!companyId || !userId || !title) {
    throw new Error('companyId, userId, and title are required.');
  }

  const { data, error } = await supabase
    .from('clipad_v3_context_sessions')
    .insert([{
      company_id: companyId,
      user_id: userId,
      title,
      description,
      metadata,
      permissions,
      status,
      started_at: startedAt
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates a context session
 */
export async function updateContextSession(id, updates) {
  const { data, error } = await supabase
    .from('clipad_v3_context_sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Retrieves a context session
 */
export async function getContextSession(id) {
  const { data, error } = await supabase
    .from('clipad_v3_context_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Pauses an active context session
 */
export async function pauseContextSession(id) {
  return updateContextSession(id, { 
    status: CONTEXT_SESSION_STATUS.PAUSED,
    metadata: { paused_at: new Date().toISOString() }
  });
}

/**
 * Resumes a paused context session
 */
export async function resumeContextSession(id) {
  return updateContextSession(id, { 
    status: CONTEXT_SESSION_STATUS.ACTIVE,
    metadata: { resumed_at: new Date().toISOString() }
  });
}

/**
 * Completes a context session
 */
export async function completeContextSession(id) {
  return updateContextSession(id, { 
    status: CONTEXT_SESSION_STATUS.COMPLETED,
    ended_at: new Date().toISOString()
  });
}

/**
 * Archives a context session
 */
export async function archiveContextSession(id) {
  return updateContextSession(id, { status: CONTEXT_SESSION_STATUS.ARCHIVED });
}

/**
 * Append audit event record to session metadata
 */
export async function appendSessionAudit(id, eventType, details = {}) {
  const current = await getContextSession(id);
  const existingAudit = current?.metadata?.audit_trail || [];
  const updatedAudit = [
    ...existingAudit,
    {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      details
    }
  ];
  return updateContextSession(id, {
    metadata: {
      ...(current?.metadata || {}),
      audit_trail: updatedAudit
    }
  });
}

/**
 * Gets context sessions for a user
 */
export async function getUserContextSessions(userId, companyId) {
  const { data, error } = await supabase
    .from('clipad_v3_context_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
