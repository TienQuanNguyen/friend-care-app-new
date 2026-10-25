# Biệt danh chung trong chat

Header chat → nút ba chấm → chọn thành viên → đặt biệt danh → Lưu. Cả hai thấy cùng biệt danh. Xóa biệt danh hoặc lưu ô trống để dùng lại tên gốc.

- Tên gốc luôn hiện trong hộp tùy chỉnh; `profiles.display_name` không bị sửa.
- Biệt danh áp dụng ở header, tên người gửi, box reply, reply đang soạn, tin ghim và người đang nhập. Các màn hình khác và push notification vẫn dùng tên gốc.
- Tối đa 40 ký tự Unicode; hỗ trợ tiếng Việt/emoji, loại khoảng trắng thừa. Trạng thái lưu/lỗi được hiển thị rõ.
- Hộp thoại dùng native dialog để khóa focus bàn phím, đóng bằng Escape/nút đóng, khôi phục focus khi đóng. Rộng tối đa 448px, giới hạn chiều cao theo viewport, có cuộn nội dung.
- Dữ liệu lưu ở `public.chat_nicknames`, khóa chính `(care_space_id, target_user_id)`. RLS chỉ cho thành viên cùng space đọc/đặt biệt danh cho người thuộc space đó; không cho giả mạo người sửa.
- Reset dùng nickname rỗng (UPDATE) để đồng bộ Realtime ổn định. UI dùng Realtime và tải lại khi online/focus để phục hồi kết nối.

Migration `20261025021540_shared_chat_nicknames.sql` đã áp dụng qua CLI `db query --file` trên project `iovvklliosftzeyecpul`; thao tác này không tự ghi migration history. Không chạy lại file CREATE TABLE trên database đã áp dụng.

## Xác minh

```powershell
node --test scripts/chat-nicknames.test.mjs
npm.cmd run build
```

Kiểm thử live bằng `scripts/chat-nicknames-live-smoke.mjs` (CLI keys truyền qua stdin, không in keys) đã PASS: lưu/đọc/reset giữa hai tài khoản, Realtime thực tới tài khoản thứ hai, giữ nguyên tên gốc, chặn đọc/ghi từ bên ngoài, chặn target ngoài space, giả mạo editor, tên quá dài, truy cập anonymous. Dữ liệu và tài khoản test đã được dọn. Security advisors mức ERROR không phát hiện lỗi.

Frontend chưa push/deploy. Kiểm thử render component không thay thế xác nhận trực quan/điều khiển trên thiết bị thật.
