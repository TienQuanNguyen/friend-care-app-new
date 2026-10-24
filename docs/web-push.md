# Thông báo chat trên máy tính và iPhone

## Dành cho người dùng

- Máy tính: Cài đặt → Thông báo tin nhắn → Bật thông báo → Cho phép.
- iPhone (iOS 16.4+): Safari → Chia sẻ → Thêm vào Màn hình chính. Mở Friend Care từ biểu tượng đó, đăng nhập, bật thông báo một lần.
- Bật riêng trên mỗi thiết bị. Các lần mở lại tự đồng bộ đăng ký, không hỏi quyền lại nếu quyền vẫn còn. “Tắt thông báo” được ghi nhớ trên thiết bị theo tài khoản.
- Dùng “Gửi thông báo thử” trong Cài đặt để kiểm tra. Sau đó nhờ người còn lại gửi chat khi bạn đã chuyển sang ứng dụng khác/khóa màn hình.
- Không làm phiền/Focus, quyền thông báo hệ điều hành, trình duyệt bị thoát hoàn toàn hoặc hạn chế chạy nền có thể trì hoãn/chặn thông báo. Xóa dữ liệu trang web hoặc thu hồi quyền có thể cần bật lại.

## Luồng kỹ thuật

1. Một WebPushProvider dùng chung cho Chat và Cài đặt; đăng ký `/sw.js`, tự khôi phục khi đăng nhập/mở lại/focus/online.
2. Public VAPID key được lấy từ action `config` của function (không dùng biến VITE_VAPID_PUBLIC_KEY cũ).
3. Đăng ký endpoint bằng bảng `push_subscriptions`; RLS chỉ cho user quản lý thiết bị của chính mình.
4. `sendMessage` gọi action `send-message`. Function xác thực JWT bằng Auth, xác nhận care space, giữ RLS khi lưu chat. UUID được dùng lại khi retry để không lưu/gửi push trùng.
5. Function dùng user-scoped client đọc thành viên cùng space, service-role client chỉ đọc/gỡ push subscriptions của người nhận. Push gửi trong `EdgeRuntime.waitUntil`, không làm thất bại tin nhắn đã lưu.
6. `web-push@3.6.7` mã hóa aes128gcm. Chỉ gọi các host push được cho phép; không theo redirect. HTTP 404/410 mới xóa endpoint; lỗi khác giữ để lần gửi sau thử lại. Không có hàng đợi retry bền vững cho push.
7. Service worker luôn hiển thị thông báo cho mỗi push, kể cả đang mở Chat (đáp ứng yêu cầu userVisibleOnly của iOS); bấm thông báo mở `/chat` cùng origin.

Không cần xin lại quyền khi đổi khóa VAPID: app thay subscription khi mở lại, nếu trình duyệt vẫn cấp quyền. Khi đăng xuất/đổi tài khoản, subscription cũ bị hủy để tránh nhận tin của tài khoản trước.

## Triển khai

Chỉ dùng project `iovvklliosftzeyecpul`. Không đưa private VAPID key/service-role key vào frontend, Git hoặc log.

```powershell
# Chỉ tạo khóa ở lần thiết lập đầu tiên; script không ghi đè khóa đã có.
npx.cmd --yes deno@2.5.6 run --allow-env --allow-write=.env.push.local --allow-read=.env.push.local --config supabase/functions/send-push-notification/deno.json scripts/generate-vapid.ts
npx.cmd --yes supabase@2.122.0 secrets set --project-ref iovvklliosftzeyecpul --env-file .env.push.local
npx.cmd --yes supabase@2.122.0 functions deploy send-push-notification --project-ref iovvklliosftzeyecpul --use-api
```

Giữ `verify_jwt=true` tại gateway. Function còn xác minh user bằng `auth.getUser`. Không bật webhook gọi lại function này: trigger cũ `trg_chat_messages_push` đã được gỡ bằng migration `20261024034030_replace_legacy_push_trigger.sql`, áp dụng trực tiếp qua CLI `db query --file` (không tự thêm migration history). Các client cũ cần tải lại bản web mới để dùng luồng gửi thông báo này.

`.env.push.local` được gitignore; lưu trữ như secret. Không tạo khóa mới mỗi lần deploy. Icons PNG sinh bằng `scripts/generate-push-icons.ps1`.

## Kiểm thử (2026-10-24)

```powershell
node --test scripts/web-push.test.mjs
npx.cmd --yes deno@2.5.6 test --allow-env --config supabase/functions/send-push-notification/deno.json supabase/functions/send-push-notification/push_test.ts
npm.cmd run build
```

- 7 kiểm thử controller/service-worker PASS: không tự xin quyền, phục hồi, opt-out, đổi tài khoản, đăng xuất, xoay khóa, lỗi lưu, iPhone và điều hướng an toàn.
- 3 kiểm thử backend PASS: endpoint allowlist, payload giải mã được bằng khóa thiết bị giả, trạng thái HTTP và preview.
- 13 kiểm tra API thật trên Supabase PASS: JWT, giả mạo sender, quyền care space, reply, retry không trùng, RLS subscription, TEXT/EMOJI/IMAGE/VIDEO. Tài khoản/không gian kiểm thử đã dọn. Không gửi thông báo đến người dùng thật.
- Security advisors mức ERROR: không phát hiện lỗi tại thời điểm kiểm tra.
- Build PASS. Các module thông báo mới lint PASS. 9 lỗi lint cũ ở ChatRoom/useChatMessages/Settings vẫn giữ nguyên so với HEAD trước sửa.
- Chưa xác nhận hiển thị trên máy tính/iPhone vật lý; kiểm tra bằng nút thử và chat giữa hai tài khoản trên thiết bị thật.

Live smoke test tạo tài khoản và không gian tạm riêng rồi dọn bằng `finally`. Chỉ chạy khi có quyền quản trị dự án. Không in khóa:

```powershell
npx.cmd --yes supabase@2.122.0 projects api-keys --project-ref iovvklliosftzeyecpul --output-format json | node scripts/push-live-smoke.mjs
```

Nguồn: [WebKit iOS Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [Supabase background tasks](https://supabase.com/docs/guides/functions/background-tasks), [web-push](https://github.com/web-push-libs/web-push).
