import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { FullPageSpinner } from '../../components/ui/Spinner';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase puts type=recovery in the URL hash for password-reset links
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get('type') === 'recovery') {
      navigate('/reset-password', { replace: true });
      return;
    }

    // Email confirmation after sign-up: mark onboarding complete and enter the app
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { navigate('/sign-in', { replace: true }); return; }
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', data.session.user.id);
      navigate('/home', { replace: true });
    });
  }, [navigate]);

  return <FullPageSpinner />;
}
