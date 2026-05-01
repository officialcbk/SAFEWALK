import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { FullPageSpinner } from '../ui/Spinner';
import type { Profile } from '../../types';

interface ProtectedRouteProps { children: React.ReactNode; }

async function loadProfile(userId: string, setProfile: (p: Profile | null) => void) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  setProfile(data as Profile | null);
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading, profile, setSession, setLoading, setProfile } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session && !profile) loadProfile(data.session.user.id, setProfile);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setLoading(false);
      if (event === 'SIGNED_IN') {
        loadProfile(newSession!.user.id, setProfile);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
      } else if (event === 'INITIAL_SESSION' && newSession && !useAuthStore.getState().profile) {
        loadProfile(newSession.user.id, setProfile);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/sign-in" state={{ from: location }} replace />;

  return <>{children}</>;
}
