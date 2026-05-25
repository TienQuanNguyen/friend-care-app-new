import { LoveNote } from '../types';
import { supabase } from '../lib/supabase';

export const loveNoteService = {
  async getNotes(): Promise<LoveNote[]> {
    const { data, error } = await supabase
      .from('love_notes')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching love notes:', error);
      return [];
    }
    return data || [];
  },
  
  async addNote(note: Omit<LoveNote, 'id' | 'created_at' | 'updated_at'>): Promise<LoveNote | null> {
    const { data, error } = await supabase
      .from('love_notes')
      .insert([note])
      .select()
      .single();
      
    if (error) {
      console.error('Error adding love note:', error);
      return null;
    }
    return data;
  }
};
