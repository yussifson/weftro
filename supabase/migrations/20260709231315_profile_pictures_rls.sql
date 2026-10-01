-- Enable RLS for storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to view all profile pictures
CREATE POLICY "Public Profile Pictures View"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'profile-pictures');

-- Policy to allow authenticated users to insert their own profile pictures
CREATE POLICY "Users can upload profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-pictures' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy to allow authenticated users to update their own profile pictures
CREATE POLICY "Users can update profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-pictures' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy to allow authenticated users to delete their own profile pictures
CREATE POLICY "Users can delete profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-pictures' AND (storage.foldername(name))[1] = auth.uid()::text);
