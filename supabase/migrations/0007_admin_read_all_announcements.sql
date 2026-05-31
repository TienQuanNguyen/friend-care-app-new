-- Allow admin to read all announcements (both active and inactive)
-- This is necessary so that UPDATE operations (which set is_active = false) do not fail RLS
CREATE POLICY "Admin can read all announcements"
ON app_announcements
FOR SELECT
TO authenticated
USING (
  lower(auth.jwt() ->> 'email') = 'tienquan0807@gmail.com'
);
