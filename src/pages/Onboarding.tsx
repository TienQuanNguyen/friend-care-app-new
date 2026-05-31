import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useCareSpace } from '../contexts/CareSpaceContext';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Check } from 'lucide-react';

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
  { icon: '🍵', label: 'Matcha' },
  { icon: '📄', label: 'Paper' },
  { icon: '☀️', label: 'Sun' },
  { icon: '🦀', label: 'Crab' },
  { icon: '🦂', label: 'Scorpion' },
  { icon: '☁️', label: 'Cloud' },
  { icon: '❄️', label: 'Snowflake' },
  { icon: '🐰', label: 'Rabbit' },
];

type Mode = 'select' | 'join' | 'create' | 'pick-avatar';

export const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const { careSpace, loading: spaceLoading, joinSpace, createSpace } = useCareSpace();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('select');
  const [code, setCode] = useState(() => localStorage.getItem('friendcare_last_invite_code') || '');
  const [name, setName] = useState('');
  const [pendingAction, setPendingAction] = useState<'join' | 'create' | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('🐱');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (authLoading || spaceLoading) return;
    if (!user) {
      navigate('/auth', { replace: true });
    } else if (careSpace) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, careSpace, spaceLoading, navigate]);

  if (authLoading || spaceLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-canvas">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  const goToAvatarPicker = (action: 'join' | 'create') => {
    if (action === 'join' && !code) return;
    if (action === 'create' && !name) return;
    setPendingAction(action);
    setMode('pick-avatar');
  };

  const handleFinish = async () => {
    localStorage.setItem('friendcare_avatar', selectedAvatar);
    setLoading(true);
    setError('');

    try {
      if (pendingAction === 'join') {
        await joinSpace(code);
      } else {
        await createSpace(name);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EFF6FF] via-[#F8FAFC] to-[#ECFDF5] flex items-center justify-center p-4">
      <AnimatePresence mode="wait">

        {/* Select Mode */}
        {mode === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            <Card>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-brand to-brand-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-frap-ambient">
                  <Heart className="w-8 h-8 text-white fill-white" />
                </div>
                <h1 className="text-2xl font-bold text-text-main tracking-tight">Friend Care</h1>
                <p className="text-text-soft mt-2 text-sm">Không gian chăm sóc nhau mỗi ngày</p>
              </div>
              <div className="space-y-3">
                <Button onClick={() => setMode('join')} className="w-full" size="lg">
                  Tham gia bằng mã mời
                </Button>
                <Button onClick={() => setMode('create')} variant="outline" className="w-full" size="lg">
                  Tạo không gian mới
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Join Mode */}
        {mode === 'join' && (
          <motion.div
            key="join"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            <Card>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-text-main">Tham gia không gian</h2>
                <p className="text-text-soft text-sm mt-1">Nhập mã mời từ người ấy</p>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); goToAvatarPicker('join'); }} className="space-y-5">
                <Input
                  label="Mã mời (VD: FRIENDCARE)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full">Tiếp tục →</Button>
                <Button type="button" variant="ghost" onClick={() => setMode('select')} className="w-full">Quay lại</Button>
              </form>
            </Card>
          </motion.div>
        )}

        {/* Create Mode */}
        {mode === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            <Card>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-text-main">Tạo không gian mới</h2>
                <p className="text-text-soft text-sm mt-1">Đặt tên cho không gian của đôi bạn</p>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); goToAvatarPicker('create'); }} className="space-y-5">
                <Input
                  label="Tên không gian (VD: Ngôi nhà nhỏ)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full">Tiếp tục →</Button>
                <Button type="button" variant="ghost" onClick={() => setMode('select')} className="w-full">Quay lại</Button>
              </form>
            </Card>
          </motion.div>
        )}

        {/* Avatar Picker */}
        {mode === 'pick-avatar' && (
          <motion.div
            key="avatar"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            <Card>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-text-main">Chọn avatar của bạn</h2>
                <p className="text-text-soft text-sm mt-1">Icon này sẽ đại diện cho bạn trong không gian chung</p>
              </div>

              {/* Preview */}
              <motion.div
                className="flex justify-center mb-6"
                key={selectedAvatar}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              >
                <div className="w-20 h-20 bg-gradient-to-br from-brand-light to-[#DBEAFE] rounded-3xl flex items-center justify-center shadow-frap-ambient border-2 border-brand">
                  <span className="text-4xl">{selectedAvatar}</span>
                </div>
              </motion.div>

              {/* Grid */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {AVATAR_OPTIONS.map(({ icon, label }) => {
                  const isSelected = selectedAvatar === icon;
                  return (
                    <motion.button
                      key={icon}
                      title={label}
                      onClick={() => setSelectedAvatar(icon)}
                      className={`relative flex flex-col items-center justify-center w-full aspect-square rounded-2xl border-2 transition-colors duration-200 ${
                        isSelected
                          ? 'border-brand bg-brand-light shadow-glow-blue'
                          : 'border-canvas-dark bg-canvas-cool hover:border-brand/40 hover:bg-brand-light/20'
                      }`}
                      whileTap={{ scale: 0.88 }}
                      whileHover={{ scale: 1.06 }}
                      animate={isSelected ? { scale: 1.08 } : { scale: 1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                    >
                      <span className="text-2xl">{icon}</span>
                      {isSelected && (
                        <motion.div
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand rounded-full flex items-center justify-center shadow-sm"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500 }}
                        >
                          <Check className="w-3 h-3 text-white stroke-[3]" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="space-y-3">
                {error && (
                  <div className="mb-4 p-3 text-sm text-semantic-destructive bg-semantic-destructive/10 rounded-lg">
                    {error}
                  </div>
                )}
                <Button onClick={handleFinish} className="w-full" disabled={loading}>
                  {loading ? 'Đang xử lý...' : 'Hoàn thành & Bắt đầu'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setMode(pendingAction === 'join' ? 'join' : 'create')}
                  className="w-full"
                >
                  Quay lại
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};
