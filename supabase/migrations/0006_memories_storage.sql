-- Create a public bucket for memories
INSERT INTO storage.buckets (id, name, public)
VALUES ('memories', 'memories', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for the memories bucket
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public to read objects in memories
CREATE POLICY "Public Access to memories"
ON storage.objects FOR SELECT
USING ( bucket_id = 'memories' );

-- Allow authenticated users to insert objects to memories
CREATE POLICY "Auth Users can insert memories"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'memories' );

-- Allow users to update their own objects
CREATE POLICY "Users can update their own memories"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'memories' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'memories' AND auth.uid() = owner );

-- Allow users to delete their own objects
CREATE POLICY "Users can delete their own memories"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'memories' AND auth.uid() = owner );
