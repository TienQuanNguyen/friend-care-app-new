import React, { useEffect, useState } from 'react';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { useCareSpace } from '../contexts/CareSpaceContext';
import { Smile, Calendar as CalendarIcon, Heart, Users, Flame, Utensils, Image as ImageIcon, Sparkles, X, RefreshCw, Disc, Disc3, Plus, ExternalLink, Music, Trash2, MoreHorizontal } from 'lucide-react';
import { moodService } from '../services/moodService';
import { scheduleService } from '../services/scheduleService';
import { foodService } from '../services/foodService';
import { musicService } from '../services/musicService';
import { memoryService } from '../services/memoryService';
import { loveNoteService } from '../services/loveNoteService';
import { MoodEntry, Schedule, FoodPlace, MusicNote, Memory, LoveNote } from '../types';
import { format, parseISO, isToday } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AnimatedCheck } from '../components/ui/AnimatedCheck';
import { MiniConfetti } from '../components/ui/MiniConfetti';
import { useAuth } from '../contexts/AuthContext';
import { useStreak } from '../hooks/useStreak';

const stagger: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08 } },
};
const fadeUp: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

type MemoryFramePosition = {
  x: number;
  y: number;
};

const DEFAULT_MEMORY_FRAME_POSITION: MemoryFramePosition = { x: 0, y: 0 };
const MEMORY_FRAME_POSITIONS_STORAGE_KEY = 'friendcare_memory_frame_positions';
const clampMemoryFramePosition = (value: number) => Math.max(-35, Math.min(35, value));
const MEMORY_REACTION_EMOJIS = ['❤️', '👍', '🥰', '😆', '😮', '🥺', '😏'];

const loadStoredMemoryFramePositions = (): Record<string, MemoryFramePosition> => {
  try {
    const rawPositions = localStorage.getItem(MEMORY_FRAME_POSITIONS_STORAGE_KEY);
    if (!rawPositions) return {};

    const parsedPositions = JSON.parse(rawPositions) as Record<string, Partial<MemoryFramePosition>>;
    return Object.fromEntries(
      Object.entries(parsedPositions)
        .filter(([, position]) => typeof position.x === 'number' && typeof position.y === 'number')
        .map(([id, position]) => [
          id,
          {
            x: clampMemoryFramePosition(position.x as number),
            y: clampMemoryFramePosition(position.y as number),
          },
        ])
    );
  } catch {
    return {};
  }
};

const DAILY_MESSAGES = [
  "Tui thấy hôm nay trời khá dễ chịu, tự nhiên nghĩ chắc Duyên sẽ thích kiểu thời tiết này.",
  "Nếu hôm nay có hơi nhiều việc, sd cứ xử lý từng chút một thôi, không cần gồng hết trong một lần.",
  "Tui lưu lại vài món muốn thử vì nghĩ có món chắc Diên sẽ thấy hợp gu hơn tui.",
  "Hôm nay nếu có đoạn nào mệt, mong bạn vẫn tìm được một khoảng nhỏ để thở ra nhẹ một chút.",
  "Tự nhiên nhớ ra có lần bạn nói thích mấy ngày trời dịu dịu như vầy.",
  "Không có gì đặc biệt đâu, chỉ là thấy app hơi trống nên để lại một dấu vết nhỏ.",
  "Nếu hôm nay bạn mở app lúc đang mệt, coi như đây là lời nhắc: nghỉ vài phút cũng không sao.",
  "Tui nghĩ có những ngày không cần quá năng suất, chỉ cần mình qua ngày ổn là được.",
  "Hôm nay nếu có chuyện gì khó chịu, cứ để nó nằm gọn trong ngày hôm nay thôi, đừng mang hết sang ngày mai.",
  "Tui thấy mấy điều nhỏ nhỏ đôi khi lại làm một ngày đỡ nặng hơn, nên để lại câu này ở đây.",
  "Có vài ngày chỉ cần một tin nhắn nhỏ hoặc một ghi chú nhỏ là đủ thấy mình vẫn được nhớ tới.",
  "Tui không có gì cần nhắc, chỉ muốn để lại một câu cho app bớt im lặng...",
  "Hôm nay cứ chậm lại một chút cũng được, không phải lúc nào cũng cần chạy nhanh.",
  "Tự nhiên nghĩ chắc nếu có một quán yên yên, tụi mình ngồi nói linh tinh cũng ổn.",
  "Nếu hôm nay vui thì lưu lại một chút, còn nếu không vui thì cũng không cần ép mình phải ổn ngay.",
  "Có những ngày không cần làm gì lớn, chỉ cần còn giữ được một chút bình tĩnh là tốt rồi.",
  "Tình bạn diệu kỳ là khi chúng ta chấp nhận sự không hoàn hảo của nhau. Hãy cùng nhau tạo thêm những kỷ niệm đẹp nhé.",
  "Nếu hôm nay buồn quá có thể rủ tao đi nhậu kkk",
  "Tui để lại câu này như một cái gõ cửa nhẹ: bạn vẫn đang làm ổn hơn bạn nghĩ đó.",
  "Nếu hôm nay bạn thấy hơi rối, thử chọn một việc nhỏ nhất để làm trước thôi.",
  "Không cần trả lời gì đâu, đọc được thì coi như có người vừa ghé ngang không gian chung này.",
  "Tình bạn diệu kỳ nhỉ, 10 năm qua vẫn ở đây bên, vẫn lắng nghe nhau, đôi lần trắc trở nhiều chút chút, ...",
  "Hmmmmm, Sơn Duyên ngày mới dui nhe",
  "Thấy Tiến Quân đẹp trai không? Có or Yes?"
];

