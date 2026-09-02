import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { withTimeout } from '../../services/withTimeout';
import { FullPageSpinner } from '../../components/ui/Spinner';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        // Renders only a spinner below while this is pending, with no
        // timeout — a stalled connection used to trap the user on an
        // unrecoverable blank spinner after clicking a real magic link,
        // no error and no way back to sign-in.
        const { data } = await withTimeout(supabase.auth.getSession(), 10000);
        if (!data.session) { navigate('/sign-in', { replace: true }); return; }

        const { data: profile } = await withTimeout(
          supabase.from('profiles').select('onboarding_completed').eq('id', data.session.user.id).single(),
          10000,
        );

        navigate(profile?.onboarding_completed ? '/home' : '/onboarding', { replace: true });
      } catch {
        toast.error("Couldn't connect. Please sign in again.");
        navigate('/sign-in', { replace: true });
      }
    })();
  }, [navigate]);

  return <FullPageSpinner />;
}
