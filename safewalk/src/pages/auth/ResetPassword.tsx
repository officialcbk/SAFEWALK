import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { withTimeout } from '../../services/withTimeout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm:  z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });
type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ password }: FormData) => {
    setServerError('');
    try {
      const { error } = await withTimeout(supabase.auth.updateUser({ password }), 10000);
      // Previously silent on failure — a rejected password or an expired
      // reset link just re-enabled the button with zero explanation.
      if (error) { setServerError(error.message); return; }
      navigate('/home', { replace: true });
    } catch {
      setServerError("Couldn't connect. Check your connection and try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="h-[22px] bg-[#7F77DD]" />
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 gap-6">
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-[100px] h-[40px] bg-[#7F77DD] rounded-[10px] flex items-center justify-center">
            <span className="text-white font-bold text-[16px]">SW</span>
          </div>
          <p className="text-[14px] font-bold text-[#1A1A28]">New password</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-[264px] flex flex-col gap-4">
          <Input label="New password" type="password" placeholder="Min. 8 characters" error={errors.password?.message} {...register('password')} />
          <Input label="Confirm password" type="password" placeholder="••••••••" error={errors.confirm?.message || serverError} {...register('confirm')} />
          <Button type="submit" fullWidth loading={isSubmitting}>Set new password</Button>
        </form>
      </div>
    </div>
  );
}
