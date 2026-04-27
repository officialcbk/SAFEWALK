import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const schema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email:     z.string().email('Enter a valid email'),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
});
type FormData = z.infer<typeof schema>;

function strengthLabel(pw: string) {
  if (pw.length < 6) return { label: 'Weak', color: '#E24B4A' };
  if (pw.length < 10) return { label: 'Fair', color: '#854F0B' };
  return { label: 'Strong', color: '#3B6D11' };
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

  const strength = password.length > 0 ? strengthLabel(password) : null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="h-[22px] bg-[#7F77DD]" />

      <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 gap-6">
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-[100px] h-[40px] bg-[#7F77DD] rounded-[10px] flex items-center justify-center">
            <span className="text-white font-bold text-[16px]">SW</span>
          </div>
          <p className="text-[14px] font-bold text-[#1A1A28]">Create account</p>
          <p className="text-[9px] text-[#888899]">Safe in 2 minutes</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-[264px] flex flex-col gap-4">
          <Input label="Full name" type="text" autoComplete="name" placeholder="Your full name" error={errors.full_name?.message} {...register('full_name')} />
          <Input label="Email" type="email" placeholder="you@email.com" error={errors.email?.message} {...register('email')} />
          <div>
            <Input
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              error={errors.password?.message || serverError}
              {...register('password', { onChange: (e) => setPassword(e.target.value) })}
            />
            {strength && (
              <p className="text-[9px] mt-1 font-medium" style={{ color: strength.color }}>
                {strength.label}
              </p>
            )}
          </div>

          <Button type="submit" fullWidth loading={isSubmitting}>Create account</Button>
        </form>

        <div className="w-full max-w-[264px]">
          <div className="border-t border-[#E0E0E8] my-4" />
          <p className="text-[9px] text-center">
            <span className="text-[#888899]">Already have an account? </span>
            <Link to="/sign-in" className="text-[#7F77DD] font-medium">Sign in →</Link>
          </p>
          <p className="text-[9px] text-center mt-3">
            <Link to="/terms" className="text-[#7F77DD]">Terms</Link>
            <span className="text-[#888899] mx-1">·</span>
            <Link to="/privacy" className="text-[#7F77DD]">Privacy policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
