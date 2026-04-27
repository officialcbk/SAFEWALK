import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Home, Users, MapPin, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const contactSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  phone:     z.string().min(7, 'Enter a valid phone number'),
  email:     z.string().email('Enter a valid email').or(z.literal('')).optional(),
  is_primary: z.boolean().optional(),
});
type ContactForm = z.infer<typeof contactSchema>;

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={
            i === step
              ? 'w-4 h-1.5 rounded-full bg-[#7F77DD]'
              : 'w-1.5 h-1.5 rounded-full bg-[#E0E0E8]'
          }
        />
      ))}
    </div>
  );
}

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [step, setStep] = useState(0);
  const [isPrimary, setIsPrimary] = useState(true);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { is_primary: true },
  });

  const finish = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);
    navigate('/home', { replace: true });
  };

  const onSaveContact = async (data: ContactForm) => {
    if (!user) return;
    const { error } = await supabase.from('trusted_contacts').insert({
      user_id:    user.id,
      full_name:  data.full_name,
      phone:      data.phone,
      email:      data.email || null,
      is_primary: isPrimary,
    });
    if (error) { toast.error('Could not save contact.'); return; }
    toast.success(`${data.full_name} added as a trusted contact.`);
    setStep(2);
  };

  const requestLocation = () => {
    navigator.geolocation?.getCurrentPosition(() => {}, () => {});
    finish();
  };

  // ── Step 1: Welcome ──────────────────────────────────────────────────────
  if (step === 0) return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Illustration area */}
      <div className="bg-[#EEEDFE] flex flex-col items-center justify-end pb-8" style={{ height: 258 }}>
        <div className="relative flex items-center justify-center">
          <div className="absolute w-[220px] h-[220px] rounded-full border-2 border-[#7F77DD]/30" />
          <div className="absolute w-[180px] h-[180px] rounded-full border-2 border-[#7F77DD]/30" />
          <div className="w-[140px] h-[140px] rounded-full bg-[#7F77DD] flex items-center justify-center z-10">
            <Home size={48} className="text-white" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 pt-6 pb-8 gap-4">
        <ProgressDots step={0} />
        <h1 className="text-[15px] font-bold text-[#1A1A28] text-center mt-2">Stay safe while you walk</h1>
        <p className="text-[9px] text-[#888899] text-center leading-relaxed max-w-[240px]">
          SafeWalk monitors your journey and alerts your trusted contacts if something seems wrong. Simple, fast, reliable.
        </p>
        <div className="mt-auto w-full">
          <Button fullWidth onClick={() => setStep(1)}>Next →</Button>
        </div>
      </div>
    </div>
  );

  // ── Step 2: Add contact ──────────────────────────────────────────────────
  if (step === 1) return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-[#EEEDFE] flex flex-col items-center justify-end pb-6" style={{ height: 118 }}>
        <div className="w-[72px] h-[72px] rounded-full bg-[#7F77DD] flex items-center justify-center">
          <Users size={28} className="text-white" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 pt-5 pb-8 gap-4">
        <ProgressDots step={1} />
        <h1 className="text-[14px] font-bold text-[#1A1A28] text-center">Add your trusted contacts</h1>
        <p className="text-[9px] text-[#888899] text-center leading-relaxed max-w-[240px]">
          Choose up to 5 people who'll be notified if you need help. They don't need the app.
        </p>

        <form onSubmit={handleSubmit(onSaveContact)} className="w-full flex flex-col gap-3 mt-1">
          <Input label="Full name *" placeholder="Contact name" error={errors.full_name?.message} {...register('full_name')} />
          <Input label="Phone number *" type="tel" placeholder="+1 (204) 555-0000" error={errors.phone?.message} {...register('phone')} />
          <Input label="Email" type="email" placeholder="Optional" error={errors.email?.message} {...register('email')} />

          <div className="flex items-center justify-between bg-[#F0F0F4] rounded-[8px] px-3 py-2.5">
            <div>
              <p className="text-[9px] font-semibold text-[#1A1A28]">Set as primary contact</p>
              <p className="text-[8px] text-[#888899]">First called if SOS</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPrimary}
              onClick={() => setIsPrimary((v) => !v)}
              className={`w-7 h-4 rounded-full transition-colors relative ${isPrimary ? 'bg-[#7F77DD]' : 'bg-[#E0E0E8]'}`}
            >
              <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${isPrimary ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <Button type="submit" fullWidth loading={isSubmitting}>Add contact &amp; continue</Button>
        </form>

        <Button variant="ghost" fullWidth onClick={() => setStep(2)}>Skip for now</Button>
      </div>
    </div>
  );

  // ── Step 3: Location permission ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[rgba(40,36,80,0.85)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[280px] bg-white rounded-[18px] p-6 flex flex-col items-center gap-4 shadow-[0_8px_40px_rgba(0,0,0,0.18)]">
        <div className="w-16 h-16 rounded-full bg-[#EEEDFE] flex items-center justify-center">
          <MapPin size={26} className="text-[#7F77DD]" />
        </div>
        <div className="text-center">
          <p className="text-[13px] font-bold text-[#1A1A28]">Allow location access</p>
          <p className="text-[9px] text-[#888899] leading-relaxed mt-1">
            SafeWalk needs your location only while a walk is active. We never track you in the background.
          </p>
        </div>

        <div className="w-full bg-[#EEEDFE] border-l-[3px] border-[#7F77DD] rounded-r-lg px-3 py-2 flex items-start gap-2">
          <Lock size={11} className="text-[#534AB7] mt-0.5 flex-shrink-0" />
          <p className="text-[8px] text-[#534AB7]">Location is only active during walks and deleted after 30 days</p>
        </div>

        <Button fullWidth onClick={requestLocation}>Allow location</Button>
        <button onClick={finish} className="text-[9px] text-[#888899] hover:text-[#1A1A28]">Not now</button>
      </div>
      <div className="mt-6">
        <ProgressDots step={2} />
      </div>
    </div>
  );
}
