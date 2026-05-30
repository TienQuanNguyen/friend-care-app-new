import { MoodEntry, MoodType } from '../types';
import { supabase } from '../lib/supabase';

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
    return data || [];
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
  }
};
