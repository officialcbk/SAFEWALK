// ─── Session-aware route guard ────────────────────────────────────────────────
// RN port of the web app's ProtectedRoute: hydrates the session + profile into
// authStore and subscribes to auth-state changes. Unlike the web version
// (which only guards protected routes and relies on each screen to navigate
// away on success), this gate is mounted once at the root and redirects both
// directions — out of (app) when signed out, out of (auth)/onboarding when
// signed in — so screens don't need their own post-auth navigation.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';
import { FullPageSpinner } from '../components/ui/Spinner';
import type { Profile } from '../types';

async function loadProfile(userId: string, setProfile: (p: Profile | null) => void) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  setProfile(data as Profile | null);
}

// Resolves once the persisted authStore (profile cache) has finished reading
// from AsyncStorage — a local disk read, not a network call, so this is fast
// even though it's async.
function waitForAuthStoreHydration(): Promise<void> {
  if (useAuthStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading, profile, setSession, setLoading, setProfile } = useAuthStore();
  const [profileChecked, setProfileChecked] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    console.log('PERF_TRACE authgate-effect-start', Date.now());
    supabase.auth.getSession().then(async ({ data }) => {
      console.log('PERF_TRACE getSession-resolved', Date.now());
      setSession(data.session);
      setLoading(false);
      if (data.session) {
        await waitForAuthStoreHydration();
        console.log('PERF_TRACE hydration-done', Date.now());
        const cached = useAuthStore.getState().profile;
        if (cached && cached.id === data.session.user.id) {
          // Show the cached profile immediately instead of blocking on a
          // network round-trip; refresh it quietly in the background.
          if (mountedRef.current) setProfileChecked(true);
          console.log('PERF_TRACE profileChecked-cached', Date.now());
          loadProfile(data.session.user.id, setProfile);
        } else {
          await loadProfile(data.session.user.id, setProfile);
          console.log('PERF_TRACE profileChecked-network', Date.now());
          if (mountedRef.current) setProfileChecked(true);
        }
      } else {
        if (mountedRef.current) setProfileChecked(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setLoading(false);
      if (event === 'SIGNED_IN' && newSession) {
        setProfileChecked(false);
        await loadProfile(newSession.user.id, setProfile);
        if (mountedRef.current) setProfileChecked(true);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setProfileChecked(true);
      } else if (event === 'INITIAL_SESSION' && newSession && !useAuthStore.getState().profile) {
        await loadProfile(newSession.user.id, setProfile);
        if (mountedRef.current) setProfileChecked(true);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loading || !profileChecked) return;

    const path = segments.join('/');
    const inAuthGroup = path.startsWith('(auth)');
    const onOnboarding = path === '(app)/onboarding';

    if (!session && !inAuthGroup) {
      router.replace('/sign-in');
      return;
    }
    if (session && profile && !profile.onboarding_completed && !onOnboarding) {
      router.replace('/onboarding');
      return;
    }
    if (session && inAuthGroup) {
      router.replace(profile && !profile.onboarding_completed ? '/onboarding' : '/home');
    }
  }, [loading, profileChecked, session, profile, segments, router]);

  if (loading || !profileChecked) return <FullPageSpinner />;

  return <>{children}</>;
}
