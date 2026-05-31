-- =============================================
-- Admin Announcements table + RLS policies
-- =============================================

CREATE TABLE IF NOT EXISTS app_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  message text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_announcements ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to allow re-running the migration safely
DROP POLICY IF EXISTS "Users can read active announcements" ON app_announcements;
DROP POLICY IF EXISTS "Admin can insert announcements" ON app_announcements;
DROP POLICY IF EXISTS "Admin can update announcements" ON app_announcements;
DROP POLICY IF EXISTS "Admin can delete announcements" ON app_announcements;

-- All authenticated users can read active announcements
CREATE POLICY "Users can read active announcements"
ON app_announcements
FOR SELECT
TO authenticated
USING (is_active = true);

-- Admin can insert announcements
CREATE POLICY "Admin can insert announcements"
ON app_announcements
FOR INSERT
TO authenticated
WITH CHECK (
  lower(auth.jwt() ->> 'email') = 'tienquan0807@gmail.com'
);

-- Admin can update announcements
CREATE POLICY "Admin can update announcements"
ON app_announcements
FOR UPDATE
TO authenticated
USING (
  lower(auth.jwt() ->> 'email') = 'tienquan0807@gmail.com'
)
WITH CHECK (
  lower(auth.jwt() ->> 'email') = 'tienquan0807@gmail.com'
);

-- Admin can delete announcements
CREATE POLICY "Admin can delete announcements"
ON app_announcements
FOR DELETE
TO authenticated
USING (
  lower(auth.jwt() ->> 'email') = 'tienquan0807@gmail.com'
);

-- Grant privileges to authenticated, anon, and service_role roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_announcements TO authenticated, anon, service_role;

