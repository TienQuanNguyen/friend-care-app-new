import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useCareSpace } from './CareSpaceContext';
import { getVietnamDateString, streakService } from '../services/streakService';
import { StreakStatus } from '../types';
import { supabase } from '../lib/supabase';
import { StreakContext } from './streakContextValue';

const EMPTY_STATUS: StreakStatus = {
  currentStreak: 0,
  bestStreak: 0,
  completedToday: false,
  activeUserIdsToday: [],
};

const FlameCelebration = ({
  visible,
  streak,
}: {
  visible: boolean;
  streak: number;
}) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.45, y: 26, opacity: 0 }}
          animate={{ scale: [0.45, 1.12, 1], y: [26, -8, 0], opacity: 1 }}
          exit={{ scale: 0.8, y: -24, opacity: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="relative flex flex-col items-center rounded-2xl bg-white px-6 py-5 shadow-2xl ring-1 ring-black/5"
        >
          {[-54, -30, 30, 54].map((x, index) => (
            <motion.span
              key={x}
              className="absolute top-7"
              initial={{ x: 0, y: 0, scale: 0.5, opacity: 0 }}
              animate={{ x, y: -58 - index * 6, scale: [0.5, 1, 0.7], opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, delay: 0.12 + index * 0.08 }}
            >
              <Flame className="h-4 w-4 fill-orange-400 text-orange-500" />
            </motion.span>
          ))}
          <motion.div
            animate={{ rotate: [-5, 5, -3, 0], scale: [0.9, 1.12, 1] }}
            transition={{ duration: 0.8 }}
            className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-orange-50"
          >
            <Flame className="h-8 w-8 fill-orange-400 text-orange-500" />
          </motion.div>
          <p className="text-sm font-extrabold text-text-main">Cả hai đã giữ lửa hôm nay</p>
          <p className="mt-1 text-xs font-semibold text-text-soft">
            Chuỗi hiện tại: {streak} ngày
          </p>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const StreakProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { careSpace } = useCareSpace();
  const [status, setStatus] = useState<StreakStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationTimerRef = useRef<number | null>(null);
  const celebratedKeysRef = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    if (!careSpace || !user) return;

    const nextStatus = await streakService.getStatus(careSpace.id);
    setStatus(nextStatus);
    setLoading(false);

    if (!nextStatus.completedToday) return;

    const celebrationKey = `friendcare_streak_flame_${careSpace.id}_${user.id}_${getVietnamDateString()}`;
    let hasCelebrated = celebratedKeysRef.current.has(celebrationKey);

    try {
      hasCelebrated = hasCelebrated || localStorage.getItem(celebrationKey) === 'true';
    } catch {
      // Keep the in-memory guard when localStorage is unavailable.
    }

    if (hasCelebrated) return;

    celebratedKeysRef.current.add(celebrationKey);
    try {
      localStorage.setItem(celebrationKey, 'true');
    } catch {
      // The in-memory guard still prevents repeated animation in this app session.
    }

    setShowCelebration(true);
    if (celebrationTimerRef.current) {
      window.clearTimeout(celebrationTimerRef.current);
    }
    celebrationTimerRef.current = window.setTimeout(() => {
      setShowCelebration(false);
    }, 2400);
  }, [careSpace, user]);

  useEffect(() => {
    if (!careSpace || !user) return;

    const initialLoadTimer = window.setTimeout(() => {
      void refresh();
    }, 0);

    const channel = supabase
      .channel(`daily-interactions-${careSpace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_interactions',
          filter: `care_space_id=eq.${careSpace.id}`,
        },
        () => {
          void refresh();
        }
      )
      .subscribe();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    }, 20_000);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(initialLoadTimer);
      window.clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [careSpace, refresh, user]);

  useEffect(() => () => {
    if (celebrationTimerRef.current) {
      window.clearTimeout(celebrationTimerRef.current);
    }
  }, []);

  return (
    <StreakContext.Provider value={{ status, loading, refresh }}>
      {children}
      <FlameCelebration visible={showCelebration} streak={status.currentStreak} />
    </StreakContext.Provider>
  );
};
