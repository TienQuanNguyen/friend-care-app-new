import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useCareSpace } from '../contexts/CareSpaceContext';
import { loveNoteService } from '../services/loveNoteService';
import { LoveNote } from '../types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Heart, Flame, Sparkles, CheckCircle2, Clock3, MoreHorizontal } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { AnimatedCheck } from '../components/ui/AnimatedCheck';
import { useStreak } from '../hooks/useStreak';
import { useActivityLog } from '../hooks/useActivityLog';

export const LoveNotes = () => {
  const { user } = useAuth();
  const { careSpace, profiles } = useCareSpace();
  const { status: streakStatus, loading: streakLoading, refresh: refreshStreak } = useStreak();
  const { log } = useActivityLog();
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const data = await loveNoteService.getNotes();
      setNotes(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadNotes();
      void refreshStreak();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshStreak]);

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || !user || !careSpace) return;
    
    setIsSubmitting(true);
    try {
      await loveNoteService.addNote({
        care_space_id: careSpace.id,
        created_by: user.id,
        message,
      });

      setMessage('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      loadNotes();
      await refreshStreak();
      log('love_note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProfile = (userId: string) => {
    return profiles.find(p => p.user_id === userId) || { display_name: 'Người dùng', avatar_emoji: '👤' };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl font-bold text-brand tracking-tight flex items-center justify-center gap-3 mb-3">
          <Flame className="w-8 h-8 text-gold" />
          Giữ lửa yêu thương
        </h1>
        <p className="text-text-soft text-sm leading-relaxed">
          Mỗi người chỉ cần có một tương tác trong ngày. Khi cả hai cùng xuất hiện, chuỗi sẽ tự động được nối tiếp.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="sm" className="bg-white border-none shadow-card text-center relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Flame className="w-24 h-24 text-gold" />
          </div>
          <div className="relative z-10">
            <div className="text-xs font-bold text-gold tracking-wider uppercase mb-1">Chuỗi hiện tại</div>
            <div className="text-4xl font-black text-text-main my-2 flex justify-center items-baseline gap-1">
              {streakLoading ? '–' : streakStatus.currentStreak} <span className="text-sm font-semibold text-text-soft">ngày liên tục</span>
            </div>
            <p className="text-xs text-text-soft">Chỉ tính những ngày cả hai đều có hoạt động.</p>
          </div>
        </Card>

        <Card padding="sm" className="bg-white border-none shadow-card text-center relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles className="w-24 h-24 text-brand-accent" />
          </div>
          <div className="relative z-10">
            <div className="text-xs font-bold text-brand-accent tracking-wider uppercase mb-1">Kỷ lục cao nhất</div>
            <div className="text-4xl font-black text-text-main my-2 flex justify-center items-baseline gap-1">
              {streakLoading ? '–' : streakStatus.bestStreak} <span className="text-sm font-semibold text-text-soft">ngày của cả hai</span>
            </div>
            <p className="text-xs text-text-soft">Mục tiêu vượt qua bản thân và thắt chặt kết nối.</p>
          </div>
        </Card>

        <Card padding="sm" className="bg-white border-none shadow-card text-center relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Heart className="w-24 h-24 text-brand" />
          </div>
          <div className="relative z-10">
            <div className="text-xs font-bold text-brand tracking-wider uppercase mb-1">Khoảnh khắc thanh xuân</div>
            <div className="text-4xl font-black text-text-main my-2 flex justify-center items-baseline gap-1">
              {notes.length} <span className="text-sm font-semibold text-text-soft">lời nhắn tổng cộng</span>
            </div>
            <p className="text-xs text-text-soft">Bạn và người ấy đồng hành trên chặng đường ký ức.</p>
          </div>
        </Card>
      </div>

      {/* Automatic two-person streak status */}
      <Card className="bg-white shadow-card border-none py-7 px-5">
        <div className="mb-5 text-center">
          <h2 className="text-xl font-bold text-text-main">Giữ lửa hôm nay</h2>
          <p className="mt-1 text-sm text-text-soft">
            Chuỗi được tích tự động sau khi cả hai đều có hoạt động.
          </p>
        </div>

        <div className="mx-auto grid max-w-xl grid-cols-2 gap-3">
          {[profiles[0] || null, profiles[1] || null].map((profile, index) => {
            const isActive = profile
              ? streakStatus.activeUserIdsToday.includes(profile.user_id)
              : false;
            const displayName = profile?.display_name || (index === 0 ? 'Bạn' : 'Người còn lại');

            return (
              <div
                key={profile?.user_id || `streak-slot-${index}`}
                className={`min-w-0 rounded-xl border p-4 text-center ${
                  isActive
                    ? 'border-brand-light bg-brand-light/35'
                    : 'border-canvas-dark bg-canvas-cool'
                }`}
              >
                <div className="mb-2 text-2xl">{profile?.avatar_emoji || '👤'}</div>
                <p className="truncate text-sm font-bold text-text-main">
                  {displayName}{profile?.user_id === user?.id ? ' (Bạn)' : ''}
                </p>
                <div className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold ${
                  isActive ? 'text-brand' : 'text-text-soft'
                }`}>
                  {isActive ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Clock3 className="h-4 w-4" />
                  )}
                  {isActive ? 'Đã có hoạt động' : 'Đang chờ'}
                </div>
              </div>
            );
          })}
        </div>

        <div className={`mx-auto mt-5 flex max-w-xl items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${
          streakStatus.completedToday
            ? 'bg-orange-50 text-orange-700'
            : 'bg-canvas-cool text-text-soft'
        }`}>
          <Flame className={`h-5 w-5 ${
            streakStatus.completedToday ? 'fill-orange-400 text-orange-500' : 'text-gray-400'
          }`} />
          {streakStatus.completedToday
            ? 'Ngọn lửa hôm nay đã được thắp sáng.'
            : 'Cần hoạt động từ cả hai để nối chuỗi hôm nay.'}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Write Note Form */}
        <Card className="bg-white shadow-card border-none sticky top-24">
          <form onSubmit={handleSubmitNote} className="space-y-4">
            <h2 className="font-bold text-lg text-brand flex items-center gap-2 mb-4 border-b border-canvas-cool pb-4">
              <Heart className="w-5 h-5" />
              Lời nhắn nhỏ hôm nay
            </h2>
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Viết một điều dịu dàng cho người ấy..."
                className="w-full bg-canvas-cool border border-gray-200 rounded-xl p-4 outline-none resize-none h-32 text-text-main focus:border-brand-accent transition-colors text-sm"
                required
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={!message || isSubmitting} className="bg-brand text-white hover:bg-brand-accent rounded-pill flex items-center gap-2">
                {isSubmitting ? 'Đang gửi...' : 'Gửi lời nhắn'}
                {showSuccess && <AnimatedCheck size={16} color="#fff" />}
              </Button>
            </div>
          </form>
        </Card>

        {/* Notes List */}
        <div className="space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              {(showAllNotes ? notes : notes.slice(0, 6)).map((note) => {
                const profile = getProfile(note.created_by);
                return (
                  <Card key={note.id} className="relative overflow-hidden group border-none shadow-nav hover:shadow-frap-ambient transition-all bg-white p-5 rounded-2xl">
                    <div className="absolute top-4 right-4 opacity-[0.03] group-hover:opacity-5 transition-opacity">
                      <Heart className="w-20 h-20" />
                    </div>

                    <div className="flex items-center gap-3 mb-4 relative z-10">
                      <div className="w-10 h-10 bg-canvas-cool rounded-full flex items-center justify-center text-xl shadow-sm border border-white">
                        {profile.avatar_emoji}
                      </div>
                      <div>
                        <div className="font-bold text-text-main text-sm">{profile.display_name}</div>
                        <div className="text-[11px] font-semibold text-text-soft">
                          {format(new Date(note.created_at), 'HH:mm • dd/MM/yyyy', { locale: vi })}
                        </div>
                      </div>
                    </div>

                    <p className="text-[15px] text-text-main relative z-10 leading-relaxed pl-13">
                      {note.message}
                    </p>
                  </Card>
                );
              })}

              {notes.length > 6 && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setShowAllNotes(!showAllNotes)}
                    className="flex items-center gap-2 px-5 py-2 bg-white border border-gray-200 shadow-sm hover:shadow-md rounded-full text-xs font-bold text-brand hover:text-brand-accent transition-all"
                  >
                    {showAllNotes ? (
                      <>Thu gọn</>
                    ) : (
                      <>
                        <span>Xem thêm {notes.length - 6} lời nhắn...</span>
                        <MoreHorizontal className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
          {!isLoading && notes.length === 0 && (
            <div className="text-center py-12 px-4 border border-dashed border-gray-200 rounded-2xl bg-white/50">
              <Heart className="w-8 h-8 text-brand-light mx-auto mb-3" />
              <p className="text-text-soft text-sm">Chưa có lời nhắn nào. Hãy gửi lời yêu thương đầu tiên nhé.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
