// src/lib/clipadCaptureQueueService.js
// Clipad V3 Durable Capture Job Queue Service
// Dispatches captures to the server-side durable queue and interacts with the worker.

import { supabase } from '@/api/supabaseClient';

export const QUEUE_STATUS = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DEAD_LETTER: 'dead_letter'
};

/**
 * Enqueue a persisted capture for server-side processing.
 * Idempotent: If a job already exists for this capture_id, updates status to queued.
 */
export async function enqueueCaptureForProcessing({
  companyId,
  userId,
  captureId,
  payload = {}
}) {
  if (!companyId || !userId || !captureId) {
    throw new Error('companyId, userId, and captureId are required to enqueue a capture.');
  }

  // 1. Insert into durable queue (idempotent on capture_id)
  const { data: queueJob, error: queueError } = await supabase
    .from('clipad_v3_capture_queue')
    .upsert({
      company_id: companyId,
      user_id: userId,
      capture_id: captureId,
      status: QUEUE_STATUS.QUEUED,
      scheduled_at: new Date().toISOString(),
      payload,
      updated_at: new Date().toISOString()
    }, { onConflict: 'capture_id' })
    .select('*')
    .single();

  if (queueError) {
    console.error('[clipadCaptureQueueService.enqueueCaptureForProcessing] Enqueue error:', queueError);
    throw new Error(`Failed to enqueue capture: ${queueError.message}`);
  }

  // 2. Update the parent capture status to QUEUED
  await supabase
    .from('clipad_v3_captures')
    .update({ 
      status: 'QUEUED',
      updated_at: new Date().toISOString() 
    })
    .eq('id', captureId)
    .catch(err => console.warn('[clipadCaptureQueueService] Parent status update warning:', err));

  // 3. Dispatch an asynchronous non-blocking invocation to the server worker
  // If the Edge function invocation fails or network drops, the job remains safely 'queued' in PostgreSQL
  // and will be picked up by the scheduled background poll or next worker run.
  dispatchWorkerExecution(captureId).catch(err => {
    console.info('[clipadCaptureQueueService] Worker async trigger dispatched in background:', err.message);
  });

  return queueJob;
}

/**
 * Non-blocking dispatcher to the process-capture Edge Function.
 */
export async function dispatchWorkerExecution(captureId = null) {
  try {
    const { data, error } = await supabase.functions.invoke('process-capture', {
      body: captureId ? { capture_id: captureId } : {}
    });

    if (error) {
      console.warn('[clipadCaptureQueueService] Worker invocation notice:', error.message);
      return { status: 'dispatched_with_notice', error: error.message };
    }
    return data;
  } catch (err) {
    // Non-fatal: durable DB queue holds the job for worker processing
    console.warn('[clipadCaptureQueueService] Async dispatch offline, job remains queued in database:', err.message);
    return { status: 'queued_in_db' };
  }
}

/**
 * Retrieve current queue job status for a given capture.
 */
export async function getCaptureQueueStatus(captureId) {
  const { data, error } = await supabase
    .from('clipad_v3_capture_queue')
    .select('*')
    .eq('capture_id', captureId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is record not found
    console.error('[clipadCaptureQueueService.getCaptureQueueStatus] Error:', error);
    throw error;
  }

  return data;
}

/**
 * Retry a failed or dead-letter capture job.
 */
export async function retryCaptureJob(captureId) {
  const { data, error } = await supabase
    .from('clipad_v3_capture_queue')
    .update({
      status: QUEUE_STATUS.QUEUED,
      scheduled_at: new Date().toISOString(),
      last_error_message: null,
      last_error_stack: null,
      updated_at: new Date().toISOString()
    })
    .eq('capture_id', captureId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to retry capture job: ${error.message}`);
  }

  await supabase
    .from('clipad_v3_captures')
    .update({ status: 'QUEUED', updated_at: new Date().toISOString() })
    .eq('id', captureId);

  dispatchWorkerExecution(captureId).catch(() => {});

  return data;
}
