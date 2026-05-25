-- Cấp quyền rõ ràng cho tất cả các bảng tính năng
GRANT ALL ON mood_entries TO authenticated;
GRANT ALL ON food_places TO authenticated;
GRANT ALL ON schedules TO authenticated;
GRANT ALL ON love_notes TO authenticated;
GRANT ALL ON memories TO authenticated;

-- Tạo lại các rule RLS bằng DO block một cách rõ ràng và gắn TO authenticated
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN SELECT unnest(ARRAY['mood_entries', 'food_places', 'schedules', 'love_notes', 'memories']) LOOP
    -- Drop các policy cũ
    EXECUTE format('DROP POLICY IF EXISTS "Users can view data in their space" ON %I;', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert data in their space" ON %I;', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update data in their space" ON %I;', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete data in their space" ON %I;', table_name);
    
    -- Tạo policy mới rất rộng mở nhưng vẫn an toàn
    EXECUTE format('
      CREATE POLICY "Users can view data in their space" 
      ON %I FOR SELECT 
      TO authenticated 
      USING (care_space_id = get_user_care_space_id(auth.uid()));
      
      CREATE POLICY "Users can insert data in their space" 
      ON %I FOR INSERT 
      TO authenticated 
      WITH CHECK (care_space_id = get_user_care_space_id(auth.uid()));
      
      CREATE POLICY "Users can update data in their space" 
      ON %I FOR UPDATE 
      TO authenticated 
      USING (care_space_id = get_user_care_space_id(auth.uid()));
      
      CREATE POLICY "Users can delete data in their space" 
      ON %I FOR DELETE 
      TO authenticated 
      USING (care_space_id = get_user_care_space_id(auth.uid()));
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END $$;
