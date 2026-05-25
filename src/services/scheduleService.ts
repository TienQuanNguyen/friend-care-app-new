import { Schedule } from '../types';
import { supabase } from '../lib/supabase';

export const scheduleService = {
  async getSchedules(): Promise<Schedule[]> {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .order('start_time', { ascending: true });
      
    if (error) {
      console.error('Error fetching schedules:', error);
      return [];
    }
    return data || [];
  },
  
  async addSchedule(schedule: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>): Promise<Schedule | null> {
    const { data, error } = await supabase
      .from('schedules')
      .insert([schedule])
      .select()
      .single();
      
    if (error) {
      console.error('Error adding schedule:', error);
      return null;
    }
    return data;
  },

  async updateSchedule(id: string, updates: Partial<Schedule>): Promise<Schedule | null> {
    const { data, error } = await supabase
      .from('schedules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating schedule:', error);
      return null;
    }
    return data;
  }
};
