-- =============================================
-- Create music_notes table
-- =============================================

CREATE TABLE IF NOT EXISTS public.music_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  care_space_id uuid NOT NULL REFERENCES public.care_spaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  artist text,
  spotify_url text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.music_notes ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to allow re-running the migration safely
DROP POLICY IF EXISTS "Users can view music notes in their care space" ON public.music_notes;
DROP POLICY IF EXISTS "Users can insert music notes in their care space" ON public.music_notes;
DROP POLICY IF EXISTS "Users can update their own music notes" ON public.music_notes;
DROP POLICY IF EXISTS "Users can delete their own music notes" ON public.music_notes;

-- Policies
CREATE POLICY "Users can view music notes in their care space" ON public.music_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.care_space_id = music_notes.care_space_id
    )
  );

CREATE POLICY "Users can insert music notes in their care space" ON public.music_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.care_space_id = music_notes.care_space_id
    )
  );

CREATE POLICY "Users can update their own music notes" ON public.music_notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own music notes" ON public.music_notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Grant privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_notes TO authenticated, anon, service_role;
