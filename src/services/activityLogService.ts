import { supabase } from '../lib/supabase';

export type ActivityEventType =
  | 'login'
  | 'page_visit'
  | 'mood_entry'
  | 'love_note'
  | 'memory_upload'
  | 'food_add'
  | 'schedule_add'
  | 'chat_message';

export interface ActivityLog {
  id: string;
  care_space_id: string | null;
  user_id: string;
  event_type: ActivityEventType;
  event_label: string | null;
  created_at: string;
}

export const activityLogService = {
  /**
   * Insert a single activity log row.
   * Silently swallows errors so it never breaks core UX.
   */
  async logEvent(
    careSpaceId: string | null,
    userId: string,
    eventType: ActivityEventType,
    eventLabel?: string
  ): Promise<void> {
    try {
      await supabase.from('activity_logs').insert({
        care_space_id: careSpaceId,
        user_id: userId,
        event_type: eventType,
        event_label: eventLabel ?? null,
      });
    } catch {
      // Non-critical – never throw
    }
  },

  /**
   * Fetch recent logs for a care space (admin only via RLS).
   */
  async getLogs(careSpaceId: string, limit = 200): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('care_space_id', careSpaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[activityLogService] getLogs error:', error);
      return [];
    }
    return (data as ActivityLog[]) || [];
  },
};
