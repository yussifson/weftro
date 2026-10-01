-- Create clipad_videos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('clipad_videos', 'clipad_videos', true, 524288000, '{video/webm, video/mp4, video/x-matroska, audio/webm}')
ON CONFLICT (id) DO NOTHING;

-- Set up basic public access policy
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'clipad_videos');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'clipad_videos' AND auth.role() = 'authenticated');
CREATE POLICY "Users Update Own Objects" ON storage.objects FOR UPDATE USING (bucket_id = 'clipad_videos' AND auth.uid() = owner);
CREATE POLICY "Users Delete Own Objects" ON storage.objects FOR DELETE USING (bucket_id = 'clipad_videos' AND auth.uid() = owner);
