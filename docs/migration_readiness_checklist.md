# Weftro V3 — Staging & Production Security Migration Checklist
**Document Reference**: `WEFTRO-V3-MIGRATION-RUNBOOK`  
**Target Environment**: Staging First -> Production Authorized  
**Prepared Migrations**:
1. `supabase/migrations/20261024210000_secure_meeting_termination_and_realtime.sql` (Phase 1.1)
2. `supabase/migrations/20261025140000_secure_video_rooms_tenant_isolation.sql` (Phase 4)

---

## 1. Preflight Verification Checklist

Before applying any migration to the staging database:

- [x] **Repository State Clean**: Verify current Git branch is `main` and working tree has no uncommitted stray edits.
- [x] **Schema Dependencies Verified**:
  - `public.video_rooms` table exists with primary key `id` (UUID) and `daily_room_name` (TEXT).
  - `public.profiles` has `company_id` and helper function `public.get_auth_company_id()` exists.
  - `public.clipad_spaces` exists with foreign key compatibility.
- [x] **Function Security & search_path**:
  - `public.terminate_meeting(TEXT, UUID)` is declared `SECURITY DEFINER` with fixed `SET search_path = public, auth`.
  - `public.verify_meeting_access(TEXT)` is declared `SECURITY DEFINER` with fixed `SET search_path = public, auth`.
  - Grants: Only `EXECUTE` granted to authenticated/anon roles as intended; write privileges to underlying tables remain protected by RLS.

---

## 2. Migration Execution Order

### Step 1: Phase 1.1 Meeting Termination & Realtime
**File**: `supabase/migrations/20261024210000_secure_meeting_termination_and_realtime.sql`
- **Actions**:
  1. Conditionally adds `public.video_rooms` to publication `supabase_realtime` if not already present.
  2. Drops legacy loose update policies on `video_rooms` and creates `"Only host can update video rooms"` (`USING (auth.uid() = host_id)`).
  3. Creates `public.terminate_meeting(p_room_name, p_space_id)` RPC with caller identity verification and atomic status update.
- **Rollback SQL**:
  ```sql
  DROP FUNCTION IF EXISTS public.terminate_meeting(TEXT, UUID);
  DROP POLICY IF EXISTS "Only host can update video rooms" ON public.video_rooms;
  -- If needed, restore earlier update policy:
  CREATE POLICY "Users can update video rooms" ON public.video_rooms FOR UPDATE USING (auth.uid() = host_id);
  ```

### Step 2: Phase 4 Tenant Isolation & Privacy Enforcement
**File**: `supabase/migrations/20261025140000_secure_video_rooms_tenant_isolation.sql`
- **Actions**:
  1. Adds `privacy_type` and `space_id` columns and indexes if missing.
  2. Drops permissive anon `SELECT` policy (`"Anyone can view video rooms by id"`).
  3. Establishes `"Tenant isolation for video_rooms select"` to allow public guest joins for public standalone meetings while strictly isolating company-owned rooms.
  4. Establishes `"Tenant isolation for video_rooms insert"` to prevent foreign tenant injection.
  5. Creates `public.verify_meeting_access(p_room_name)` helper RPC.
- **Rollback SQL**:
  ```sql
  DROP FUNCTION IF EXISTS public.verify_meeting_access(TEXT);
  DROP POLICY IF EXISTS "Tenant isolation for video_rooms select" ON public.video_rooms;
  DROP POLICY IF EXISTS "Tenant isolation for video_rooms insert" ON public.video_rooms;
  -- Restore guest read access policy:
  CREATE POLICY "Anyone can view video rooms by id" ON public.video_rooms FOR SELECT USING (true);
  ```

---

## 3. Staging Post-Deployment Validation Tests

Execute the automated test suites against staging Supabase credentials:
```bash
node tests/phase1_1_behavioral_security.test.cjs
node tests/phase4_security_tenant_validation.test.cjs
node tests/phase6_e2e_meeting_lifecycle.test.cjs
```
Verify:
1. Host can create room and terminate meeting.
2. Guest cannot end meeting (RPC raises `42501 Unauthorized`).
3. User in Company A cannot query video_rooms records belonging to Company B.
4. Anonymous guest can join public room without encountering authentication blocks.