export function SpinningVinylIcon() {
  return (
    <div className="h-[42px] w-[42px] shrink-0 rounded-full bg-emerald-50 flex items-center justify-center">
      <div className="vinyl-spin relative flex items-center justify-center">
        <Disc3 className="h-5 w-5 text-emerald-700" strokeWidth={2.2} />
        <span className="absolute h-1.5 w-1.5 rounded-full bg-emerald-700/70" />
      </div>
    </div>
  );
}

export const Dashboard = () => {
  const { user } = useAuth();
  const { careSpace, profiles } = useCareSpace();
  const { status: streakStatus, loading: streakLoading } = useStreak();
  const currentStreak = streakStatus?.currentStreak ?? 0;
  const [recentMoods, setRecentMoods] = useState<MoodEntry[]>([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState<Schedule[]>([]);
  const [recentFoods, setRecentFoods] = useState<FoodPlace[]>([]);

  // Memories state
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isUploadingMemory, setIsUploadingMemory] = useState(false);
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null);
  const [memoryFramePositions, setMemoryFramePositions] = useState<Record<string, MemoryFramePosition>>(
    () => loadStoredMemoryFramePositions()
  );
  const [isDraggingMemoryFrame, setIsDraggingMemoryFrame] = useState(false);
  const [activeMemoryReactionPickerId, setActiveMemoryReactionPickerId] = useState<string | null>(null);
  const [isMemoryListModalOpen, setIsMemoryListModalOpen] = useState(false);
  const memoryFileInputRef = React.useRef<HTMLInputElement>(null);
  const memoryFrameDragRef = React.useRef<{
    id: string;
    startX: number;
    startY: number;
    origin: MemoryFramePosition;
    width: number;
    height: number;
  } | null>(null);

  // Music notes state
  const [todayMusicSlots, setTodayMusicSlots] = useState<MusicNote[]>([]);
  const [musicHistory, setMusicHistory] = useState<MusicNote[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Add form fields
  const [musicSpotifyUrl, setMusicSpotifyUrl] = useState('');
  const [musicNote, setMusicNote] = useState('');
  const [isSavingMusic, setIsSavingMusic] = useState(false);
  const [musicError, setMusicError] = useState('');
  const [urlWarning, setUrlWarning] = useState('');

  const formRef = React.useRef<HTMLDivElement>(null);

  // Daily Mood Check-in state
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [isSavingMood, setIsSavingMood] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    localStorage.setItem(MEMORY_FRAME_POSITIONS_STORAGE_KEY, JSON.stringify(memoryFramePositions));
  }, [memoryFramePositions]);

  const loadMusicData = async () => {
    try {
      const today = await musicService.getTodayMusicByUser();
      setTodayMusicSlots(today);
      if (today.length > 0) {
        // Safe check for index bounds
        setActiveIndex(prev => (prev < today.length ? prev : 0));
      }
    } catch (err) {
      console.error('Error loading today music:', err);
    }
  };

  const loadMusicHistory = async () => {
    try {
      const history = await musicService.getMusicNotes();
      setMusicHistory(history);
    } catch (err) {
      console.error('Error loading music history:', err);
    }
  };

  const openHistory = () => {
    setShowHistoryModal(true);
    loadMusicHistory();
  };

  const handleUrlChange = (value: string) => {
    setMusicSpotifyUrl(value);
    if (!value.trim()) {
      setUrlWarning('');
      return;
    }
    if (!value.startsWith('https://')) {
      setUrlWarning('Link nên bắt đầu bằng https://');
    } else if (!value.includes('spotify.com')) {
      setUrlWarning('Nên sử dụng link từ open.spotify.com');
    } else {
      setUrlWarning('');
    }
  };

  const handleSaveMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicSpotifyUrl.trim()) {
      setMusicError('Vui lòng nhập Link Spotify.');
      return;
    }

    setIsSavingMusic(true);
    setMusicError('');

    try {
      const newNote = await musicService.createMusicNote({
        title: "Bài nhạc đã chia sẻ",
        spotify_url: musicSpotifyUrl.trim() || undefined,
        note: musicNote.trim() || undefined,
      });

      if (newNote) {
        setMusicSpotifyUrl('');
        setMusicNote('');
        setShowAddForm(false);
        setUrlWarning('');

        const today = await musicService.getTodayMusicByUser();
        setTodayMusicSlots(today);

        if (user) {
          const index = today.findIndex(n => n.created_by === user.id);
          if (index !== -1) {
            setActiveIndex(index);
          } else {
            setActiveIndex(0);
          }
        } else {
          setActiveIndex(0);
        }
      }
    } catch (err: any) {
      console.error(err);
      setMusicError(err.message || 'Lưu bài nhạc thất bại. Vui lòng thử lại.');
    } finally {
      setIsSavingMusic(false);
    }
  };

  const handleDeleteMusic = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài nhạc này?')) return;
    try {
      await musicService.deleteMusicNote(id);
      await loadMusicData();
      await loadMusicHistory();
    } catch (err) {
      alert('Xóa bài nhạc thất bại.');
    }
  };

  useEffect(() => {
    if (showAddForm) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [showAddForm]);

  const handleMemoryFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('File này chưa phải ảnh hợp lệ.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Ảnh hơi nặng, bạn chọn ảnh dưới 10MB nhé.');
      return;
    }

    if (!careSpace || !user) return;

    setIsUploadingMemory(true);
    try {
      const url = await memoryService.uploadMemoryImage(file, careSpace.id, user.id);
      if (url) {
        const newMemory = await memoryService.addMemory({
          care_space_id: careSpace.id,
          created_by: user.id,
          title: 'Kỷ niệm mới',
          image_url: url,
        });
        
        if (newMemory) {
          setMemories(prev => [newMemory, ...prev]);
          setActiveMemoryId(newMemory.id);
          setMemoryFramePositions(prev => ({
            ...prev,
            [newMemory.id]: DEFAULT_MEMORY_FRAME_POSITION,
          }));
        }
      } else {
        alert('Có lỗi khi tải ảnh lên, vui lòng thử lại.');
      }
    } catch (error) {
      console.error(error);
      alert('Tải ảnh thất bại.');
    } finally {
      setIsUploadingMemory(false);
    }
  };

  const handleMemoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleMemoryFile(file);
    }
    e.target.value = '';
  };

  const handleMemoryDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file && !isUploadingMemory) {
      void handleMemoryFile(file);
    }
  };

  const startMemoryFrameDrag = (event: React.PointerEvent<HTMLDivElement>, memoryId?: string) => {
    if (!memoryId || isUploadingMemory) return;

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    memoryFrameDragRef.current = {
      id: memoryId,
      startX: event.clientX,
      startY: event.clientY,
      origin: memoryFramePositions[memoryId] || DEFAULT_MEMORY_FRAME_POSITION,
      width: rect.width || 1,
      height: rect.height || 1,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDraggingMemoryFrame(true);
  };

  const handleMemoryFrameDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = memoryFrameDragRef.current;
    if (!drag) return;

    const dx = ((event.clientX - drag.startX) / drag.width) * 70;
    const dy = ((event.clientY - drag.startY) / drag.height) * 70;

    setMemoryFramePositions(prev => ({
      ...prev,
      [drag.id]: {
        x: clampMemoryFramePosition(drag.origin.x + dx),
        y: clampMemoryFramePosition(drag.origin.y + dy),
      },
    }));
  };

  const stopMemoryFrameDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!memoryFrameDragRef.current) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    memoryFrameDragRef.current = null;
    setIsDraggingMemoryFrame(false);
  };

  const resetMemoryFramePosition = (event: React.MouseEvent, memoryId: string) => {
    event.stopPropagation();
    setMemoryFramePositions(prev => ({
      ...prev,
      [memoryId]: DEFAULT_MEMORY_FRAME_POSITION,
    }));
  };

  const handleDeleteMemory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh này?')) return;
    
    try {
      const success = await memoryService.deleteMemory(id);
      if (success) {
        setMemories(prev => prev.filter(m => m.id !== id));
        setMemoryFramePositions(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        if (activeMemoryId === id) {
          setActiveMemoryId(null);
        }
      } else {
        alert('Có lỗi xảy ra khi xóa ảnh.');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleMemoryReact = async (memoryId: string, emoji: string) => {
    if (!user) return;

    const memory = memories.find(item => item.id === memoryId);
    if (!memory) return;

    const currentReactions = memory.reactions || {};
    const nextReactions = { ...currentReactions };

    if (nextReactions[user.id] === emoji) {
      delete nextReactions[user.id];
    } else {
      nextReactions[user.id] = emoji;
    }

    setMemories(prev => prev.map(item => (
      item.id === memoryId ? { ...item, reactions: nextReactions } : item
    )));

    const success = await memoryService.updateReactions(memoryId, nextReactions);
    if (!success) {
      setMemories(prev => prev.map(item => (
        item.id === memoryId ? { ...item, reactions: currentReactions } : item
      )));
    }
  };

  // Welcome Modal state
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [dailyMessage, setDailyMessage] = useState<string>('');
  const [todayLoveNotes, setTodayLoveNotes] = useState<LoveNote[]>([]);
  const [currentLoveNoteIndex, setCurrentLoveNoteIndex] = useState(0);

  const pickRandomMessage = (notesList?: LoveNote[]) => {
    const listToUse = notesList !== undefined ? notesList : todayLoveNotes;
    if (listToUse.length > 0) {
      setCurrentLoveNoteIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % listToUse.length;
        setDailyMessage(listToUse[nextIndex].message);
        return nextIndex;
      });
    } else {
      setDailyMessage(prev => {
        let newMsg = '';
        do {
          newMsg = DAILY_MESSAGES[Math.floor(Math.random() * DAILY_MESSAGES.length)];
        } while (newMsg === prev && DAILY_MESSAGES.length > 1);
        return newMsg;
      });
    }
  };

  useEffect(() => {
    const hasSeen = localStorage.getItem('friendcare_has_seen_welcome_son_duyen');
    if (!hasSeen) {
      setTimeout(() => setShowWelcomeModal(true), 500);
    }
  }, []);

  const closeWelcomeModal = () => {
    setShowWelcomeModal(false);
    localStorage.setItem('friendcare_has_seen_welcome_son_duyen', 'true');
  };

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

    loveNoteService.getNotes().then(data => {
      const todayNotes = data.filter(n => 
        isToday(parseISO(n.created_at)) && 
        n.message !== 'Đã ghé thăm không gian ❤️'
      );
      setTodayLoveNotes(todayNotes);
      if (todayNotes.length > 0) {
        setDailyMessage(todayNotes[0].message);
        setCurrentLoveNoteIndex(0);
      } else {
        // Fallback to random default message
        setDailyMessage(prev => {
          let newMsg = '';
          do {
            newMsg = DAILY_MESSAGES[Math.floor(Math.random() * DAILY_MESSAGES.length)];
          } while (newMsg === prev && DAILY_MESSAGES.length > 1);
          return newMsg;
        });
      }
    });

    foodService.getPlaces().then(data => setRecentFoods(data.filter(f => !f.tried).slice(0, 2)));
    scheduleService.getSchedules().then(data => {
      const now = new Date();
      const upcoming = data.filter(s => new Date(s.start_time) >= now).slice(0, 2);
      setUpcomingSchedules(upcoming);
    });

    memoryService.getMemories().then(data => setMemories(data));

    loadMusicData();
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

  const activeMemory = memories.find(m => m.id === activeMemoryId) || memories[0];

  return (
    <motion.div className="space-y-6 max-w-5xl mx-auto" variants={stagger} initial="initial" animate="animate">
      {/* Header */}
      <motion.section className="text-center mb-8 flex flex-col items-center justify-center" variants={fadeUp}>
        {/* Streak Badge */}
        <div className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1 bg-amber-50/90 border border-amber-200/80 rounded-pill text-xs font-bold text-amber-900 shadow-sm mb-3 transition-transform hover:scale-105 select-none">
          <Flame className="w-4 h-4 text-orange-500 fill-orange-400 shrink-0" />
          <span>{streakLoading ? '–' : `${currentStreak} ngày`}</span>
        </div>

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
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold tracking-wide text-brand-light">Lời nhắn hôm nay</h3>
                <button
                  onClick={() => pickRandomMessage()}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center text-brand-light hover:text-white"
                  title="Đổi lời nhắn khác"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <p className="text-white/90 text-sm leading-relaxed font-medium">
                "{dailyMessage}"
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Bài nhạc hôm nay */}
      <motion.div variants={fadeUp}>
        <div className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] relative overflow-hidden mb-6">
          {/* Card Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <SpinningVinylIcon />
              <h2 className="text-[17px] md:text-[19px] font-extrabold text-[#111827]">
                Bài nhạc hôm nay
              </h2>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3 ml-auto">
              {todayMusicSlots.length > 1 && (
                <div className="flex gap-1.5 items-center mr-1">
                  {todayMusicSlots.map((slot, index) => (
                    <button
                      key={slot.id}
                      onClick={() => setActiveIndex(index)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === activeIndex ? 'w-4 bg-brand' : 'w-1.5 bg-[#e5e5e5] hover:bg-gray-300'
                      }`}
                      title={`Bài nhạc của ${profiles.find(p => p.user_id === slot.created_by)?.display_name || slot.creator_name || 'thành viên'}`}
                    />
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-[#e6f4ea] hover:bg-[#d0ebd6] text-[#1e7e34] font-bold px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[13px] md:text-sm transition-colors shadow-sm whitespace-nowrap"
              >
                + Thêm bài nhạc
              </button>
            </div>
          </div>

          {/* Card Body / Carousel */}
          {todayMusicSlots.length === 0 ? (
            <div className="text-center py-6 text-text-soft">
              <p className="text-sm italic">Chưa có bài nhạc nào hôm nay. Để lại một bài cho không gian chung bớt im lặng nhé.</p>
            </div>
          ) : (
            <div className="relative">
              <AnimatePresence mode="wait">
                {todayMusicSlots[activeIndex] && (() => {
                  const activeSlot = todayMusicSlots[activeIndex];
                  const d = new Date(activeSlot.created_at);
                  const formattedDate = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                  const creatorName = profiles.find(p => p.user_id === activeSlot.created_by)?.display_name || activeSlot.creator_name || 'Thành viên';
                  
                  let embedUrl = activeSlot.spotify_url;
                  try {
                    if (embedUrl && embedUrl.includes('open.spotify.com/track/')) {
                      const trackId = embedUrl.split('/track/')[1].split('?')[0];
                      embedUrl = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`;
                    }
                  } catch (e) {
                    // Ignore
                  }

                  return (
                    <motion.div
                      key={activeSlot.id}
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-3"
                    >
                      {/* Spotify Embed or Link */}
                      {embedUrl ? (
                        <div className="rounded-[16px] overflow-hidden w-full relative">
                           <iframe 
                             src={embedUrl} 
                             width="100%" 
                             height="152" 
                             frameBorder="0" 
                             allowFullScreen={false} 
                             allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                             loading="lazy"
                             className="block bg-[#282828]"
                           ></iframe>
                        </div>
                      ) : (
                        <div className="bg-canvas-cool/40 border border-canvas-dark/50 rounded-2xl p-4 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-text-main text-base md:text-lg leading-snug truncate">
                              {activeSlot.title}
                            </h3>
                            {activeSlot.artist && (
                              <p className="text-sm text-brand-accent font-semibold truncate mt-0.5">
                                {activeSlot.artist}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Note if exists */}
                      {activeSlot.note && (
                        <p className="text-[13px] italic text-text-soft leading-relaxed px-1">
                          "{activeSlot.note}"
                        </p>
                      )}
                      
                      {/* Creator info */}
                      <div className="text-[12px] font-bold text-[#6b7280] px-1 mt-2">
                        {creatorName} &bull; {formattedDate}
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          )}

          {/* Add Music Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                ref={formRef}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-canvas-ceramic mt-4 pt-4 overflow-hidden"
              >
                <form onSubmit={handleSaveMusic} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-text-soft uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Link Spotify *</span>
                      {urlWarning && <span className="text-[10px] text-amber-600 font-semibold">{urlWarning}</span>}
                    </label>
                    <input
                      type="text"
                      value={musicSpotifyUrl}
                      onChange={e => handleUrlChange(e.target.value)}
                      placeholder="https://open.spotify.com/track/..."
                      required
                      className="w-full bg-white border border-canvas-dark rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-soft uppercase tracking-wider mb-1">Ghi chú</label>
                    <textarea
                      value={musicNote}
                      onChange={e => setMusicNote(e.target.value)}
                      placeholder="Một lời nhắn nhỏ gửi kèm bài nhạc..."
                      rows={2}
                      className="w-full bg-white border border-canvas-dark rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand transition-colors resize-none"
                    />
                  </div>

                  {musicError && (
                    <div className="text-xs text-semantic-destructive bg-semantic-destructive/10 p-2.5 rounded-lg font-medium">
                      {musicError}
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setMusicSpotifyUrl('');
                        setMusicNote('');
                        setMusicError('');
                        setUrlWarning('');
                      }}
                      className="px-4 py-2 border border-canvas-dark rounded-xl text-xs font-bold text-text-soft hover:bg-gray-50 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingMusic}
                      className="bg-brand hover:bg-brand-accent text-white font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {isSavingMusic ? 'Đang lưu...' : 'Lưu bài nhạc'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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

        {/* Memories photo frame */}
        <motion.div className="md:col-span-2" variants={fadeUp}>
          <input 
            type="file" 
            accept="image/*" 
            ref={memoryFileInputRef} 
            className="hidden" 
            onChange={handleMemoryImageUpload} 
          />
          
          {(() => {
            const activeMemory = memories.find(m => m.id === activeMemoryId) || memories[0];
            const frameImage = activeMemory?.image_url;
            const framePosition = activeMemory
              ? memoryFramePositions[activeMemory.id] || DEFAULT_MEMORY_FRAME_POSITION
              : DEFAULT_MEMORY_FRAME_POSITION;
            const objectPosition = `${50 - framePosition.x}% ${50 - framePosition.y}%`;
            
            return (
              <div className="w-full pt-2 pb-4">
                <div className="mx-auto max-w-[740px]">
                  <div className="relative rotate-[-1.5deg] bg-white p-2.5 md:p-3 shadow-[0_18px_45px_rgba(15,23,42,0.16)] ring-1 ring-black/10">
                    <div
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={handleMemoryDrop}
                      onPointerDown={(event) => startMemoryFrameDrag(event, activeMemory?.id)}
                      onPointerMove={handleMemoryFrameDrag}
                      onPointerUp={stopMemoryFrameDrag}
                      onPointerCancel={stopMemoryFrameDrag}
                      className={`relative aspect-[4/3] w-full overflow-hidden bg-canvas-dark ring-1 ring-black/10 ${
                        frameImage
                          ? `${isDraggingMemoryFrame ? 'cursor-grabbing' : 'cursor-grab'} touch-none`
                          : ''
                      } ${isUploadingMemory ? 'pointer-events-none opacity-70' : ''}`}
                    >
                      {frameImage ? (
                        <img
                          src={frameImage}
                          alt={activeMemory?.title || 'Album Kỷ Niệm'}
                          draggable={false}
                          className="h-full w-full select-none object-cover"
                          style={{ objectPosition }}
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-canvas-cool via-white to-brand-light/40 text-center">
                          <ImageIcon className="mb-3 h-10 w-10 text-brand opacity-80" />
                          <h2 className="text-lg font-extrabold text-brand-house">Album Kỷ Niệm</h2>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!isUploadingMemory) memoryFileInputRef.current?.click();
                            }}
                            className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white shadow-card transition-colors hover:bg-brand-accent"
                          >
                            <Plus className="h-4 w-4" />
                            Thêm ảnh
                          </button>
                        </div>
                      )}

                      {frameImage && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
                      )}

                      {isUploadingMemory && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/65 backdrop-blur-[2px]">
                          <RefreshCw className="h-8 w-8 animate-spin text-brand" />
                        </div>
                      )}

                      <div
                        className="absolute right-3 top-3 z-30 flex items-center gap-2"
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!isUploadingMemory) memoryFileInputRef.current?.click();
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-brand shadow-card ring-1 ring-black/5 transition-colors hover:bg-brand-light"
                          title="Thêm ảnh"
                          aria-label="Thêm ảnh"
                        >
                          <Plus className="h-4 w-4" />
                        </button>

                        {activeMemory && (
                          <>
                            <button
                              type="button"
                              onClick={(event) => resetMemoryFramePosition(event, activeMemory.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-brand-house shadow-card ring-1 ring-black/5 transition-colors hover:bg-canvas-dark"
                              title="Căn giữa"
                              aria-label="Căn giữa"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => handleDeleteMemory(event, activeMemory.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-semantic-destructive shadow-card ring-1 ring-black/5 transition-colors hover:bg-red-50"
                              title="Xóa ảnh"
                              aria-label="Xóa ảnh"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {activeMemory && (() => {
                    const reactions = activeMemory.reactions || {};
                    const groupedReactions = Object.entries(reactions).reduce<Record<string, string[]>>((acc, [uid, emoji]) => {
                      acc[emoji] = [...(acc[emoji] || []), uid];
                      return acc;
                    }, {});
                    const myReaction = user ? reactions[user.id] : undefined;

                    return (
                      <div className="relative mt-3 flex flex-wrap items-center justify-center gap-2">
                        {Object.entries(groupedReactions).map(([emoji, userIds]) => (
                          <div key={emoji} className="relative group/tooltip">
                            <button
                              type="button"
                              onClick={() => void handleMemoryReact(activeMemory.id, emoji)}
                              className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-sm font-bold shadow-sm transition-all ${
                                myReaction === emoji
                                  ? 'border-brand bg-brand-light text-brand-house'
                                  : 'border-canvas-dark bg-white text-text-main hover:border-brand-light'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className={`text-[11px] font-semibold ${
                                myReaction === emoji ? 'text-brand-house/90' : 'text-text-soft'
                              }`}>
                                {userIds
                                  .map(uid => uid === user?.id ? 'Bạn' : (profiles.find(p => p.user_id === uid)?.display_name || 'Nửa kia'))
                                  .join(', ')}
                              </span>
                            </button>

                            {/* Custom Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 hidden group-hover/tooltip:block bg-gray-900/90 text-white text-[10px] font-bold py-1 px-2.5 rounded shadow-lg whitespace-nowrap z-50 pointer-events-none">
                              {userIds
                                .map(uid => profiles.find(profile => profile.user_id === uid)?.display_name || 'Thành viên')
                                .join(', ')}
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => setActiveMemoryReactionPickerId(current => (
                            current === activeMemory.id ? null : activeMemory.id
                          ))}
                          className="inline-flex h-8 items-center gap-1 rounded-full border border-canvas-dark bg-white px-3 text-xs font-extrabold text-brand-house shadow-sm transition-colors hover:border-brand-light hover:bg-brand-light/25"
                        >
                          Bày tỏ ✨
                        </button>



                        <AnimatePresence>
                          {activeMemoryReactionPickerId === activeMemory.id && (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.96 }}
                              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                              className="absolute bottom-10 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-canvas-dark bg-white px-3 py-2 shadow-xl"
                            >
                              {MEMORY_REACTION_EMOJIS.map(emoji => (
                                <motion.button
                                  key={emoji}
                                  type="button"
                                  onClick={() => {
                                    void handleMemoryReact(activeMemory.id, emoji);
                                    setActiveMemoryReactionPickerId(null);
                                  }}
                                  whileHover={{ scale: 1.35 }}
                                  whileTap={{ scale: 0.93 }}
                                  className="block p-0.5 text-xl transition-transform hover:-translate-y-1"
                                >
                                  {emoji}
                                </motion.button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })()}

                  {memories.length > 1 && (
                    <div className="mt-4 flex items-center justify-center gap-2 px-1 pb-1">
                      {memories.slice(0, 3).map(memory => (
                        <button
                          key={memory.id}
                          type="button"
                          onClick={() => setActiveMemoryId(memory.id)}
                          className={`h-11 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-white shadow-sm transition-all ${
                            activeMemory?.id === memory.id
                              ? 'border-brand scale-105'
                              : 'border-white hover:border-brand-light'
                          }`}
                          title={memory.title}
                          aria-label={memory.title}
                        >
                          {memory.image_url ? (
                            <img
                              src={memory.image_url}
                              alt=""
                              className="h-full w-full object-cover"
                              draggable={false}
                            />
                          ) : (
                            <ImageIcon className="mx-auto h-full w-4 text-brand" />
                          )}
                        </button>
                      ))}

                      {memories.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setIsMemoryListModalOpen(true)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-canvas-dark bg-white text-text-soft shadow-sm transition-colors hover:border-brand-light hover:bg-brand-light/25"
                          title="Xem tất cả kỷ niệm"
                          aria-label="Xem tất cả kỷ niệm"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          

        </motion.div>

      </motion.div>

      {/* Welcome Modal for Sơn Duyên */}
      <AnimatePresence>
        {showWelcomeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative"
            >
              <button
                onClick={closeWelcomeModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-brand-accent" />
                </div>
                <h2 className="text-2xl font-bold text-brand mb-2">Gửi Sơn Duyên!</h2>
              </div>

              <div className="space-y-4 text-text-main text-[15px] leading-relaxed mb-8">
                <p>Hello Sơn Duyên - một người đáng ghétt,</p>
                <p>Không biết nói sao nữa nhưng thời gian tới quý khách về Việt Nam tôi tạo viết ra một cái web nho nhỏ này và còn nhiều thiếu xót (như tui vậy).</p>
                <p>Mong quý khách sẽ trải nghiệm tốt thời gian này và có nhiều kỉ niệm đáng nhớ tại Việt Nam heheee.</p>
                <p>Nếu có thắc mắc hoặc phàn nàn xin liên hệ: __ntquan</p>
                <p className="font-bold text-brand-accent pt-2">Thân tặng và ghét nhiều lắm<br />Tiến Quân</p>
              </div>

              <button
                onClick={closeWelcomeModal}
                className="w-full bg-brand text-white font-bold py-3 px-4 rounded-xl hover:bg-brand-accent transition-colors"
              >
                Bắt đầu trải nghiệm thôi!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Memory List Modal */}
      <AnimatePresence>
        {isMemoryListModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-5 md:p-6 max-w-lg w-full shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              <button
                type="button"
                onClick={() => setIsMemoryListModalOpen(false)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-canvas-dark text-text-soft hover:text-text-main transition-colors hover:bg-canvas-dark/80"
                title="Đóng"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="text-lg font-extrabold text-brand-house mb-4 pr-8">
                Tất cả kỷ niệm ({memories.length})
              </h3>

              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-3 gap-3">
                {memories.map(memory => (
                  <button
                    key={memory.id}
                    type="button"
                    onClick={() => {
                      setActiveMemoryId(memory.id);
                      setIsMemoryListModalOpen(false);
                    }}
                    className={`relative aspect-[4/3] w-full overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-all group ${
                      activeMemory?.id === memory.id
                        ? 'border-brand scale-[1.02]'
                        : 'border-canvas-dark hover:border-brand-light'
                    }`}
                  >
                    {memory.image_url ? (
                      <img
                        src={memory.image_url}
                        alt={memory.title || "Kỷ niệm"}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-canvas-dark">
                        <ImageIcon className="h-6 w-6 text-brand" />
                      </div>
                    )}
                    {memory.title && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-1.5 pt-4 text-left">
                        <span className="block truncate text-[10px] font-bold text-white">
                          {memory.title}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-canvas-ceramic mb-4">
                <h3 className="text-xl font-extrabold text-brand-house flex items-center gap-2">
                  <Music className="w-5 h-5 text-brand" /> Lịch sử bài nhạc
                </h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-text-soft hover:text-text-main"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {musicHistory.length === 0 ? (
                  <div className="text-center py-12 text-text-soft">
                    <Music className="w-10 h-10 mx-auto opacity-30 mb-2" />
                    <p className="text-sm">Chưa có bài nhạc nào được chia sẻ.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {musicHistory.map(note => {
                      const creator = profiles.find(p => p.user_id === note.created_by);
                      const avatar = creator?.avatar_emoji || '🎵';
                      const name = creator?.display_name || note.creator_name || 'Người dùng';
                      const formattedDate = note.created_at
                        ? format(parseISO(note.created_at), 'dd/MM/yyyy HH:mm')
                        : '';
                      const isMyNote = user && note.created_by === user.id;

                      return (
                        <div key={note.id} className="bg-canvas-cool/60 border border-canvas-dark rounded-2xl p-4 flex flex-col justify-between shadow-sm relative group hover:border-brand/35 transition-colors">
                          <div>
                            {/* Creator Info */}
                            <div className="flex items-center gap-2 mb-2.5">
                              <span className="text-xl">{avatar}</span>
                              <div className="min-w-0">
                                <div className="text-xs font-extrabold text-text-main truncate">{name}</div>
                                <div className="text-[10px] text-text-soft">{formattedDate}</div>
                              </div>
                            </div>

                            {/* Song Info */}
                            <div className="mb-2">
                              <div className="font-bold text-text-main text-sm leading-snug line-clamp-1">{note.title}</div>
                              {note.artist && (
                                <div className="text-xs text-brand-accent font-semibold truncate mt-0.5">{note.artist}</div>
                              )}
                            </div>

                            {/* Note */}
                            {note.note && (
                              <div className="bg-white/80 border border-canvas-ceramic/60 p-2.5 rounded-xl text-xs italic text-text-soft mb-3 line-clamp-3">
                                "{note.note}"
                              </div>
                            )}
                          </div>

                          {/* Footer Actions */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-canvas-ceramic/50">
                            {note.spotify_url ? (
                              <a
                                href={note.spotify_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1.5 rounded-lg transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" /> Mở Spotify
                              </a>
                            ) : (
                              <span className="text-[10px] text-text-soft italic">Không có link</span>
                            )}

                            {isMyNote && (
                              <button
                                onClick={() => handleDeleteMusic(note.id)}
                                className="text-gray-400 hover:text-semantic-destructive p-1 rounded-lg hover:bg-semantic-destructive/5 transition-all"
                                title="Xóa bài nhạc"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
