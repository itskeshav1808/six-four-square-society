
CREATE POLICY "Media public read" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Media admin insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND public.is_admin(auth.uid()));
CREATE POLICY "Media admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND public.is_admin(auth.uid()));
CREATE POLICY "Media admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND public.is_admin(auth.uid()));
