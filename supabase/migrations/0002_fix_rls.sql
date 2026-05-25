-- 1. Ensure authenticated users have explicit permissions
GRANT ALL ON care_spaces TO authenticated;
GRANT ALL ON profiles TO authenticated;

-- 2. Drop existing policies on care_spaces to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own care space" ON care_spaces;
DROP POLICY IF EXISTS "Users can create a care space" ON care_spaces;
DROP POLICY IF EXISTS "Space admin can update care space" ON care_spaces;

-- 3. Create extremely robust policies for care_spaces
-- Allow any authenticated user to insert
CREATE POLICY "Users can create a care space" 
ON care_spaces FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow users to select if they created it OR if they have a profile in it
CREATE POLICY "Users can view their own care space" 
ON care_spaces FOR SELECT 
TO authenticated 
USING (
  created_by = auth.uid() OR 
  id = get_user_care_space_id(auth.uid())
);

-- Allow admin to update
CREATE POLICY "Space admin can update care space" 
ON care_spaces FOR UPDATE 
TO authenticated 
USING (
  created_by = auth.uid() OR 
  id = get_user_care_space_id(auth.uid())
);

-- 4. Drop and recreate profiles policies just in case
DROP POLICY IF EXISTS "Users can view profiles in their space" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view profiles in their space" 
ON profiles FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() OR 
  care_space_id = get_user_care_space_id(auth.uid())
);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());
