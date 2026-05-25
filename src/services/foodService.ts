import { FoodPlace } from '../types';
import { supabase } from '../lib/supabase';

export const foodService = {
  async getPlaces(): Promise<FoodPlace[]> {
    const { data, error } = await supabase
      .from('food_places')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching food places:', error);
      throw error;
    }
    return data || [];
  },
  
  async addPlace(place: Omit<FoodPlace, 'id' | 'created_at' | 'updated_at'>): Promise<FoodPlace | null> {
    const { data, error } = await supabase
      .from('food_places')
      .insert([place])
      .select()
      .single();
      
    if (error) {
      console.error('Error adding food place:', error);
      throw error;
    }
    return data;
  },

  async updatePlace(id: string, updates: Partial<FoodPlace>): Promise<FoodPlace | null> {
    const { data, error } = await supabase
      .from('food_places')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating food place:', error);
      throw error;
    }
    return data;
  },

  async deletePlace(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('food_places')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting food place:', error);
      throw error;
    }
    return true;
  }
};
