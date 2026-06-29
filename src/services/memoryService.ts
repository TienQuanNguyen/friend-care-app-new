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
  },

  async uploadMemoryImage(file: File, careSpaceId: string, userId: string): Promise<string | null> {
    try {
      const timestamp = Date.now();
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${careSpaceId}/${userId}/${timestamp}-${safeFilename}`;

      const { error: uploadError } = await supabase.storage
        .from('memories')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading memory image:', uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from('memories')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Unexpected error in uploadMemoryImage:', error);
      return null;
    }
  },

  async deleteMemory(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Error deleting memory:', error);
      return false;
    }
    return true;
  },

  async updateMemory(id: string, updates: Partial<Omit<Memory, 'id' | 'created_at' | 'updated_at'>>): Promise<boolean> {
    const { error } = await supabase
      .from('memories')
      .update(updates)
      .eq('id', id);
    if (error) {
      console.error('Error updating memory:', error);
      return false;
    }
    return true;
  },

  async updateReactions(id: string, reactions: Record<string, string>): Promise<boolean> {
    const { error } = await supabase
      .from('memories')
      .update({ reactions })
      .eq('id', id);

    if (error) {
      console.error('Error updating memory reactions:', error);
      return false;
    }
    return true;
  }
};
