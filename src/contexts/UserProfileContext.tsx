import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  tithe_enabled: boolean;
  tithe_period: string;
  auto_deduct_tithe: boolean;
  savings_percentage: number;
  default_currency: string;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  defaultCurrency: string;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};

interface UserProfileProviderProps {
  children: React.ReactNode;
}

export const UserProfileProvider = ({ children }: UserProfileProviderProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
      } else {
        // Create default profile if none exists
        const defaultProfile = {
          user_id: user.id,
          full_name: user.user_metadata?.full_name || null,
          tithe_enabled: false,
          tithe_period: 'monthly',
          auto_deduct_tithe: false,
          savings_percentage: 10,
          default_currency: user.user_metadata?.default_currency || 'USD',
        };

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert(defaultProfile)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        setProfile(newProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Set fallback profile with USD default
      setProfile({
        id: '',
        user_id: user?.id || '',
        full_name: user?.user_metadata?.full_name || null,
        tithe_enabled: false,
        tithe_period: 'monthly',
        auto_deduct_tithe: false,
        savings_percentage: 10,
        default_currency: 'USD',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    await loadProfile();
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!profile || !user) return false;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const value = {
    profile,
    loading,
    refreshProfile,
    updateProfile,
    defaultCurrency: profile?.default_currency || 'USD',
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};