import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

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
      // Check if onboarding done
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Purple status bar */}
      <div className="h-[22px] bg-[#7F77DD]" />

      <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 gap-6">
        {/* Logo block */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-[100px] h-[50px] bg-[#7F77DD] rounded-[10px] flex items-center justify-center">
            <span className="text-white font-bold text-[22px]">SW</span>
          </div>
          <p className="text-[16px] font-bold text-[#1A1A28]">SafeWalk</p>
          <p className="text-[9px] text-[#888899]">Your safety, always on</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-[264px] flex flex-col gap-4">
          <Input label="Email" type="email" placeholder="you@email.com" error={errors.email?.message} {...register('email')} />
          <Input label="Password" type="password" placeholder="••••••••" error={errors.password?.message || serverError} {...register('password')} />

          <Button type="submit" fullWidth loading={isSubmitting}>Sign in</Button>

          <Link to="/forgot-password" className="text-[9px] text-[#7F77DD] text-center block">
            Forgot password?
          </Link>
        </form>

        <div className="w-full max-w-[264px]">
          <div className="border-t border-[#E0E0E8] my-4" />
          <p className="text-center text-[9px]">
            <span className="text-[#888899]">New here? </span>
            <Link to="/sign-up" className="text-[#7F77DD] font-medium">Create account →</Link>
          </p>
        </div>

        {/* Security note */}
        <div className="w-full max-w-[264px] bg-[#EEEDFE] rounded-lg px-3 py-2 flex items-center gap-2">
          <Lock size={12} className="text-[#534AB7] flex-shrink-0" />
          <p className="text-[8px] text-[#534AB7]">End-to-end encrypted · PIPEDA compliant</p>
        </div>
      </div>
    </div>
  );
}
