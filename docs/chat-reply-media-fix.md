# Chat: trích dẫn reply và gửi ảnh

## Nguyên nhân đã xác minh

- Quan hệ tự nối `reply_to:chat_messages!reply_to_id` trả về mảng rỗng ở API thật, nhưng UI coi là một object tin nhắn gốc. Nội dung trở thành chuỗi rỗng; box co lại.
- Box trích dẫn tin của mình nằm ngoài bubble màu đậm nhưng dùng chữ trắng trên nền nhạt.
- XHR upload gọi `setRequestHeader('Authorization', ...)` hai lần. XHR nối hai giá trị chứ không thay thế, làm sai Bearer token.
- ChatRoom nuốt lỗi lưu tin ảnh; composer không hiển thị lỗi để thử lại.

## Bản sửa

- Lấy các tin nhắn gốc bằng một truy vấn `IN` theo ID mỗi trang, vẫn dùng session/RLS người dùng. Hoạt động khi tin gốc nằm ngoài trang hiện tại.
- Box reply có nền xanh/xám nhạt, chữ tối, tên người gửi, trích dẫn tối đa hai dòng và kích thước tối thiểu. Không nhầm tin chưa tải được với tin đã thu hồi; cập nhật trích dẫn khi tin gốc bị thu hồi qua Realtime.
- Upload dùng đúng một user JWT và apikey, giữ dấu phân cách folder, có timeout/network/abort handling và tên file UUID.
- Hiển thị lỗi gửi, giữ nội dung text/reply khi lỗi và giữ file để thử gửi lại.

## Kiểm thử

```powershell
node --test scripts/chat-regressions.test.mjs
node --test scripts/chat-ui.test.mjs
npm.cmd run build
```

6 regression tests + 1 kiểm thử render component PASS. Lint các helper/component/upload đã thay đổi PASS; ChatRoom và useChatMessages còn lỗi có sẵn (không phát sinh rule lỗi mới).

`scripts/chat-media-live-smoke.mjs` kiểm tra bằng tài khoản/không gian tạm riêng: upload PNG bằng cùng transport helper, tải lại đối chiếu bytes, gửi IMAGE qua Edge Function, trả lời ảnh và lấy đúng parent/tên người gửi. PASS trên Supabase; toàn bộ ảnh, tin nhắn và tài khoản test đã dọn. Không mở thêm policy, không gửi tin cho người dùng thật.

Browser preview localhost bị timeout; kiểm thử render không thay thế xác nhận trực quan desktop/iPhone. Chưa push/deploy bản sửa này.
