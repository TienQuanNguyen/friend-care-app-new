export type Role = 'admin' | 'member';

export interface CareSpace {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  care_space_id: string;
  display_name: string;
  avatar_emoji: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export type MoodType = 'Hạnh phúc' | 'Buồn bã' | 'Mệt mỏi' | 'Căng thẳng' | 'Nhớ người ấy' | 'Bình yên' | 'Phấn khích';

export interface MoodEntry {
  id: string;
  care_space_id: string;
  created_by: string;
  mood: MoodType;
  energy_level: number; // 1-10
  note?: string;
  gratitude?: string;
  ai_advice?: string;
  entry_date: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export type FoodStatus = 'want_to_try' | 'tried' | 'saved';

export interface FoodPlace {
  id: string;
  care_space_id: string;
  created_by: string;
  food_name: string;
  restaurant_name?: string;
  address?: string;
  district?: string;
  category?: string;
  cuisine_type?: string;
  priority: number; // 1-5
  status: FoodStatus;
  note?: string;
  image_url?: string;
  image_source?: string;
  tried: boolean;
  rating?: number; // 1-5
  review?: string;
  location_note?: string;
  google_maps_url?: string;
  created_at: string;
  updated_at: string;
}

export type ScheduleCategory = 'work' | 'study' | 'couple' | 'reminder' | 'health' | 'other';
export type ScheduleAssignedTo = 'me' | 'partner' | 'both';
export type ScheduleStatus = 'todo' | 'doing' | 'done';

export interface Schedule {
  id: string;
  care_space_id: string;
  created_by: string;
  title: string;
  description?: string;
  category: ScheduleCategory;
  assigned_to: ScheduleAssignedTo;
  status: ScheduleStatus;
  start_time: string;
  end_time?: string;
  color_type: string;
  created_at: string;
  updated_at: string;
}

export interface LoveNote {
  id: string;
  care_space_id: string;
  created_by: string;
  message: string;
  created_at: string;
  updated_at: string;
}

export interface Memory {
  id: string;
  care_space_id: string;
  created_by: string;
  title: string;
  memory_date?: string;
  description?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

// === Admin Announcement ===

export interface AppAnnouncement {
  id: string;
  title?: string | null;
  message: string;
  is_active: boolean;
  created_by?: string | null;
  created_by_email?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export const ADMIN_EMAILS = ['tienquan0807@gmail.com'];

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export interface MusicNote {
  id: string;
  care_space_id?: string;
  couple_id?: string;
  created_by: string;
  title: string;
  artist?: string | null;
  spotify_url?: string | null;
  note?: string | null;
  created_at: string;
  updated_at?: string | null;
  creator_name?: string | null;
}
