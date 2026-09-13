-- Storage buckets were never created in SQL on the original project (Lovable UI).
-- Policies already exist; this project needs the actual buckets.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('player-photos', 'player-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('media', 'media', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;
