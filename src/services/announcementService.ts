import { supabase } from '../lib/supabase';
import { AppAnnouncement } from '../types';

const SEEN_KEY_PREFIX = 'friendcare_seen_announcement_';

export const announcementService = {
  /**
   * Get the latest active announcement.
   */
  async getActiveAnnouncement(): Promise<AppAnnouncement | null> {
    const { data, error } = await supabase
      .from('app_announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data as AppAnnouncement;
  },

  /**
   * Create a new announcement. Deactivates all previous announcements first.
   * Only admin can call this (RLS enforced).
   */
  async createAnnouncement({ title, message, userId, userEmail }: {
    title?: string;
    message: string;
    userId: string;
    userEmail: string;
  }): Promise<AppAnnouncement | null> {
    // Deactivate all current announcements
    await supabase
      .from('app_announcements')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('is_active', true);

    // Insert new announcement
    const { data, error } = await supabase
      .from('app_announcements')
      .insert([{
        title: title || null,
        message,
        is_active: true,
        created_by: userId,
        created_by_email: userEmail,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating announcement:', error);
      throw error;
    }
    return data as AppAnnouncement;
  },

  /**
   * Deactivate the current active announcement.
   * Only admin can call this (RLS enforced).
   */
  async deactivateCurrentAnnouncement(): Promise<void> {
    const { error } = await supabase
      .from('app_announcements')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('is_active', true);

    if (error) {
      console.error('Error deactivating announcement detail:', error.message, error.details, error.hint);
      throw new Error(error.message || 'Lỗi không xác định khi tắt thông báo.');
    }
  },

  /**
   * Mark an announcement as seen by storing its ID in localStorage.
   */
  markAnnouncementSeen(id: string): void {
    try {
      localStorage.setItem(`${SEEN_KEY_PREFIX}${id}`, 'true');
    } catch {
      // localStorage may be unavailable
    }
  },

  /**
   * Check if user has already seen this announcement.
   */
  hasSeenAnnouncement(id: string): boolean {
    try {
      return localStorage.getItem(`${SEEN_KEY_PREFIX}${id}`) === 'true';
    } catch {
      return false;
    }
  },
};
