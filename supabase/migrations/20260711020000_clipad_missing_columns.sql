-- Add missing columns to clipad_meeting_records
ALTER TABLE public.clipad_meeting_records ADD COLUMN IF NOT EXISTS meeting_link TEXT;
ALTER TABLE public.clipad_meeting_records ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE public.clipad_meeting_records ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add missing columns to clipad_videos
ALTER TABLE public.clipad_videos ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.clipad_videos ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'clipad_videos', 'clipad_videos', true, 524288000, '{video/webm, video/mp4, video/x-matroska, audio/webm}'
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'clipad_videos'
);

-- Policies for storage bucket (using DO block to handle "already exists" errors gracefully)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'clipad_videos');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Upload' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'clipad_videos' AND auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users Update Own Objects' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Users Update Own Objects" ON storage.objects FOR UPDATE USING (bucket_id = 'clipad_videos' AND auth.uid() = owner);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users Delete Own Objects' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Users Delete Own Objects" ON storage.objects FOR DELETE USING (bucket_id = 'clipad_videos' AND auth.uid() = owner);
    END IF;
END
$$;
