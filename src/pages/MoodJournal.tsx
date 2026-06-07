import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useCareSpace } from '../contexts/CareSpaceContext';
import { moodService } from '../services/moodService';
import { adviceService } from '../services/adviceService';
import { MoodEntry, MoodType } from '../types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  Sparkles, 
  Frown, 
  Coffee, 
  Activity, 
  Heart, 
  Leaf, 
  Zap, 
  Clock, 
  Smile, 
  TableProperties, 
  LayoutGrid,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { AnimatedCheck } from '../components/ui/AnimatedCheck';

const REACTION_EMOJIS = ['❤️', '👍', '🥰', '😆', '😮', '🥺', '😢', '😡'];

const MOODS_WITH_ICONS: { name: MoodType; icon: React.ComponentType<{ className?: string }> }[] = [
  { name: 'Hạnh phúc', icon: Sparkles },
  { name: 'Buồn bã', icon: Frown },
  { name: 'Mệt mỏi', icon: Coffee },
  { name: 'Căng thẳng', icon: Activity },
  { name: 'Nhớ người ấy', icon: Heart },
  { name: 'Bình yên', icon: Leaf },
  { name: 'Phấn khích', icon: Zap },
];

const MOOD_STYLES: Record<string, { bg: string; text: string; border: string; iconBg: string; iconColor: string }> = {
  'Hạnh phúc': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600'
  },
  'Bình yên': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600'
  },
  'Buồn bã': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  'Mệt mỏi': {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600'
  },
  'Căng thẳng': {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600'
  },
  'Nhớ người ấy': {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600'
  },
  'Phấn khích': {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600'
  }
};

const getMoodStyle = (mood: string) => {
  return MOOD_STYLES[mood] || {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600'
  };
};

