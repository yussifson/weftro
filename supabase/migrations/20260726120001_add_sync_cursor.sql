-- Migration: Add sync_cursor and sync_phase to clipad_integrations
-- sync_cursor: stores pagination position so timed-out syncs can resume
-- sync_phase: 'full' = initial backfill in progress, 'incremental' = ongoing delta syncs

alter table clipad_integrations
  add column if not exists sync_cursor jsonb default null,
  add column if not exists sync_phase text default 'full';

-- Index to quickly find integrations with pending cursors (interrupted syncs)
create index if not exists idx_clipad_integrations_sync_cursor
  on clipad_integrations ((sync_cursor is not null));

comment on column clipad_integrations.sync_cursor is
  'Stores pagination state (page tokens, offsets) so interrupted syncs can resume. NULL = no pending resume.';

comment on column clipad_integrations.sync_phase is
  'full = initial backfill not yet complete. incremental = only fetch new/changed items since last_synced_at.';
