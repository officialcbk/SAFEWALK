import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AuthPage } from '../../components/layout/AuthPage';

const schema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email:     z.string().email('Enter a valid email'),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
});
type FormData = z.infer<typeof schema>;

function strengthInfo(pw: string) {
  if (pw.length < 6)  return { label: 'Weak',   color: '#E24B4A', w: '30%' };
  if (pw.length < 10) return { label: 'Fair',   color: '#E8A020', w: '60%' };
  return                     { label: 'Strong', color: '#3B6D11', w: '100%' };
}

export default function SignUp() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [password, setPassword] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ full_name, email, password }: FormData) => {
    setServerError('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });
    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        setServerError('An account with this email already exists.');
      } else {
        setServerError(error.message);
      }
      return;
    }
    navigate('/auth/check-email', { state: { email } });
  };

  const strength = password.length > 0 ? strengthInfo(password) : null;

  return (
    <AuthPage title="Create a SafeWalk account">
      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="mt-4 flex flex-col items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-[12px] flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7F77DD, #534AB7)', boxShadow: '0 6px 20px rgba(127,119,221,0.4)' }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 64 64" width={32} height={32}>
              <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="2.2"/>
              <circle cx="32" cy="32" r="15" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2"/>
              <circle cx="32" cy="32" r="6" fill="white"/>
            </svg>
          </div>
          <div className="text-center">
            <div className="text-[22px] font-bold text-[#1A1A28] tracking-[-0.4px]">Create account</div>
            <div className="text-[13px] text-[#888899] mt-0.5">Safe in 2 minutes</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5" noValidate>
          <Input
            label="Full name"
            type="text"
            autoComplete="name"
            placeholder="Alex Johnson"
            error={errors.full_name?.message}
            {...register('full_name')}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <div>
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              error={errors.password?.message || serverError}
              {...register('password', { onChange: (e) => setPassword(e.target.value) })}
            />
            {strength && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1 bg-[#F0F0F4] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{ width: strength.w, background: strength.color }}
                  />
                </div>
                <span className="text-[11px] font-semibold" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <Button type="submit" fullWidth loading={isSubmitting} className="mt-1">
            Create account
          </Button>
        </form>

        <div className="text-center mt-3 text-[12px] text-[#888899]">
          By creating an account you agree to our{' '}
          <a href="#" className="text-[#534AB7] font-semibold no-underline">Terms</a>
          {' · '}
          <a href="#" className="text-[#534AB7] font-semibold no-underline">Privacy</a>
        </div>

        <div className="flex-1" />

        <div className="text-center text-[13px] text-[#888899] mt-4">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-[#534AB7] font-semibold no-underline">
            Sign in →
          </Link>
        </div>
      </div>
    </AuthPage>
  );
}
