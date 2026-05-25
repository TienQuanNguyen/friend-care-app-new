-- Tạo một hàm có đặc quyền bỏ qua RLS (SECURITY DEFINER)
-- Hàm này chỉ trả về đúng 1 không gian nếu mã mời khớp, 
-- giúp người dùng mới có thể tìm thấy không gian trước khi chính thức tham gia.

CREATE OR REPLACE FUNCTION get_space_by_invite_code(code_param TEXT)
RETURNS SETOF care_spaces
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM care_spaces WHERE invite_code = code_param LIMIT 1;
$$;

-- Đảm bảo user đăng nhập có quyền thực thi hàm này
GRANT EXECUTE ON FUNCTION get_space_by_invite_code(TEXT) TO authenticated;
