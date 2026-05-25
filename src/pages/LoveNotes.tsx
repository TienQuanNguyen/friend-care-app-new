import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useCareSpace } from '../contexts/CareSpaceContext';
import { loveNoteService } from '../services/loveNoteService';
import { LoveNote } from '../types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Heart, Flame, Sparkles, CheckCircle2 } from 'lucide-react';

export const LoveNotes = () => {
  const { user } = useAuth();
  const { careSpace, profiles } = useCareSpace();
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [message, setMessage] = useState('');

  // Local Mock State for Check-ins
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [streak, setStreak] = useState(12);
  const [bestStreak, setBestStreak] = useState(45);

  useEffect(() => {
    loadNotes();
    // Simulate checking if checked in today
    const lastCheckIn = localStorage.getItem('friendcare_last_checkin');
    const today = format(new Date(), 'yyyy-MM-dd');
    if (lastCheckIn === today) {
      setIsCheckedIn(true);
    }
  }, []);

  const loadNotes = async () => {
    const data = await loveNoteService.getNotes();
    setNotes(data);
  };

  const handleCheckIn = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    localStorage.setItem('friendcare_last_checkin', today);
    setIsCheckedIn(true);
    setStreak(s => s + 1);
    if (streak + 1 > bestStreak) setBestStreak(streak + 1);
  };

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || !user || !careSpace) return;

    await loveNoteService.addNote({
      care_space_id: careSpace.id,
      created_by: user.id,
      message,
    });

    setMessage('');
    loadNotes();
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
          Chỉ cần một trong hai bạn ghé thăm ứng dụng để lại một dấu ấn mỗi ngày, ngọn lửa nhỏ sẽ rực sáng.
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
              {streak} <span className="text-sm font-semibold text-text-soft">ngày liên tục</span>
            </div>
            <p className="text-xs text-text-soft">Ngọn lửa yêu thương đang bừng cháy rực rỡ!</p>
          </div>
        </Card>

        <Card padding="sm" className="bg-white border-none shadow-card text-center relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles className="w-24 h-24 text-brand-accent" />
          </div>
          <div className="relative z-10">
            <div className="text-xs font-bold text-brand-accent tracking-wider uppercase mb-1">Kỷ lục cao nhất</div>
            <div className="text-4xl font-black text-text-main my-2 flex justify-center items-baseline gap-1">
              {bestStreak} <span className="text-sm font-semibold text-text-soft">ngày của cả hai</span>
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

      {/* Check-in Section */}
      <Card className="bg-white shadow-card border-none text-center py-8 px-4">
        <h2 className="text-xl font-bold text-text-main mb-2">Điểm danh nhẹ mỗi ngày</h2>

        {!isCheckedIn ? (
          <>
            <p className="text-text-soft text-sm mb-6 max-w-md mx-auto">
              Hôm nay hai bạn chưa có bản ghi? Hãy gửi ngay một nút chạm nhẹ thay lời chào!
            </p>
            <Button onClick={handleCheckIn} className="bg-brand hover:bg-brand-accent text-white font-bold px-8 py-3 rounded-pill shadow-frap-base animate-bounce-slow">
              Điểm danh hôm nay
            </Button>
          </>
        ) : (
          <div className="animate-in zoom-in duration-500 max-w-md mx-auto">
            <div className="inline-flex items-center gap-2 bg-brand-light/50 text-brand-house px-4 py-1.5 rounded-pill text-sm font-bold mb-4 border border-brand-light">
              <CheckCircle2 className="w-4 h-4" /> Đã điểm danh hôm nay!
            </div>
            <div className="bg-canvas-cool rounded-xl p-5 border border-brand-light/30 relative">
              <Heart className="absolute -top-3 -right-3 w-8 h-8 text-brand fill-brand-light opacity-50" />
              <p className="text-text-main font-medium leading-relaxed">
                Tuyệt vời ông mặt trời ka ka ka ka ka ka ka <br />
                <span className="text-xs text-text-soft mt-2 block font-semibold">{format(new Date(), 'dd/MM/yyyy')}</span>
              </p>
            </div>
          </div>
        )}
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
              <Button type="submit" className="bg-brand text-white hover:bg-brand-accent rounded-pill">Gửi lời nhắn</Button>
            </div>
          </form>
        </Card>

        {/* Notes List */}
        <div className="space-y-4">
          {notes.map((note) => {
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
          {notes.length === 0 && (
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
