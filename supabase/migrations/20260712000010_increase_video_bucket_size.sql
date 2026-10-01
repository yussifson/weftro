-- Migration: Increase video bucket size limit to 5GB
-- This ensures users on paid plans can record long videos without hitting the default 50MB/500MB limit.

UPDATE storage.buckets
SET file_size_limit = 5368709120
WHERE id = 'clipad_videos';
