import React, { createContext, useContext, useState, useEffect } from 'react';
import { CareSpace, Profile } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface CareSpaceContextType {
  careSpace: CareSpace | null;
  profiles: Profile[];
  loading: boolean;
  joinSpace: (code: string) => Promise<void>;
  createSpace: (name: string, defaultAvatar?: string) => Promise<void>;
  updateProfileAvatar: (emoji: string) => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
}

const CareSpaceContext = createContext<CareSpaceContextType | undefined>(undefined);

export const CareSpaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [careSpace, setCareSpace] = useState<CareSpace | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setCareSpace(null);
      setProfiles([]);
      setLoading(false);
      return;
    }

    loadCareSpaceData();
  }, [user, authLoading]);

  const loadCareSpaceData = async () => {
    try {
      setLoading(true);
      if (!user) return;

      // Find if user has a profile
      const { data: myProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (myProfile) {
        // Load care space
        const { data: spaceData, error: spaceError } = await supabase
          .from('care_spaces')
          .select('*')
          .eq('id', myProfile.care_space_id)
          .single();
          
        if (spaceError) throw spaceError;
        setCareSpace(spaceData);
        if (spaceData?.invite_code) {
          localStorage.setItem('friendcare_last_invite_code', spaceData.invite_code);
        }

        // Load all profiles in the space
        const { data: allProfiles, error: allProfilesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('care_space_id', myProfile.care_space_id);
          
        if (allProfilesError) throw allProfilesError;
        setProfiles(allProfiles || []);
      } else {
        setCareSpace(null);
        setProfiles([]);
      }
    } catch (error) {
      console.error('Error loading care space:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinSpace = async (code: string) => {
    if (!user) return;
    
    // Find the space by code (using an RPC function to bypass RLS read restrictions for new users)
    const { data: space, error: spaceError } = await supabase
      .rpc('get_space_by_invite_code', { code_param: code })
      .maybeSingle();
      
    if (spaceError) throw spaceError;
    if (!space) throw new Error('Mã mời không hợp lệ');

    // Create profile for this user in that space
    const savedAvatar = localStorage.getItem('friendcare_avatar') || '🐱';
    
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        care_space_id: space.id,
        display_name: user.email.split('@')[0],
        avatar_emoji: savedAvatar,
        role: 'member'
      }, { onConflict: 'user_id' });
      
    if (profileError) throw profileError;
    
    await loadCareSpaceData();
  };

  const createSpace = async (name: string, defaultAvatar: string = '🐱') => {
    if (!user) return;
    
    // Generate a random 6-char code
    const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Insert space
    const { data: space, error: spaceError } = await supabase
      .from('care_spaces')
      .insert({
        name,
        invite_code,
        created_by: user.id
      })
      .select()
      .single();
      
    if (spaceError) throw spaceError;
    
    // Insert admin profile
    const savedAvatar = localStorage.getItem('friendcare_avatar') || defaultAvatar;
    
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        care_space_id: space.id,
        display_name: user.email.split('@')[0],
        avatar_emoji: savedAvatar,
        role: 'admin'
      }, { onConflict: 'user_id' });
      
    if (profileError) throw profileError;
    
    await loadCareSpaceData();
  };

  const updateProfileAvatar = async (emoji: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_emoji: emoji })
      .eq('user_id', user.id);
      
    if (error) {
      console.error('Error updating avatar:', error);
      throw error;
    }
    
    localStorage.setItem('friendcare_avatar', emoji);
    
    // Optimistic update
    setProfiles(prev => prev.map(p => 
      p.user_id === user.id ? { ...p, avatar_emoji: emoji } : p
    ));
  };

  const updateProfileName = async (name: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: name })
      .eq('user_id', user.id);
      
    if (error) {
      console.error('Error updating name:', error);
      throw error;
    }
    
    // Optimistic update
    setProfiles(prev => prev.map(p => 
      p.user_id === user.id ? { ...p, display_name: name } : p
    ));
  };

  return (
    <CareSpaceContext.Provider value={{
        careSpace,
        profiles,
        loading,
        joinSpace,
        createSpace,
        updateProfileAvatar,
        updateProfileName,
      }}
    >
      {children}
    </CareSpaceContext.Provider>
  );
};

export const useCareSpace = () => {
  const context = useContext(CareSpaceContext);
  if (context === undefined) {
    throw new Error('useCareSpace must be used within a CareSpaceProvider');
  }
  return context;
};
