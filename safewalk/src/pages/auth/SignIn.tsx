import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AuthPage } from '../../components/layout/AuthPage';

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

function LogoMark() {
  return (
    <div className="inline-flex items-center gap-2 bg-white rounded-full px-3.5 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
      <div
        className="w-7 h-7 rounded-[8px] flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #7F77DD, #534AB7)' }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" width={22} height={22}>
          <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="2.2"/>
          <circle cx="32" cy="32" r="15" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2"/>
          <circle cx="32" cy="32" r="6" fill="white"/>
        </svg>
      </div>
      <span className="font-bold text-[14px] text-[#1A1A28] tracking-[-0.2px]">SafeWalk</span>
    </div>
  );
}

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/home';
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email, password }: FormData) => {
    setServerError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login') || error.message.includes('credentials')) {
        setServerError('Incorrect email or password.');
      } else if (error.message.includes('Email not confirmed')) {
        setServerError('Please confirm your email. Check your inbox or resend below.');
      } else {
        setServerError(error.message);
      }
      return;
    }
    if (data.session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', data.session.user.id)
        .single();
      if (!profile?.onboarding_completed) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  };

  return (
    <AuthPage title="Sign in to SafeWalk">
      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="mt-7 flex flex-col items-center gap-3.5 mb-9">
          <LogoMark />
          <div className="text-center">
            <div className="text-[24px] font-bold text-[#1A1A28] tracking-[-0.4px]">Welcome back</div>
            <div className="text-[14px] text-[#888899] mt-1">Your safety, always on</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5" noValidate>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message || serverError}
            {...register('password')}
          />

          <Button type="submit" fullWidth loading={isSubmitting} className="mt-1.5">
            Sign in
          </Button>
        </form>

        <div className="text-center mt-3.5">
          <Link
            to="/forgot-password"
            className="text-[13px] font-semibold text-[#534AB7] no-underline"
          >
            Forgot password?
          </Link>
        </div>

        <div className="flex-1" />

        {/* Security note */}
        <div className="bg-[#EEEDFE] rounded-[12px] px-3.5 py-3 flex items-center gap-2.5 mt-6">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
          </svg>
          <span className="text-[12px] font-medium text-[#3C3489]">
            End-to-end encrypted · PIPEDA compliant
          </span>
        </div>

        <div className="text-center mt-4 text-[13px] text-[#888899]">
          New here?{' '}
          <Link to="/sign-up" className="text-[#534AB7] font-semibold no-underline">
            Create account →
          </Link>
        </div>
      </div>
    </AuthPage>
  );
}
