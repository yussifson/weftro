-- ══════════════════════════════════════════════════════════════════════════════
-- WEFTRO V3 — PHASE 5 REMEDIATION: CONTEXT SESSION OWNERSHIP PROTECTION
-- Non-Destructive Extension for Context Session Row Level Security
-- Migration: 20261021000000_clipad_v3_phase5_context_session_security.sql
-- ══════════════════════════════════════════════════════════════════════════════

-- Purpose:
-- Enforce immutable owner (user_id) and tenant (company_id) invariants on UPDATE.
-- Under PostgreSQL RLS semantics, an UPDATE policy with only a USING clause permits
-- the row owner to update columns to foreign values unless a WITH CHECK clause is present.
-- This migration updates the UPDATE policy on clipad_v3_context_sessions with an explicit
-- WITH CHECK clause guaranteeing that:
-- 1. user_id cannot be changed to another user during an UPDATE.
-- 2. company_id cannot be transferred across tenants during an UPDATE.
-- 3. The caller's company matches the session company.

ALTER TABLE public.clipad_v3_context_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update their own context sessions"
    ON public.clipad_v3_context_sessions;

CREATE POLICY "Users can update their own context sessions"
    ON public.clipad_v3_context_sessions FOR UPDATE
    USING (
      auth.uid() = user_id
      AND company_id::text IN (
        SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
      )
    )
    WITH CHECK (
      auth.uid() = user_id
      AND company_id::text IN (
        SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
      )
    );
