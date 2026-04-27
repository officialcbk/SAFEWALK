import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

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
    setSent(true); // show success regardless of whether email exists
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="h-[22px] bg-[#7F77DD]" />
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 gap-6">
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-[100px] h-[40px] bg-[#7F77DD] rounded-[10px] flex items-center justify-center">
            <span className="text-white font-bold text-[16px]">SW</span>
          </div>
          <p className="text-[14px] font-bold text-[#1A1A28]">Reset password</p>
        </div>

        {sent ? (
          <div className="w-full max-w-[264px] text-center flex flex-col gap-3">
            <div className="w-14 h-14 rounded-full bg-[#EAF3DE] flex items-center justify-center mx-auto">
              <span className="text-2xl">✉️</span>
            </div>
            <p className="text-[11px] text-[#888899] leading-relaxed">
              If an account exists for that email, a reset link has been sent.
            </p>
            <Link to="/sign-in" className="text-[9px] text-[#7F77DD]">← Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-[264px] flex flex-col gap-4">
            <p className="text-[11px] text-[#888899] leading-relaxed">
              Enter your email and we'll send you a reset link.
            </p>
            <Input label="Email" type="email" placeholder="you@email.com" error={errors.email?.message} {...register('email')} />
            <Button type="submit" fullWidth loading={isSubmitting}>Send reset link</Button>
            <Link to="/sign-in" className="text-[9px] text-[#7F77DD] text-center block">← Back to sign in</Link>
          </form>
        )}
      </div>
    </div>
  );
}
