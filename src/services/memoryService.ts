import { Memory } from '../types';
import { supabase } from '../lib/supabase';

export const memoryService = {
  async getMemories(): Promise<Memory[]> {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('memory_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching memories:', error);
      return [];
    }
    return data || [];
  },
  
  async addMemory(memory: Omit<Memory, 'id' | 'created_at' | 'updated_at'>): Promise<Memory | null> {
    const { data, error } = await supabase
      .from('memories')
      .insert([memory])
      .select()
      .single();
      
    if (error) {
      console.error('Error adding memory:', error);
      return null;
    }
    return data;
  }
};
