import { MoodEntry } from '../types';
import { supabase } from '../lib/supabase';

export const MOOD_PRIVACY_REACTION_KEY = '__friend_care_private_owner__';

const withUiPrivacy = (entry: MoodEntry): MoodEntry => ({
  ...entry,
  is_private: entry.reactions?.[MOOD_PRIVACY_REACTION_KEY] === entry.created_by,
});

export const moodService = {
  async getEntries(): Promise<MoodEntry[]> {
    const { data, error } = await supabase
      .from('mood_entries')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching mood entries:', error);
      throw error;
    }

    return ((data || []) as MoodEntry[]).map(withUiPrivacy);
  },
  
  async addEntry(entry: Omit<MoodEntry, 'id' | 'created_at' | 'updated_at'>): Promise<MoodEntry | null> {
    const { data, error } = await supabase
      .from('mood_entries')
      .insert([entry])
      .select()
      .single();
      
    if (error) {
      console.error('Error adding mood entry:', error);
      throw error;
    }
    return data;
  },

  async deleteEntry(id: string): Promise<void> {
    const { error } = await supabase
      .from('mood_entries')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting mood entry:', error);
      throw error;
    }
  },

  async updateAdvice(id: string, ai_advice: string): Promise<void> {
    const { error } = await supabase
      .from('mood_entries')
      .update({ ai_advice })
      .eq('id', id);
      
    if (error) {
      console.error('Error updating mood entry advice:', error);
      throw error;
    }
  },

  async updateReactions(id: string, reactions: Record<string, string>): Promise<void> {
    const { error } = await supabase
      .from('mood_entries')
      .update({ reactions })
      .eq('id', id);
      
    if (error) {
      console.error('Error updating mood entry reactions:', error);
      throw error;
    }
  },

  async togglePin(id: string, is_pinned: boolean): Promise<void> {
    const { error } = await supabase
      .from('mood_entries')
      .update({ is_pinned })
      .eq('id', id);
      
    if (error) {
      console.error('Error toggling pin on mood entry:', error);
      throw error;
    }
  },

  async setPrivacy(id: string, is_private: boolean): Promise<void> {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id;
    if (!currentUserId) throw new Error('User not authenticated');

    const { data: entry, error: fetchError } = await supabase
      .from('mood_entries')
      .select('created_by, reactions')
      .eq('id', id)
      .single();

    if (fetchError || !entry) {
      console.error('Error fetching mood entry privacy metadata:', fetchError);
      throw fetchError || new Error('Mood entry was not found.');
    }

    if (entry.created_by !== currentUserId) {
      throw new Error('Only the entry owner can change its privacy state.');
    }

    const reactions = { ...((entry.reactions || {}) as Record<string, string>) };
    if (is_private) {
      reactions[MOOD_PRIVACY_REACTION_KEY] = currentUserId;
    } else {
      delete reactions[MOOD_PRIVACY_REACTION_KEY];
    }

    const { data, error } = await supabase
      .from('mood_entries')
      .update({ reactions })
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error updating mood entry privacy metadata:', error);
      throw error || new Error('Mood entry privacy update was not applied.');
    }
  }
};
