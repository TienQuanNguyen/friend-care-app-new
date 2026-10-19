import { MusicNote } from '../types';
import { supabase } from '../lib/supabase';

const MUSIC_NOTE_META_PREFIX = '__friend_care_music_meta_v1__:';
const MUSIC_HEART_OVERRIDES_KEY = 'friend-care:music-heart-overrides';

type MusicNoteMetadata = {
  text: string | null;
  hearts: string[];
};

const decodeMusicNoteMetadata = (rawNote?: string | null): MusicNoteMetadata => {
  if (!rawNote?.startsWith(MUSIC_NOTE_META_PREFIX)) {
    return { text: rawNote || null, hearts: [] };
  }

  try {
    const parsed = JSON.parse(rawNote.slice(MUSIC_NOTE_META_PREFIX.length)) as {
      text?: unknown;
      hearts?: unknown;
    };
    const hearts = Array.isArray(parsed.hearts)
      ? parsed.hearts.filter((value): value is string => typeof value === 'string')
      : [];

    return {
      text: typeof parsed.text === 'string' ? parsed.text : null,
      hearts: Array.from(new Set(hearts)),
    };
  } catch {
    return { text: rawNote, hearts: [] };
  }
};

const encodeMusicNoteMetadata = (metadata: MusicNoteMetadata): string | null => {
  if (metadata.hearts.length === 0) return metadata.text || null;
  return `${MUSIC_NOTE_META_PREFIX}${JSON.stringify(metadata)}`;
};

const readHeartOverrides = (userId: string): Record<string, boolean> => {
  if (typeof window === 'undefined') return {};

  try {
    const stored = window.localStorage.getItem(`${MUSIC_HEART_OVERRIDES_KEY}:${userId}`);
    if (!stored) return {};

    const parsed = JSON.parse(stored) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, boolean>
      : {};
  } catch {
    return {};
  }
};

const writeHeartOverride = (userId: string, noteId: string, hearted?: boolean) => {
  if (typeof window === 'undefined') return;

  const key = `${MUSIC_HEART_OVERRIDES_KEY}:${userId}`;
  const overrides = readHeartOverrides(userId);
  if (typeof hearted === 'boolean') overrides[noteId] = hearted;
  else delete overrides[noteId];

  try {
    if (Object.keys(overrides).length > 0) {
      window.localStorage.setItem(key, JSON.stringify(overrides));
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // The optimistic UI still works for the current page if storage is unavailable.
  }
};

const addHeartSummaries = (notes: MusicNote[], userId: string): MusicNote[] => {
  const overrides = readHeartOverrides(userId);

  return notes.map(note => {
    const metadata = decodeMusicNoteMetadata(note.note);
    const hearts = new Set(metadata.hearts);
    if (Object.prototype.hasOwnProperty.call(overrides, note.id)) {
      if (overrides[note.id]) hearts.add(userId);
      else hearts.delete(userId);
    }

    return {
      ...note,
      note: metadata.text,
      heart_count: hearts.size,
      hearted_by_me: hearts.has(userId),
    };
  });
};

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

    const notes = (data || []).map(note => ({
      ...note,
      creator_name: profileMap.get(note.created_by) || null
    })) as MusicNote[];

    return addHeartSummaries(notes, spaceInfo.userId);
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

    const notes = (data || []).map(note => ({
      ...note,
      creator_name: profileMap.get(note.created_by) || null
    })) as MusicNote[];

    return addHeartSummaries(notes, spaceInfo.userId);
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

  /** Add or remove the current user's heart on a shared Spotify item. */
  async setHeart(id: string, hearted: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: musicNote, error: fetchError } = await supabase
      .from('music_notes')
      .select('note')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !musicNote) {
      console.warn('Using local music heart fallback:', fetchError);
      writeHeartOverride(user.id, id, hearted);
      return;
    }

    const metadata = decodeMusicNoteMetadata(musicNote.note);
    const hearts = new Set(metadata.hearts);
    if (hearted) hearts.add(user.id);
    else hearts.delete(user.id);

    const { data, error } = await supabase
      .from('music_notes')
      .update({
        note: encodeMusicNoteMetadata({ ...metadata, hearts: Array.from(hearts) }),
      })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error || !data) {
      console.warn('Music heart could not be shared; using local fallback:', error);
      writeHeartOverride(user.id, id, hearted);
      return;
    }

    writeHeartOverride(user.id, id);
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
    const { data: existingNote } = await supabase
      .from('music_notes')
      .select('note')
      .eq('id', id)
      .maybeSingle();
    const existingMetadata = decodeMusicNoteMetadata(existingNote?.note);

    const { data, error } = await supabase
      .from('music_notes')
      .update({
        title: input.title,
        artist: input.artist || null,
        spotify_url: input.spotify_url || null,
        note: encodeMusicNoteMetadata({
          text: input.note || null,
          hearts: existingMetadata.hearts,
        }),
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
