import { differenceInCalendarDays, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { DailyInteraction, StreakStatus } from '../types';

const EMPTY_STREAK_STATUS: StreakStatus = {
  currentStreak: 0,
  bestStreak: 0,
  completedToday: false,
  activeUserIdsToday: [],
};

type ActivityRecord = {
  created_by: string;
  created_at: string;
  updated_at?: string | null;
};

export const getVietnamDateString = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const calculateStreakStatus = (
  interactions: DailyInteraction[],
  today: string
): StreakStatus => {
  const usersByDate = new Map<string, Set<string>>();

  interactions.forEach(interaction => {
    const users = usersByDate.get(interaction.activity_date) || new Set<string>();
    users.add(interaction.user_id);
    usersByDate.set(interaction.activity_date, users);
  });

  const completedDates = Array.from(usersByDate.entries())
    .filter(([, users]) => users.size >= 2)
    .map(([date]) => date)
    .sort((a, b) => b.localeCompare(a));

  let currentStreak = 0;
  if (completedDates.length > 0) {
    const latestDate = parseISO(completedDates[0]);
    const todayDate = parseISO(today);
    const daysFromToday = differenceInCalendarDays(todayDate, latestDate);

    if (daysFromToday === 0 || daysFromToday === 1) {
      currentStreak = 1;
      for (let index = 0; index < completedDates.length - 1; index += 1) {
        const currentDate = parseISO(completedDates[index]);
        const nextDate = parseISO(completedDates[index + 1]);
        if (differenceInCalendarDays(currentDate, nextDate) !== 1) break;
        currentStreak += 1;
      }
    }
  }

  let bestStreak = completedDates.length > 0 ? 1 : 0;
  let runningStreak = completedDates.length > 0 ? 1 : 0;
  for (let index = 0; index < completedDates.length - 1; index += 1) {
    const currentDate = parseISO(completedDates[index]);
    const nextDate = parseISO(completedDates[index + 1]);

    if (differenceInCalendarDays(currentDate, nextDate) === 1) {
      runningStreak += 1;
      bestStreak = Math.max(bestStreak, runningStreak);
    } else {
      runningStreak = 1;
    }
  }

  const activeUserIdsToday = Array.from(usersByDate.get(today) || []);

  return {
    currentStreak,
    bestStreak,
    completedToday: activeUserIdsToday.length >= 2,
    activeUserIdsToday,
  };
};

const getFallbackInteractions = async (careSpaceId: string): Promise<DailyInteraction[]> => {
  const tables = [
    'mood_entries',
    'food_places',
    'schedules',
    'love_notes',
    'memories',
    'music_notes',
  ];

  const responses = await Promise.all(
    tables.map(table =>
      supabase
        .from(table)
        .select('created_by, created_at, updated_at')
        .eq('care_space_id', careSpaceId)
    )
  );

  const interactions = new Map<string, DailyInteraction>();

  responses.forEach(response => {
    if (response.error) return;

    (response.data as ActivityRecord[] | null)?.forEach(record => {
      const activityTimestamp = record.updated_at || record.created_at;
      const activityDate = getVietnamDateString(new Date(activityTimestamp));
      const interactionKey = `${record.created_by}:${activityDate}`;
      const existing = interactions.get(interactionKey);

      if (existing) {
        existing.interaction_count += 1;
        if (activityTimestamp > existing.last_interaction_at) {
          existing.last_interaction_at = activityTimestamp;
        }
        return;
      }

      interactions.set(interactionKey, {
        id: interactionKey,
        care_space_id: careSpaceId,
        user_id: record.created_by,
        activity_date: activityDate,
        interaction_count: 1,
        sources: [],
        first_interaction_at: activityTimestamp,
        last_interaction_at: activityTimestamp,
      });
    });
  });

  return Array.from(interactions.values());
};

export const streakService = {
  async getStatus(careSpaceId: string): Promise<StreakStatus> {
    const { data, error } = await supabase
      .from('daily_interactions')
      .select('*')
      .eq('care_space_id', careSpaceId)
      .order('activity_date', { ascending: false });

    if (error) {
      if (import.meta.env.DEV) {
        console.debug('[Streak] Using content-table fallback:', error.code);
      }

      try {
        const fallbackInteractions = await getFallbackInteractions(careSpaceId);
        return calculateStreakStatus(fallbackInteractions, getVietnamDateString());
      } catch (fallbackError) {
        console.error('Error fetching fallback streak interactions:', fallbackError);
        return EMPTY_STREAK_STATUS;
      }
    }

    return calculateStreakStatus(
      (data || []) as DailyInteraction[],
      getVietnamDateString()
    );
  },
};
