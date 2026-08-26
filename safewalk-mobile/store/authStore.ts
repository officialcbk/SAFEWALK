import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '../types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

// Only `profile` is persisted — it's the one field slow to refetch (a network
// round-trip to Supabase on every app open) and safe to show stale-then-
// revalidate. `session`/`user` are intentionally NOT persisted here: Supabase
// already persists its own session under its own AsyncStorage key, and
// duplicating it risks the two copies drifting out of sync.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      profile: null,
      loading: true,
      setSession: (session) => set({ session, user: session?.user ?? null }),
      setProfile: (profile) => set({ profile }),
      setLoading: (loading) => set({ loading }),
      clear: () => set({ session: null, user: null, profile: null, loading: false }),
    }),
    {
      name: 'trayl-auth-profile',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ profile: state.profile }),
    },
  ),
);
