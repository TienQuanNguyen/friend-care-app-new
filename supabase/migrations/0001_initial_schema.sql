-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: care_spaces
CREATE TABLE care_spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  care_space_id UUID REFERENCES care_spaces(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table: mood_entries
CREATE TABLE mood_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_space_id UUID REFERENCES care_spaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  mood TEXT NOT NULL,
  energy_level INTEGER NOT NULL CHECK (energy_level BETWEEN 1 AND 10),
  note TEXT,
  gratitude TEXT,
  ai_advice TEXT,
  entry_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: food_places
CREATE TABLE food_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_space_id UUID REFERENCES care_spaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  food_name TEXT NOT NULL,
  restaurant_name TEXT,
  address TEXT,
  district TEXT,
  category TEXT,
  cuisine_type TEXT,
  priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 5),
  status TEXT NOT NULL,
  note TEXT,
  image_url TEXT,
  image_source TEXT,
  tried BOOLEAN DEFAULT FALSE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  location_note TEXT,
  google_maps_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: schedules
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_space_id UUID REFERENCES care_spaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  assigned_to TEXT NOT NULL,
  status TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  color_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: love_notes
CREATE TABLE love_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_space_id UUID REFERENCES care_spaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: memories
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_space_id UUID REFERENCES care_spaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  memory_date DATE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE care_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE love_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's care_space_id
CREATE OR REPLACE FUNCTION get_user_care_space_id(user_uid UUID)
RETURNS UUID AS $$
  SELECT care_space_id FROM profiles WHERE user_id = user_uid LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Users can view profiles in their space"
  ON profiles FOR SELECT
  USING (
    user_id = auth.uid() OR
    care_space_id = get_user_care_space_id(auth.uid())
  );

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Care Spaces Policies
CREATE POLICY "Users can view their own care space"
  ON care_spaces FOR SELECT
  USING (
    created_by = auth.uid() OR 
    id = get_user_care_space_id(auth.uid())
  );

CREATE POLICY "Users can create a care space"
  ON care_spaces FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Space admin can update care space"
  ON care_spaces FOR UPDATE
  USING (
    id = get_user_care_space_id(auth.uid()) AND
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  );

-- Shared Data Policies (Moods, Foods, Schedules, Notes, Memories)
-- Using a DO block to generate policies for all shared tables to avoid repetition
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN SELECT unnest(ARRAY['mood_entries', 'food_places', 'schedules', 'love_notes', 'memories']) LOOP
    EXECUTE format('
      CREATE POLICY "Users can view data in their space" ON %I FOR SELECT USING (care_space_id = get_user_care_space_id(auth.uid()));
      CREATE POLICY "Users can insert data in their space" ON %I FOR INSERT WITH CHECK (care_space_id = get_user_care_space_id(auth.uid()) AND created_by = auth.uid());
      CREATE POLICY "Users can update data in their space" ON %I FOR UPDATE USING (care_space_id = get_user_care_space_id(auth.uid()));
      CREATE POLICY "Users can delete data in their space" ON %I FOR DELETE USING (care_space_id = get_user_care_space_id(auth.uid()));
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END $$;
