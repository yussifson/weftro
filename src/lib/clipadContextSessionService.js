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