export const MoodJournal = () => {
  const { user } = useAuth();
  const { careSpace, profiles } = useCareSpace();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Form state
  const [selectedMood, setSelectedMood] = useState<MoodType | ''>('');
  const [energyLevel, setEnergyLevel] = useState(5);
  const [note, setNote] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [generatedAdvice, setGeneratedAdvice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [retryingEntryId, setRetryingEntryId] = useState<string | null>(null);
  const [activeReactionPickerId, setActiveReactionPickerId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const data = await moodService.getEntries();
      setEntries(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ghi chép này?')) return;
    try {
      await moodService.deleteEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error deleting entry:', err);
      alert('Không thể xóa ghi chép.');
    }
  };

  const getProfile = (userId: string) => {
    return profiles.find(p => p.user_id === userId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMood || !user || !careSpace) return;
    
    setError('');
    setIsSubmitting(true);
    let advice = '';

    try {
      const userProfile = getProfile(user.id);
      const currentUser = {
        id: user.id,
        display_name: userProfile?.display_name || user.email.split('@')[0],
        email: user.email
      };

      const mappedEntries = entries.map(e => ({
        id: e.id,
        created_by: e.created_by,
        creator_name: getProfile(e.created_by)?.display_name || 'Thành viên khác',
        created_at: e.created_at,
        entry_date: e.entry_date,
        mood: e.mood,
        energy_level: e.energy_level,
        note: e.note,
        gratitude: e.gratitude,
        ai_advice: e.ai_advice
      }));

      const personalRecentEntries = mappedEntries
        .filter(e => e.created_by === user.id)
        .slice(0, 14);

      const sharedRecentEntries = mappedEntries
        .filter(e => e.created_by !== user.id)
        .slice(0, 10);

      if (import.meta.env.DEV) {
        console.debug("[Mood AI Context]", {
          currentUserId: currentUser.id,
          currentUserName: currentUser.display_name,
          personalRecentCount: personalRecentEntries.length,
          sharedRecentCount: sharedRecentEntries.length,
          mood: selectedMood,
          energy_level: energyLevel,
          hasNote: !!note,
          hasGratitude: !!gratitude
        });
      }

      // Maintain legacy mapping for backward compatibility
      const legacyRecentEntries = personalRecentEntries.map(e => ({
        date: e.entry_date,
        mood: e.mood,
        energy: e.energy_level,
        note: e.note,
        gratitude: e.gratitude
      }));

      advice = await adviceService.getAdvice({
        currentUser,
        mood: selectedMood,
        energy_level: energyLevel,
        note,
        gratitude,
        personalRecentEntries,
        sharedRecentEntries,
        recentEntries: legacyRecentEntries,
        variationSeed: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      });
      setGeneratedAdvice(advice);
    } catch (err) {
      console.error(err);
      // No fake fallback advice – just leave empty
      advice = '';
    }

    try {
      const result = await moodService.addEntry({
        care_space_id: careSpace.id,
        created_by: user.id,
        mood: selectedMood,
        energy_level: energyLevel,
        note,
        gratitude,
        ai_advice: advice || undefined,
        entry_date: format(new Date(), 'yyyy-MM-dd')
      });
      
      if (!result) throw new Error("Lưu nhật ký thất bại.");
      
      setSelectedMood('');
      setEnergyLevel(5);
      setNote('');
      setGratitude('');
      loadEntries();
      setIsFormOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi lưu nhật ký.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryAdvice = async (entry: MoodEntry) => {
    if (!user) return;
    setRetryingEntryId(entry.id);
    try {
      const userProfile = getProfile(user.id);
      const currentUser = {
        id: user.id,
        display_name: userProfile?.display_name || user.email.split('@')[0],
        email: user.email
      };

      const mappedEntries = entries.map(e => ({
        id: e.id,
        created_by: e.created_by,
        creator_name: getProfile(e.created_by)?.display_name || 'Thành viên khác',
        created_at: e.created_at,
        entry_date: e.entry_date,
        mood: e.mood,
        energy_level: e.energy_level,
        note: e.note,
        gratitude: e.gratitude,
        ai_advice: e.ai_advice
      }));

      // Exclude current entry when retrying advice to avoid duplicates
      const personalRecentEntries = mappedEntries
        .filter(e => e.created_by === user.id && e.id !== entry.id)
        .slice(0, 14);

      const sharedRecentEntries = mappedEntries
        .filter(e => e.created_by !== user.id && e.id !== entry.id)
        .slice(0, 10);

      if (import.meta.env.DEV) {
        console.debug("[Mood AI Context] Retry", {
          currentUserId: currentUser.id,
          currentUserName: currentUser.display_name,
          personalRecentCount: personalRecentEntries.length,
          sharedRecentCount: sharedRecentEntries.length,
          mood: entry.mood,
          energy_level: entry.energy_level,
          hasNote: !!entry.note,
          hasGratitude: !!entry.gratitude
        });
      }

      // Maintain legacy mapping for backward compatibility
      const legacyRecentEntries = personalRecentEntries.map(e => ({
        date: e.entry_date,
        mood: e.mood,
        energy: e.energy_level,
        note: e.note,
        gratitude: e.gratitude
      }));

      const advice = await adviceService.getAdvice({
        currentUser,
        mood: entry.mood,
        energy_level: entry.energy_level,
        note: entry.note,
        gratitude: entry.gratitude,
        personalRecentEntries,
        sharedRecentEntries,
        recentEntries: legacyRecentEntries,
        variationSeed: `retry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      });

      if (advice) {
        // Update in Supabase
        try {
          await moodService.updateAdvice(entry.id, advice);
        } catch (dbErr) {
          console.warn('[RetryAdvice] DB update failed, updating local only:', dbErr);
        }
        // Update local state
        setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, ai_advice: advice } : e));
      }
    } catch (err) {
      console.error('[RetryAdvice] Failed:', err);
    } finally {
      setRetryingEntryId(null);
    }
  };

  const handleReact = async (entryId: string, emoji: string) => {
    if (!user) return;
    
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    const currentReactions = entry.reactions || {};
    const newReactions = { ...currentReactions };

    if (newReactions[user.id] === emoji) {
      delete newReactions[user.id];
    } else {
      newReactions[user.id] = emoji;
    }

    try {
      // Optimistic update
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, reactions: newReactions } : e));
      await moodService.updateReactions(entryId, newReactions);
    } catch (err) {
      console.error('Failed to update reaction:', err);
      // Revert on failure
      setEntries(prev => prev.map(e => e.id === entryId ? e : e));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand tracking-tight flex items-center gap-3">
            <Heart className="w-8 h-8 text-brand-accent fill-brand-light" />
            Nhật ký cảm xúc
          </h1>
          <p className="text-text-soft mt-2 text-sm max-w-lg leading-relaxed">
            Ghi nhận tâm trạng đều đặn giúp hai bạn hiểu tinh thần, năng lượng của nhau để đồng hành và quan tâm nhau hơn.
          </p>
        </div>
        <Button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-6 py-2.5 rounded-pill font-bold shadow-sm bg-brand text-white hover:bg-brand-accent flex-shrink-0"
        >
          {isFormOpen ? 'Đóng form' : '+ Viết mới'}
        </Button>
      </div>

      {/* Mood Form Card */}
      {isFormOpen && (
        <Card className="bg-white border border-brand-light shadow-card rounded-card overflow-hidden transition-all duration-300">
          <form onSubmit={handleSubmit} className="p-2 space-y-6">
            <h2 className="font-bold text-xl text-text-main border-b border-canvas-cool pb-4 flex items-center gap-2">
              Trang viết mới ✨
            </h2>

            {error && (
              <div className="p-3 mb-2 text-sm text-semantic-destructive bg-semantic-destructive/10 rounded-lg">
                {error}
              </div>
            )}

            {/* Section 1: Tâm trạng hiện tại */}
            <div className="space-y-3">
              <label className="block text-[13px] font-bold text-text-soft uppercase tracking-wider">
                Tâm trạng hiện tại
              </label>
              <div className="flex flex-wrap gap-2">
                {MOODS_WITH_ICONS.map(m => {
                  const Icon = m.icon;
                  const isSelected = selectedMood === m.name;
                  const style = getMoodStyle(m.name);
                  
                  return (
                    <motion.button
                      key={m.name}
                      type="button"
                      onClick={() => setSelectedMood(m.name)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-pill border text-sm font-semibold transition-colors ${
                        isSelected 
                          ? `${style.bg} ${style.text} ${style.border} shadow-md` 
                          : 'bg-white text-text-soft border-canvas-dark hover:border-brand hover:text-text-main'
                      }`}
                      whileTap={{ scale: 0.93 }}
                      animate={isSelected 
                        ? { scale: 1.06, boxShadow: '0 0 0 2px rgba(59,130,246,0.25)' } 
                        : { scale: 1, boxShadow: 'none' }
                      }
                      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? style.iconColor : 'text-text-soft'}`} />
                      {m.name}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Energy Area (2-column layout) */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Box: Energy Level Slider */}
              <div className="bg-gradient-to-br from-brand-light/10 to-canvas-cool p-5 rounded-2xl border border-brand-light/20 flex flex-col justify-between">
                <div>
                  <label className="block text-[13px] font-bold text-text-soft uppercase tracking-wider mb-4">
                    Năng lượng cơ thể ({energyLevel}/10)
                  </label>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={energyLevel}
                    onChange={e => setEnergyLevel(parseInt(e.target.value))}
                    className="w-full accent-brand-accent h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mb-2"
                  />
                </div>
                <div className="flex justify-between text-[11px] font-bold text-text-soft px-1">
                  <span>Cạn kiệt</span>
                  <span>Bình thường</span>
                  <span>Tràn đầy</span>
                </div>
              </div>

              {/* Right Box: Note Textarea */}
              <div className="space-y-2">
                <label className="block text-[13px] font-bold text-text-soft uppercase tracking-wider">
                  Điều gì khiến bạn thấy vậy?
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Hôm nay trời mưa mát mẻ, làm việc cả ngày hơi mệt tí..."
                  className="w-full bg-canvas-cool border border-gray-200 focus:border-brand-accent rounded-2xl p-4 outline-none resize-none h-28 text-text-main text-[15px] transition-colors"
                />
              </div>
            </div>

            {/* Section 3: Lưu giữ sự biết ơn */}
            <div className="space-y-2">
              <label className="block text-[13px] font-bold text-text-soft uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-brand-accent fill-brand-light" />
                Lưu giữ sự biết ơn
              </label>
              <textarea
                value={gratitude}
                onChange={e => setGratitude(e.target.value)}
                placeholder="Biết ơn vì một bữa ăn ngon, một tin nhắn dễ thương..."
                className="w-full bg-canvas-cool border border-gray-200 focus:border-brand-accent rounded-2xl p-4 outline-none resize-none h-20 text-text-main text-[15px] transition-colors"
              />
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-canvas-cool">
              <Button 
                type="button" 
                onClick={() => { setIsFormOpen(false); setSelectedMood(''); }} 
                className="bg-canvas-ceramic text-text-main border border-gray-200 rounded-pill px-6"
              >
                Hủy bỏ
              </Button>
              <Button 
                type="submit" 
                disabled={!selectedMood || isSubmitting}
                className="bg-brand text-white hover:bg-brand-accent rounded-pill px-6 font-bold flex items-center gap-2"
              >
                {isSubmitting ? 'Đang gửi...' : 'Lưu vào nhật ký'}
                {showSuccess && <AnimatedCheck size={16} color="#fff" />}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Generated AI Advice Banner */}
      <AnimatePresence>
        {generatedAdvice && !isFormOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <Card className="bg-gradient-to-br from-brand-light/40 to-[#EFF6FF] border border-brand-light shadow-card rounded-card p-5">
              <div className="flex gap-3">
                <span className="text-xl">✨</span>
                <div>
                  <h4 className="font-bold text-brand-accent text-sm mb-2">Lời nhắn từ Assistant</h4>
                  <p className="text-text-main text-sm leading-relaxed italic">"{generatedAdvice}"</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mood History Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-canvas-cool pb-3">
          <h3 className="text-xl font-bold text-text-main">
            Ghi chép của hai bạn
          </h3>
          
          {/* Segmented Control */}
          <div className="flex bg-canvas-cool p-1 rounded-pill border border-gray-200">
            <button
              onClick={() => setViewMode('card')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-pill text-xs font-bold transition-all ${
                viewMode === 'card' 
                  ? 'bg-white text-brand-accent shadow-sm' 
                  : 'text-text-soft hover:text-text-main'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Card
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-pill text-xs font-bold transition-all ${
                viewMode === 'table' 
                  ? 'bg-white text-brand-accent shadow-sm' 
                  : 'text-text-soft hover:text-text-main'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              Bảng
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-[280px]" />
            <Skeleton className="h-[280px]" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-card border border-brand-light">
            <Smile className="w-12 h-12 text-brand-light mx-auto mb-3" />
            <p className="text-text-soft text-sm">Chưa có ghi chép nào của hai bạn.</p>
          </div>
        ) : (
          <>
            {viewMode === 'card' ? (
              <div className="grid md:grid-cols-2 gap-6">
                {entries.map(entry => {
                  const style = getMoodStyle(entry.mood);
                  const Icon = MOODS_WITH_ICONS.find(m => m.name === entry.mood)?.icon || Smile;
                  const isCurrentUser = entry.created_by === user?.id;
                  const writerProfile = getProfile(entry.created_by);
                  
                  const isExpanded = expandedEntries.has(entry.id);
                  const isLongText = (entry.note?.length || 0) > 80 || (entry.gratitude?.length || 0) > 80 || (entry.ai_advice?.length || 0) > 120;

                  return (
                    <Card key={entry.id} className="bg-white border border-brand-light/35 shadow-card rounded-card flex flex-col justify-between hover:shadow-frap-ambient transition-all">
                      <div className="space-y-4">
                        {/* Top row */}
                        <div className="flex items-center justify-between">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            isCurrentUser 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-brand-light text-brand-house'
                          }`}>
                            {isCurrentUser ? 'Bạn' : (writerProfile?.display_name || 'Nửa kia')}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-text-soft flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-text-soft" />
                              {format(new Date(entry.entry_date), 'dd/MM/yyyy')}
                            </span>
                            {user?.email === 'tienquan0807@gmail.com' && (
                              <button 
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="text-red-400 hover:text-red-600 transition-colors p-1"
                                title="Xóa ghi chép này"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Mood Info Row */}
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${style.iconBg} ${style.iconColor}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className={`text-lg font-bold ${style.text}`}>{entry.mood}</h4>
                            <p className="text-xs font-semibold text-text-soft">Năng lượng: {entry.energy_level}/10</p>
                          </div>
                        </div>

                        {/* Content Block */}
                        {entry.note && (
                          <div className="bg-canvas-cool/60 p-4 rounded-2xl border border-canvas-cool">
                            <span className="text-xs font-bold text-text-soft uppercase tracking-wider block mb-1">Cảm nhận</span>
                            <p className={`text-[14px] text-text-main leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>{entry.note}</p>
                          </div>
                        )}

                        {/* Gratitude Block */}
                        {entry.gratitude && (
                          <div className="bg-brand-light/10 p-4 rounded-2xl border border-brand-light/20">
                            <span className="text-xs font-bold text-brand block mb-1 flex items-center gap-1 uppercase tracking-wider">
                              <Heart className="w-3.5 h-3.5 text-brand fill-brand-light" />
                              Biết ơn
                            </span>
                            <p className={`text-[14px] text-text-main leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>{entry.gratitude}</p>
                          </div>
                        )}

                        {/* Reactions Row */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-canvas-cool/60 relative">
                          {/* Current active reactions list */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {Object.entries(entry.reactions || {}).length > 0 ? (
                              Object.entries(entry.reactions || {}).map(([uid, emoji]) => {
                                const reactorProfile = getProfile(uid);
                                return (
                                  <div
                                    key={uid}
                                    className="inline-flex items-center gap-1 bg-canvas-cool px-2.5 py-1 rounded-full text-xs font-semibold border border-canvas-dark shadow-sm cursor-help group/tooltip relative"
                                  >
                                    <span>{reactorProfile?.avatar_emoji || '👤'}</span>
                                    <span className="text-sm">{emoji}</span>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 hidden group-hover/tooltip:block bg-gray-900/90 text-white text-[10px] font-bold py-1 px-2 rounded shadow-lg whitespace-nowrap z-50">
                                      {reactorProfile?.display_name || 'Thành viên'}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <span className="text-xs text-text-soft italic">Chưa có cảm xúc</span>
                            )}
                          </div>

                          {/* React Trigger & Floating Panel */}
                          <div
                            className="relative"
                            onMouseEnter={() => setActiveReactionPickerId(entry.id)}
                            onMouseLeave={() => setActiveReactionPickerId(null)}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveReactionPickerId(prev => prev === entry.id ? null : entry.id);
                              }}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                entry.reactions?.[user?.id || '']
                                  ? 'bg-brand-light text-brand border-brand-light shadow-sm'
                                  : 'bg-white text-text-soft border-canvas-dark hover:border-brand hover:text-text-main'
                              }`}
                            >
                              <span>{entry.reactions?.[user?.id || ''] || 'Bày tỏ'}</span>
                              <span className="text-brand-accent">✨</span>
                            </button>

                            {/* Floating Reactions Bar (Facebook style) */}
                            <AnimatePresence>
                              {activeReactionPickerId === entry.id && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: -52, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                                  className="absolute right-0 top-0 bg-white border border-canvas-dark shadow-xl rounded-full px-3 py-2 flex items-center gap-2 z-50 whitespace-nowrap"
                                  style={{ transformOrigin: 'bottom right' }}
                                >
                                  {REACTION_EMOJIS.map(emoji => (
                                    <motion.button
                                      key={emoji}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReact(entry.id, emoji);
                                        setActiveReactionPickerId(null);
                                      }}
                                      whileHover={{ scale: 1.35 }}
                                      whileTap={{ scale: 0.93 }}
                                      className="text-xl transition-transform hover:-translate-y-1 block p-0.5"
                                    >
                                      {emoji}
                                    </motion.button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-canvas-cool flex flex-col items-start">
                        {/* AI Advice Block */}
                        {entry.ai_advice ? (
                          <div className={`text-xs text-text-soft italic leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>
                            "{entry.ai_advice}"
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-muted italic">AI chưa phản hồi được lúc này. Nhật ký của bạn vẫn đã được lưu.</span>
                            <button
                              onClick={() => handleRetryAdvice(entry)}
                              disabled={retryingEntryId === entry.id}
                              className="inline-flex items-center gap-1 text-xs font-medium text-brand-accent hover:text-brand transition-colors disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3 h-3 ${retryingEntryId === entry.id ? 'animate-spin' : ''}`} />
                              {retryingEntryId === entry.id ? 'Đang tạo...' : 'Tạo lại lời khuyên'}
                            </button>
                          </div>
                        )}
                        
                        {isLongText && (
                          <button 
                            onClick={() => toggleExpand(entry.id)}
                            className="mt-3 text-xs font-bold text-brand-accent hover:underline focus:outline-none"
                          >
                            {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                          </button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border border-brand-light/35 shadow-card rounded-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[14px]">
                    <thead>
                      <tr className="border-b border-canvas-cool bg-canvas-cool/50 text-text-soft font-bold uppercase tracking-wider text-xs">
                        <th className="p-4">Người viết</th>
                        <th className="p-4">Ngày</th>
                        <th className="p-4">Tâm trạng</th>
                        <th className="p-4">Năng lượng</th>
                        <th className="p-4">Cảm nhận</th>
                        <th className="p-4">Biết ơn</th>
                        {user?.email === 'tienquan0807@gmail.com' && <th className="p-4">Thao tác</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map(entry => {
                        const isCurrentUser = entry.created_by === user?.id;
                        const writerProfile = getProfile(entry.created_by);
                        const style = getMoodStyle(entry.mood);
                        
                        return (
                          <tr key={entry.id} className="border-b border-canvas-cool/50 hover:bg-canvas-cool/20 transition-colors">
                            <td className="p-4 font-bold text-text-main">
                              {isCurrentUser ? 'Bạn' : (writerProfile?.display_name || 'Nửa kia')}
                            </td>
                            <td className="p-4 text-text-soft">
                              {format(new Date(entry.entry_date), 'dd/MM/yyyy')}
                            </td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${style.bg} ${style.text} ${style.border}`}>
                                {entry.mood}
                              </span>
                            </td>
                            <td className="p-4 font-bold text-text-main">
                              {entry.energy_level}/10
                            </td>
                            <td className="p-4 text-text-main max-w-xs truncate" title={entry.note}>
                              {entry.note || '-'}
                            </td>
                            <td className="p-4 text-text-main max-w-xs truncate" title={entry.gratitude}>
                              {entry.gratitude || '-'}
                            </td>
                            {user?.email === 'tienquan0807@gmail.com' && (
                              <td className="p-4">
                                <button 
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="text-red-400 hover:text-red-600 transition-colors p-1"
                                  title="Xóa ghi chép này"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
