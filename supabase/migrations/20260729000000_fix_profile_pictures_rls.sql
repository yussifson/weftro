-- Replace problematic profile-pictures RLS policies with ownership-based policies
DROP POLICY IF EXISTS "Users can upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete profile pictures" ON storage.objects;

CREATE POLICY "Users can upload profile pictures"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'profile-pictures' AND owner = auth.uid());

CREATE POLICY "Users can update profile pictures"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'profile-pictures' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'profile-pictures' AND owner = auth.uid());

CREATE POLICY "Users can delete profile pictures"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'profile-pictures' AND owner = auth.uid());
