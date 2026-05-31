import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useCareSpace } from '../contexts/CareSpaceContext';
import { LogOut, Copy, Users, Smile, Check, UserCircle, Megaphone, Power, PowerOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '../components/ui/Input';
import { isAdminEmail } from '../types';
import { announcementService } from '../services/announcementService';

const AVATAR_OPTIONS = [
  { icon: '📷', label: 'Camera' },
  { icon: '🌵', label: 'Cactus' },
  { icon: '🌸', label: 'Flower' },
  { icon: '🐻', label: 'Bear' },
  { icon: '🐱', label: 'Cat' },
  { icon: '🥑', label: 'Avocado' },
  { icon: '🍕', label: 'Pizza' },
  { icon: '☕', label: 'Coffee' },
  { icon: '🧁', label: 'Cupcake' },
  { icon: '🎧', label: 'Headphones' },
  { icon: '🍀', label: 'Clover' },
  { icon: '✨', label: 'Sparkle' },
  { icon: '🦊', label: 'Fox' },
  { icon: '🌙', label: 'Moon' },
  { icon: '🎈', label: 'Balloon' },
  { icon: '🍓', label: 'Strawberry' },
];

export const Settings = () => {
  const { user, logout } = useAuth();
  const { careSpace, profiles, updateProfileAvatar, updateProfileName } = useCareSpace();
  const myProfile = profiles.find(p => p.user_id === user?.id) || profiles[0];
  const [selectedAvatar, setSelectedAvatar] = React.useState(myProfile?.avatar_emoji || '🐱');
  const [editingName, setEditingName] = React.useState(myProfile?.display_name || '');
  const [isSavingName, setIsSavingName] = React.useState(false);

  // Admin announcement state
  const isAdmin = isAdminEmail(user?.email);
  const [announcementTitle, setAnnouncementTitle] = React.useState('');
  const [announcementMessage, setAnnouncementMessage] = React.useState('');
  const [isSavingAnnouncement, setIsSavingAnnouncement] = React.useState(false);
  const [isDeactivating, setIsDeactivating] = React.useState(false);
  const [announcementStatus, setAnnouncementStatus] = React.useState('');
  const [currentAnnouncement, setCurrentAnnouncement] = React.useState<{ id: string; title?: string | null; message: string } | null>(null);

  // Load current active announcement if admin
  React.useEffect(() => {
    if (!isAdmin) return;
    announcementService.getActiveAnnouncement().then(a => {
      if (a) {
        setCurrentAnnouncement(a);
        setAnnouncementTitle(a.title || '');
        setAnnouncementMessage(a.message);
      }
    }).catch(() => {});
  }, [isAdmin]);

  const handleAvatarChange = (icon: string) => {
    setSelectedAvatar(icon);
    updateProfileAvatar(icon);
  };

  const handleCopyCode = () => {
    if (careSpace?.invite_code) {
      navigator.clipboard.writeText(careSpace.invite_code);
      alert('Đã copy mã mời!');
    }
  };

  const handleSaveName = async () => {
    if (!editingName.trim() || editingName.trim() === myProfile?.display_name) return;
    try {
      setIsSavingName(true);
      await updateProfileName(editingName.trim());
      alert('Đã cập nhật tên thành công!');
    } catch (error) {
      alert('Cập nhật tên thất bại. Vui lòng thử lại.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!announcementMessage.trim()) {
      setAnnouncementStatus('Vui lòng nhập nội dung thông báo.');
      return;
    }
    if (!user) return;

    setIsSavingAnnouncement(true);
    setAnnouncementStatus('');
    try {
      const result = await announcementService.createAnnouncement({
        title: announcementTitle.trim() || undefined,
        message: announcementMessage.trim(),
        userId: user.id,
        userEmail: user.email,
      });
      if (result) {
        setCurrentAnnouncement(result);
        setAnnouncementStatus('Đã cập nhật thông báo.');
      }
    } catch (err) {
      console.error(err);
      setAnnouncementStatus('Lưu thông báo thất bại.');
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const handleDeactivateAnnouncement = async () => {
    setIsDeactivating(true);
    setAnnouncementStatus('');
    try {
      await announcementService.deactivateCurrentAnnouncement();
      setCurrentAnnouncement(null);
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      setAnnouncementStatus('Đã tắt thông báo.');
    } catch (err) {
      console.error(err);
      setAnnouncementStatus('Tắt thông báo thất bại.');
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-brand tracking-tight">Cài đặt</h1>

      <Card>
        <h2 className="text-xl font-bold text-brand mb-4">Thông tin không gian</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-canvas-ceramic">
            <span className="text-text-soft font-semibold">Tên không gian</span>
            <span className="font-bold text-text-main">{careSpace?.name}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-canvas-ceramic">
            <span className="text-text-soft font-semibold">Mã mời</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-brand-accent bg-brand-light/30 px-2 py-1 rounded">
                {careSpace?.invite_code}
              </span>
              <button onClick={handleCopyCode} className="text-text-soft hover:text-brand-accent" title="Copy mã mời">
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-brand mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Thành viên
        </h2>
        <div className="space-y-4">
          {profiles.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-canvas-cool">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.avatar_emoji}</span>
                <span className="font-semibold text-text-main">
                  {p.display_name} {p.user_id === user?.id ? '(Bạn)' : ''}
                </span>
              </div>
              <span className="text-xs font-bold text-brand uppercase px-2 py-1 bg-brand-light/50 rounded">
                {p.role}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-brand mb-4 flex items-center gap-2">
          <UserCircle className="w-5 h-5" />
          Tên hiển thị
        </h2>
        <div className="pt-2">
          <p className="text-sm text-text-soft mb-4">Thay đổi tên gọi của bạn trong không gian này.</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input 
                value={editingName} 
                onChange={(e) => setEditingName(e.target.value)} 
                placeholder="Nhập tên mới..."
              />
            </div>
            <Button 
              onClick={handleSaveName} 
              disabled={!editingName.trim() || editingName.trim() === myProfile?.display_name || isSavingName}
              className="bg-brand text-white shrink-0"
            >
              {isSavingName ? 'Đang lưu...' : 'Cập nhật tên'}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-brand mb-4 flex items-center gap-2">
          <Smile className="w-5 h-5" />
          Ảnh đại diện
        </h2>
        <div className="pt-2">
          <p className="text-sm text-text-soft mb-4">Thay đổi icon đại diện của bạn sẽ hiển thị với tất cả thành viên trong không gian này.</p>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {AVATAR_OPTIONS.map((opt) => (
              <motion.button
                key={opt.icon}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleAvatarChange(opt.icon)}
                className={`w-12 h-12 flex items-center justify-center text-2xl rounded-2xl transition-all relative ${
                  selectedAvatar === opt.icon 
                    ? 'bg-brand text-white shadow-md shadow-brand/30 border-2 border-brand' 
                    : 'bg-canvas-cool hover:bg-canvas-ceramic border border-transparent'
                }`}
                title={opt.label}
              >
                {opt.icon}
                {selectedAvatar === opt.icon && (
                  <div className="absolute -bottom-1 -right-1 bg-white text-brand rounded-full p-0.5 border-2 border-brand shadow-sm">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </Card>

      {/* === ADMIN SECTION === */}
      {isAdmin && (
        <Card>
          <h2 className="text-xl font-bold text-brand mb-2 flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Thông báo hệ thống
          </h2>
          <p className="text-sm text-text-soft mb-5">
            Nhập một thông báo để mọi người thấy khi mở app.
          </p>

          {currentAnnouncement && (
            <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
              <span className="font-semibold">Thông báo đang bật:</span>{' '}
              {currentAnnouncement.title || 'Không tiêu đề'} — {currentAnnouncement.message.slice(0, 80)}{currentAnnouncement.message.length > 80 ? '...' : ''}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1">Tiêu đề</label>
              <Input
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="Ví dụ: Cập nhật nhỏ hôm nay"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1">Nội dung thông báo</label>
              <textarea
                value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value)}
                placeholder="Nhập nội dung muốn hiển thị cho mọi người..."
                rows={4}
                className="w-full rounded-xl border border-canvas-ceramic bg-white px-4 py-3 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-all resize-none"
              />
            </div>

            {announcementStatus && (
              <p className={`text-sm font-medium ${announcementStatus.includes('thất bại') || announcementStatus.includes('Vui lòng') ? 'text-semantic-destructive' : 'text-green-600'}`}>
                {announcementStatus}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleSaveAnnouncement}
                disabled={isSavingAnnouncement}
                className="bg-brand text-white flex items-center gap-2"
              >
                <Power className="w-4 h-4" />
                {isSavingAnnouncement ? 'Đang lưu...' : 'Lưu thông báo'}
              </Button>
              {currentAnnouncement && (
                <Button
                  variant="outline"
                  onClick={handleDeactivateAnnouncement}
                  disabled={isDeactivating}
                  className="!border-semantic-destructive !text-semantic-destructive hover:bg-semantic-destructive/10 flex items-center gap-2"
                >
                  <PowerOff className="w-4 h-4" />
                  {isDeactivating ? 'Đang tắt...' : 'Tắt thông báo hiện tại'}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-bold text-semantic-destructive mb-4">Tài khoản</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-canvas-ceramic">
            <span className="text-text-soft font-semibold">Email</span>
            <span className="text-text-main">{user?.email}</span>
          </div>
          <div className="pt-4">
            <Button variant="outline" className="w-full !border-semantic-destructive !text-semantic-destructive hover:bg-semantic-destructive/10 flex items-center justify-center gap-2" onClick={logout}>
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

