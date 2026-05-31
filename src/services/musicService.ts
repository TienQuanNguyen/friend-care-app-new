import { MusicNote } from '../types';
import { supabase } from '../lib/supabase';

export const musicService = {
  /**
   * Get the care space ID of the current logged-in user.
   */
  async getCurrentUserCareSpace(): Promise<{ userId: string; careSpaceId: string } | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('care_space_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !profile) return null;
    return { userId: user.id, careSpaceId: profile.care_space_id };
  },

  /**
   * Get all music notes in the user's care space.
   */
  async getMusicNotes(): Promise<MusicNote[]> {
    const spaceInfo = await this.getCurrentUserCareSpace();
    if (!spaceInfo) return [];

    const { data, error } = await supabase
      .from('music_notes')
      .select('*')
      .eq('care_space_id', spaceInfo.careSpaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching music notes:', error);
      return [];
    }

    // Map creator names
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .eq('care_space_id', spaceInfo.careSpaceId);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p.display_name]));

    return (data || []).map(note => ({
      ...note,
      creator_name: profileMap.get(note.created_by) || null
    })) as MusicNote[];
  },

  /**
   * Get today's music notes in the user's care space.
   */
  async getTodayMusicNotes(): Promise<MusicNote[]> {
    const spaceInfo = await this.getCurrentUserCareSpace();
    if (!spaceInfo) return [];

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('music_notes')
      .select('*')
      .eq('care_space_id', spaceInfo.careSpaceId)
      .gte('created_at', startOfToday.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching today\'s music notes:', error);
      return [];
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .eq('care_space_id', spaceInfo.careSpaceId);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p.display_name]));

    return (data || []).map(note => ({
      ...note,
      creator_name: profileMap.get(note.created_by) || null
    })) as MusicNote[];
  },

  /**
   * Get latest music note for each user in the care space today.
   */
  async getTodayMusicByUser(): Promise<MusicNote[]> {
    const todayNotes = await this.getTodayMusicNotes();
    const seenUsers = new Set<string>();
    const latestTodayNotes: MusicNote[] = [];

    for (const note of todayNotes) {
      if (!seenUsers.has(note.created_by)) {
        seenUsers.add(note.created_by);
        latestTodayNotes.push(note);
      }
    }

    return latestTodayNotes;
  },

  /**
   * Create a new music note.
   */
  async createMusicNote(input: {
    title: string;
    artist?: string;
    spotify_url?: string;
    note?: string;
  }): Promise<MusicNote | null> {
    const spaceInfo = await this.getCurrentUserCareSpace();
    if (!spaceInfo) {
      throw new Error('User or Care Space not found');
    }

    const { data, error } = await supabase
      .from('music_notes')
      .insert([{
        title: input.title,
        artist: input.artist || null,
        spotify_url: input.spotify_url || null,
        note: input.note || null,
        care_space_id: spaceInfo.careSpaceId,
        created_by: spaceInfo.userId,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating music note:', error);
      throw error;
    }

    return data as MusicNote;
  },

  /**
   * Delete a music note by ID.
   */
  async deleteMusicNote(id: string): Promise<void> {
    const { error } = await supabase
      .from('music_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting music note:', error);
      throw error;
    }
  },

  /**
   * Update an existing music note.
   */
  async updateMusicNote(id: string, input: {
    title: string;
    artist?: string;
    spotify_url?: string;
    note?: string;
  }): Promise<MusicNote | null> {
    const { data, error } = await supabase
      .from('music_notes')
      .update({
        title: input.title,
        artist: input.artist || null,
        spotify_url: input.spotify_url || null,
        note: input.note || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating music note:', error);
      throw error;
    }

    return data as MusicNote;
  }
};
