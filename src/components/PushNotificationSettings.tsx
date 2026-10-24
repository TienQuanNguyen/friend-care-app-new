import { useEffect, useState } from 'react';
import { Bell, BellRing, Smartphone, AlertCircle } from 'lucide-react';
import { useWebPush } from '../hooks/useWebPush';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

export function PushNotificationSettings() {
  const { permission, needsInstall, isSubscribed, isLoading, error, requestPermissionAndSubscribe, unsubscribe, sendTest } = useWebPush();
  const [testStatus, setTestStatus] = useState('');
  const [testing, setTesting] = useState(false);
  useEffect(() => {
    if (window.location.hash === '#notifications') document.getElementById('notifications')?.scrollIntoView({ block: 'start' });
  }, []);

  const test = async () => {
    setTesting(true);
    setTestStatus('');
    try {
      await sendTest();
      setTestStatus('Đã gửi thông báo thử tới thiết bị này. Hãy kiểm tra Trung tâm thông báo.');
    } catch (cause) {
      setTestStatus(cause instanceof Error ? cause.message : 'Chưa gửi được thông báo thử.');
    } finally { setTesting(false); }
  };

  return (
    <Card id="notifications">
      <h2 className="section-title mb-2 flex items-center gap-2 text-xl text-brand-house">
        <Bell className="h-5 w-5" /> Thông báo tin nhắn
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-text-soft">
        Cho phép một lần trên thiết bị này để nhận tin nhắn mới ngay cả khi không mở Friend Care.
        Những lần sau ứng dụng sẽ tự kết nối lại.
      </p>
      <div className="space-y-3 rounded-2xl border border-canvas-dark bg-canvas-cool p-4">
        {needsInstall ? (
          <div className="space-y-3 text-sm text-text-main">
            <p className="flex items-center gap-2 font-semibold text-brand-house"><Smartphone className="h-5 w-5" /> Bật thông báo trên iPhone</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Mở Friend Care bằng Safari, bấm <strong>Chia sẻ</strong>.</li>
              <li>Chọn <strong>Thêm vào Màn hình chính</strong> (bật “Mở dưới dạng ứng dụng web” nếu có).</li>
              <li>Mở Friend Care từ biểu tượng vừa thêm, đăng nhập và bấm <strong>Bật thông báo</strong>.</li>
            </ol>
            <p className="text-xs text-text-soft">Cần iOS 16.4 trở lên. Sau lần cho phép đầu tiên, bạn không cần bật lại mỗi ngày.</p>
          </div>
        ) : permission === 'unsupported' ? (
          <p className="text-sm text-text-soft">Hãy dùng Chrome, Edge hoặc Safari phiên bản mới. Trên iPhone, cập nhật iOS từ 16.4 và mở Friend Care từ Màn hình chính.</p>
        ) : permission === 'denied' ? (
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 font-semibold text-red-600"><AlertCircle className="h-4 w-4" /> Thiết bị đang chặn thông báo</p>
            <p className="text-text-soft">Máy tính: mở quyền trang web cạnh thanh địa chỉ, cho phép Thông báo. iPhone: vào Cài đặt → Thông báo → Friend Care → Cho phép thông báo. Sau đó mở lại ứng dụng.</p>
          </div>
        ) : (
          <>
            <p className={`flex items-center gap-2 text-sm font-semibold ${isSubscribed ? 'text-emerald-700' : 'text-text-soft'}`}>
              <BellRing className="h-4 w-4" />
              {isLoading ? 'Đang kết nối thông báo…' : isSubscribed ? 'Đã bật trên thiết bị này' : 'Chưa bật trên thiết bị này'}
            </p>
            <div className="flex flex-wrap gap-2">
              {isSubscribed ? (
                <>
                  <Button disabled={isLoading || testing} onClick={() => void test()} className="bg-brand text-sm text-white">
                    {testing ? 'Đang gửi…' : 'Gửi thông báo thử'}
                  </Button>
                  <Button disabled={isLoading || testing} onClick={() => void unsubscribe()} variant="outline" className="text-sm">Tắt thông báo</Button>
                </>
              ) : (
                <Button disabled={isLoading} onClick={() => void requestPermissionAndSubscribe()} className="bg-brand text-sm text-white">
                  {isLoading ? 'Đang bật…' : permission === 'granted' ? 'Kết nối lại thông báo' : 'Bật thông báo'}
                </Button>
              )}
            </div>
          </>
        )}
        {error && <p role="alert" className="text-sm text-red-600">{error.message}</p>}
        {testStatus && <p role="status" className="text-sm text-text-soft">{testStatus}</p>}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-text-soft">Bật riêng trên mỗi máy tính/iPhone muốn nhận tin. Nếu bạn xóa dữ liệu trang web hoặc thu hồi quyền, bạn cần cho phép lại. Chế độ Không làm phiền có thể tạm ẩn thông báo.</p>
    </Card>
  );
}
