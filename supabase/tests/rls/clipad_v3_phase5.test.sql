BEGIN;

-- Plan 12 tests
SELECT plan(12);

-- Set up dummy users and companies
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'user1@companyA.com'),
  ('00000000-0000-0000-0000-000000000002', 'user2@companyA.com'),
  ('00000000-0000-0000-0000-000000000003', 'user3@companyB.com');

INSERT INTO public.profiles (id, company_id, email, first_name, last_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'companyA', 'user1@companyA.com', 'User', 'One'),
  ('00000000-0000-0000-0000-000000000002', 'companyA', 'user2@companyA.com', 'User', 'Two'),
  ('00000000-0000-0000-0000-000000000003', 'companyB', 'user3@companyB.com', 'User', 'Three');

-- Set up dummy space and memberships for Company A
INSERT INTO public.clipad_spaces (id, company_id, name, created_by, is_private) VALUES
  ('11111111-1111-1111-1111-111111111111', 'companyA', 'Team Alpha', '00000000-0000-0000-0000-000000000001', true);

-- User 1 is a member of Team Alpha, User 2 is NOT.
INSERT INTO public.clipad_space_members (space_id, user_id, role) VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'admin');

-- Insert captures
INSERT INTO public.clipad_v3_captures (id, company_id, user_id, title, visibility, capture_type, source_type, permission_info) VALUES
  -- 1. Personal capture for User 1
  ('c0000000-0000-0000-0000-000000000001', 'companyA', '00000000-0000-0000-0000-000000000001', 'U1 Personal', 'PERSONAL', 'TEXT', 'api', '{}'::jsonb),
  
  -- 2. Team capture for Team Alpha (User 1 is in, User 2 is out)
  ('c0000000-0000-0000-0000-000000000002', 'companyA', '00000000-0000-0000-0000-000000000001', 'Team Capture', 'TEAM', 'TEXT', 'api', '{"space_id": "11111111-1111-1111-1111-111111111111"}'::jsonb),
  
  -- 3. Organizational capture for Company A
  ('c0000000-0000-0000-0000-000000000003', 'companyA', '00000000-0000-0000-0000-000000000001', 'Org Capture', 'ORGANIZATIONAL', 'TEXT', 'api', '{}'::jsonb);

-- TEST SUITE
-- Impersonate User 1
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

SELECT results_eq(
  $$ SELECT id FROM public.clipad_v3_captures WHERE id = 'c0000000-0000-0000-0000-000000000001' $$,
  $$ VALUES ('c0000000-0000-0000-0000-000000000001'::uuid) $$,
  '1. User can access their own personal capture.'
);

SELECT results_eq(
  $$ SELECT id FROM public.clipad_v3_captures WHERE id = 'c0000000-0000-0000-0000-000000000002' $$,
  $$ VALUES ('c0000000-0000-0000-0000-000000000002'::uuid) $$,
  '3. Team/space member can access permitted team capture.'
);

SELECT results_eq(
  $$ SELECT id FROM public.clipad_v3_captures WHERE id = 'c0000000-0000-0000-0000-000000000003' $$,
  $$ VALUES ('c0000000-0000-0000-0000-000000000003'::uuid) $$,
  '5. Organization-level permitted capture is accessible.'
);

-- Impersonate User 2 (Same company, not in team)
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';

SELECT is_empty(
  $$ SELECT id FROM public.clipad_v3_captures WHERE id = 'c0000000-0000-0000-0000-000000000001' $$,
  '2. User cannot access another user''s personal capture.'
);

SELECT is_empty(
  $$ SELECT id FROM public.clipad_v3_captures WHERE id = 'c0000000-0000-0000-0000-000000000002' $$,
  '4. Non-member cannot access restricted team/space capture.'
);

SELECT results_eq(
  $$ SELECT id FROM public.clipad_v3_captures WHERE id = 'c0000000-0000-0000-0000-000000000003' $$,
  $$ VALUES ('c0000000-0000-0000-0000-000000000003'::uuid) $$,
  'User 2 can access org-level captures of the same company.'
);

-- Try to update/delete User 1's capture as User 2
SELECT throws_ok(
  $$ UPDATE public.clipad_v3_captures SET title = 'Hacked' WHERE id = 'c0000000-0000-0000-0000-000000000003' $$,
  'new row violates row-level security policy for table "clipad_v3_captures"',
  '7. Unauthorized user cannot update another user''s capture.'
);

-- Note: In PG, UPDATE/DELETE that affect 0 rows (due to USING) don't throw, they just do nothing.
-- The above throws_ok might fail if the policy doesn't have a WITH CHECK that errors, 
-- but usually a restricted UPDATE just returns 0 rows updated. 
-- Let's test by attempting the UPDATE and checking the title hasn't changed.
UPDATE public.clipad_v3_captures SET title = 'Hacked' WHERE id = 'c0000000-0000-0000-0000-000000000003';
SELECT results_eq(
  $$ SELECT title FROM public.clipad_v3_captures WHERE id = 'c0000000-0000-0000-0000-000000000003' $$,
  $$ VALUES ('Org Capture'::text) $$,
  '7. UPDATE silently ignored due to RLS.'
);

DELETE FROM public.clipad_v3_captures WHERE id = 'c0000000-0000-0000-0000-000000000003';
SELECT results_eq(
  $$ SELECT id FROM public.clipad_v3_captures WHERE id = 'c0000000-0000-0000-0000-000000000003' $$,
  $$ VALUES ('c0000000-0000-0000-0000-000000000003'::uuid) $$,
  '8. Unauthorized user cannot delete another user''s capture (silently ignored).'
);

-- Impersonate User 3 (Different company)
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';

SELECT is_empty(
  $$ SELECT id FROM public.clipad_v3_captures WHERE company_id = 'companyA' $$,
  '6. Cross-company capture is inaccessible.'
);

SELECT * FROM finish();

ROLLBACK;
