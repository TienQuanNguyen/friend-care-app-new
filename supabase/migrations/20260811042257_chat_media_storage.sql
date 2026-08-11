-- Migration: chat_media_storage
-- Phase 2: Chat UI — Supabase Storage bucket for chat media
-- ============================================================

-- Create the chat-media bucket (30 MB limit, images + videos only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  31457280,  -- 30 MB
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png',
    'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload
CREATE POLICY IF NOT EXISTS "Authenticated users can upload chat media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-media');

-- RLS: authenticated users can read
CREATE POLICY IF NOT EXISTS "Authenticated users can read chat media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-media');

-- RLS: users can delete their own uploads
--   Files are stored under {user_id}/{filename}, so foldername[1] = user_id
CREATE POLICY IF NOT EXISTS "Users can delete their own chat media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
