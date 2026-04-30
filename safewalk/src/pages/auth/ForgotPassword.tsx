import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AuthPage } from '../../components/layout/AuthPage';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email }: FormData) => {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSent(true);
  };

  return (
    <AuthPage title="Reset your SafeWalk password">
      <div className="flex flex-col flex-1">
        <div className="mt-7 flex flex-col items-center gap-3 mb-8">
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
          <div className="text-[22px] font-bold text-[#1A1A28] tracking-[-0.4px]">Reset password</div>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-4 text-center" role="status" aria-live="polite">
            <div className="w-[72px] h-[72px] rounded-full bg-[#EAF3DE] flex items-center justify-center" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3B6D11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>
              </svg>
            </div>
            <p className="text-[14px] text-[#4A4A5A] leading-relaxed">
              If an account exists for that email, a reset link has been sent. Check your inbox.
            </p>
            <Link to="/sign-in" className="text-[13px] font-semibold text-[#534AB7] no-underline">
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5" noValidate>
            <p className="text-[14px] text-[#888899] leading-relaxed mb-1">
              Enter your email and we'll send you a reset link.
            </p>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@email.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Button type="submit" fullWidth loading={isSubmitting}>Send reset link</Button>
            <Link
              to="/sign-in"
              className="text-[13px] font-semibold text-[#534AB7] text-center no-underline mt-1"
            >
              ← Back to sign in
            </Link>
          </form>
        )}
      </div>
    </AuthPage>
  );
}
