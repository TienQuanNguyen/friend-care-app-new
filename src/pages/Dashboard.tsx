import React, { useEffect, useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { useCareSpace } from '../contexts/CareSpaceContext';
import { Smile, Calendar as CalendarIcon, Heart, Users, Flame, Utensils, Image as ImageIcon, Sparkles } from 'lucide-react';
import { moodService } from '../services/moodService';
import { scheduleService } from '../services/scheduleService';
import { foodService } from '../services/foodService';
import { MoodEntry, Schedule, FoodPlace } from '../types';
import { format, parseISO, isToday } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AnimatedCheck } from '../components/ui/AnimatedCheck';
import { MiniConfetti } from '../components/ui/MiniConfetti';
import { useAuth } from '../contexts/AuthContext';

const stagger: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08 } },
};
const fadeUp: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

export const Dashboard = () => {
  const { user } = useAuth();
  const { careSpace, profiles } = useCareSpace();
  const [recentMoods, setRecentMoods] = useState<MoodEntry[]>([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState<Schedule[]>([]);
  const [recentFoods, setRecentFoods] = useState<FoodPlace[]>([]);

  // Daily Mood Check-in state
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [isSavingMood, setIsSavingMood] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    moodService.getEntries().then(data => {
      setRecentMoods(data.slice(0, 2));
      // Check if user has an entry today
      if (user) {
        const todayEntries = data.filter(e => e.created_by === user.id && isToday(parseISO(e.entry_date)));
        if (todayEntries.length > 0) {
          setHasCheckedInToday(true);
        }
      }
    });

    foodService.getPlaces().then(data => setRecentFoods(data.filter(f => !f.tried).slice(0, 2)));
    scheduleService.getSchedules().then(data => {
      const now = new Date();
      const upcoming = data.filter(s => new Date(s.start_time) >= now).slice(0, 2);
      setUpcomingSchedules(upcoming);
    });
  }, [user]);

  const handleQuickMood = async (moodName: string) => {
    if (!careSpace || !user || isSavingMood) return;
    setIsSavingMood(true);
    try {
      await moodService.addEntry({
        care_space_id: careSpace.id,
        created_by: user.id,
        mood: moodName as any,
        energy_level: 5,
        note: '',
        gratitude: '',
        entry_date: format(new Date(), 'yyyy-MM-dd')
      });
      setHasCheckedInToday(true);
      setShowConfetti(true);

      // Reload recent moods
      const data = await moodService.getEntries();
      setRecentMoods(data.slice(0, 2));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingMood(false);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng! ☀️';
    if (h < 18) return 'Chào buổi chiều! 🌤️';
    return 'Chào buổi tối Sơn Duyên kkk! 🌙';
  };

  return (
    <motion.div className="space-y-6 max-w-5xl mx-auto" variants={stagger} initial="initial" animate="animate">

      {/* Header */}
      <motion.section className="text-center mb-8" variants={fadeUp}>
        <h1 className="text-3xl font-bold text-brand tracking-tight mb-2">{getGreeting()}</h1>
        <p className="text-text-soft text-sm">
          Chào mừng đến với <span className="font-semibold text-brand">{careSpace?.name || 'Friend Care'}</span>. Hôm nay hai bạn cảm thấy thế nào?
        </p>
      </motion.section>

      {/* Members */}
      <motion.section className="flex flex-wrap justify-center gap-4 mb-6" variants={fadeUp}>
        {profiles.map(p => (
          <div key={p.id} className="flex flex-col items-center justify-center bg-white shadow-card rounded-3xl w-24 h-24 border border-brand-light">
            <div className="text-3xl mb-1">{p.avatar_emoji}</div>
            <div className="text-[11px] font-bold text-text-main uppercase tracking-wider">{p.display_name}</div>
          </div>
        ))}
        <div className="flex flex-col items-center justify-center bg-transparent border-2 border-dashed border-brand-light rounded-3xl w-24 h-24 hover:bg-brand-light/20 cursor-pointer transition-colors group">
          <Users className="w-6 h-6 text-brand mb-1 opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="text-[10px] font-bold text-text-soft uppercase tracking-wider">Mã: {careSpace?.invite_code}</div>
        </div>
      </motion.section>

      {/* AI Advice Card — Green Accent */}
      <motion.div variants={fadeUp}>
        <Card
          animate={false}
          className="bg-brand-house text-white border-none shadow-frap-ambient relative overflow-hidden"
        >
          <div className="absolute -right-6 -bottom-6 opacity-10">
            <Heart className="w-36 h-36" />
          </div>
          <div className="absolute -left-4 -top-4 opacity-10">
            <Sparkles className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex items-start gap-4 p-2">
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-1 tracking-wide text-brand-light">Lời nhắn hôm nay</h3>
              <p className="text-white/90 text-sm leading-relaxed font-medium">
                "Tình bạn diệu kỳ là khi chúng ta chấp nhận sự không hoàn hảo của nhau. Hãy cùng nhau tạo thêm những kỷ niệm đẹp nhé."
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div className="grid md:grid-cols-2 gap-6" variants={stagger}>

        {/* Quick Check-in */}
        <motion.div variants={fadeUp}>
          <Card
            animate={false}
            className="bg-canvas-cool border border-canvas-dark shadow-card hover:shadow-card-hover transition-shadow relative"
          >
            {showConfetti && <MiniConfetti onComplete={() => setShowConfetti(false)} />}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-brand-house flex items-center gap-2">
                <Smile className="w-5 h-5 text-brand-accent" /> Check-in hôm nay
              </h2>
            </div>

            {hasCheckedInToday ? (
              <div className="flex items-center justify-center gap-3 bg-white rounded-2xl p-6 border border-canvas-dark shadow-sm">
                <AnimatedCheck size={32} color="#10B981" />
                <div className="text-center">
                  <h3 className="font-bold text-text-main">Tuyệt vời!</h3>
                  <p className="text-xs text-text-soft">Bạn đã ghi lại cảm xúc hôm nay rồi.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-text-main font-medium mb-4">Ngay lúc này bạn cảm thấy thế nào?</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleQuickMood('Hạnh phúc')}
                    disabled={isSavingMood}
                    className="flex flex-col items-center justify-center bg-white rounded-xl py-3 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all disabled:opacity-50"
                  >
                    <span className="text-2xl mb-1">✨</span>
                    <span className="text-xs font-bold text-amber-600">Tuyệt vời</span>
                  </button>
                  <button
                    onClick={() => handleQuickMood('Bình yên')}
                    disabled={isSavingMood}
                    className="flex flex-col items-center justify-center bg-white rounded-xl py-3 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all disabled:opacity-50"
                  >
                    <span className="text-2xl mb-1">🌿</span>
                    <span className="text-xs font-bold text-emerald-600">Bình thường</span>
                  </button>
                  <button
                    onClick={() => handleQuickMood('Mệt mỏi')}
                    disabled={isSavingMood}
                    className="flex flex-col items-center justify-center bg-white rounded-xl py-3 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all disabled:opacity-50"
                  >
                    <span className="text-2xl mb-1">☕</span>
                    <span className="text-xs font-bold text-orange-600">Mệt mỏi</span>
                  </button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Mood — Light Green */}
        <motion.div variants={fadeUp}>
          <Card
            animate={false}
            className="bg-brand-light/30 border border-brand-light shadow-card hover:shadow-card-hover transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-brand flex items-center gap-2">
                <Smile className="w-5 h-5" /> Cảm xúc gần đây
              </h2>
            </div>
            <div className="space-y-3">
              {recentMoods.length === 0 ? (
                <p className="text-sm text-text-soft italic">Chưa có ghi chép nào.</p>
              ) : (
                recentMoods.map(mood => (
                  <div key={mood.id} className="bg-white/70 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-brand-accent text-sm">{mood.mood}</span>
                      {mood.note && <p className="text-xs text-text-soft truncate max-w-[150px] mt-0.5">{mood.note}</p>}
                    </div>
                    <span className="text-[10px] font-bold bg-white px-2 py-1 rounded text-text-soft shadow-sm">
                      {format(parseISO(mood.entry_date), 'dd/MM')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </motion.div>

        {/* Schedules — Cool */}
        <motion.div variants={fadeUp}>
          <Card
            animate={false}
            className="bg-canvas-cool border border-canvas-dark shadow-card hover:shadow-card-hover transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-brand" /> Sắp diễn ra
              </h2>
            </div>
            <div className="space-y-3">
              {upcomingSchedules.length === 0 ? (
                <p className="text-sm text-text-soft italic">Không có sự kiện nào sắp tới.</p>
              ) : (
                upcomingSchedules.map(schedule => {
                  const date = parseISO(schedule.start_time);
                  return (
                    <div key={schedule.id} className="bg-white/70 p-3 rounded-xl flex items-center gap-3">
                      <div className="bg-white rounded-xl p-2 text-center min-w-[48px] shadow-sm border border-canvas-dark">
                        <div className="text-[10px] font-bold text-brand uppercase">{format(date, 'MMM', { locale: vi })}</div>
                        <div className="text-lg font-black text-brand-house leading-none mt-0.5">{format(date, 'dd')}</div>
                      </div>
                      <div>
                        <div className="font-bold text-text-main text-sm">{schedule.title}</div>
                        <div className="text-xs text-text-soft mt-0.5">{format(date, 'HH:mm')}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </motion.div>

        {/* Food — Green */}
        <motion.div variants={fadeUp}>
          <Card
            animate={false}
            className="bg-brand-light/20 border border-brand-light shadow-card hover:shadow-card-hover transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-brand-house flex items-center gap-2">
                <Utensils className="w-5 h-5 text-brand" /> Món ngon chờ thử
              </h2>
            </div>
            <div className="space-y-3">
              {recentFoods.length === 0 ? (
                <p className="text-sm text-text-soft italic">Đã thử hết các món hoặc chưa lưu món nào.</p>
              ) : (
                recentFoods.map(food => (
                  <div key={food.id} className="bg-white/70 p-3 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm overflow-hidden border border-brand-light">
                      {food.image_url ? (
                        <img src={food.image_url} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <Utensils className="w-4 h-4 text-brand" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-text-main text-sm">{food.food_name}</div>
                      <div className="text-xs text-text-soft mt-0.5">{food.district || food.restaurant_name || food.category}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </motion.div>

        {/* Memories — Ceramic */}
        <motion.div className="md:col-span-2" variants={fadeUp}>
          <Card
            animate={false}
            className="bg-canvas-dark border-none shadow-card hover:shadow-card-hover transition-shadow cursor-pointer flex flex-col items-center justify-center py-10"
          >
            <ImageIcon className="w-10 h-10 text-brand mb-3 opacity-80" />
            <h2 className="text-lg font-bold text-brand-house">Album Kỷ Niệm</h2>
            <p className="text-sm text-text-soft mt-1">Lưu giữ những bức ảnh thật đẹp cùng nhau.</p>
          </Card>
        </motion.div>

      </motion.div>
    </motion.div>
  );
};
