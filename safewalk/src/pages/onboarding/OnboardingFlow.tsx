import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const contactSchema = z.object({
  full_name:  z.string().min(1, 'Name is required'),
  phone:      z.string().min(7, 'Enter a valid phone number'),
  email:      z.string().email('Enter a valid email').or(z.literal('')).optional(),
  is_primary: z.boolean().optional(),
});
type ContactForm = z.infer<typeof contactSchema>;

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-1.5 rounded-full transition-all duration-200"
          style={{
            width: i === step ? 18 : 6,
            background: i === step ? '#7F77DD' : '#AFA9EC',
          }}
        />
      ))}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`w-11 h-[26px] rounded-full transition-colors relative flex-shrink-0 ${on ? 'bg-[#7F77DD]' : 'bg-[#E0E0E8]'}`}
    >
      <span
        className={`absolute top-[3px] w-5 h-5 bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-transform ${on ? 'translate-x-[18px]' : 'translate-x-[3px]'}`}
      />
    </button>
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
      user_id: user.id, full_name: data.full_name, phone: data.phone,
      email: data.email || null, is_primary: isPrimary,
    });
    if (error) { toast.error('Could not save contact.'); return; }
    toast.success(`${data.full_name} added.`);
    setStep(2);
  };

  const requestLocation = () => {
    navigator.geolocation?.getCurrentPosition(() => {}, () => {});
    finish();
  };

  // ── Step 1: Welcome ───────────────────────────────────────────────────────
  if (step === 0) return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Purple illustration */}
      <div
        className="flex flex-col items-center justify-center relative overflow-hidden"
        style={{ height: 320, background: '#EEEDFE', borderRadius: '0 0 32px 32px' }}
      >
        {/* Concentric rings */}
        <div className="absolute w-[280px] h-[280px] rounded-full border-[1.5px] border-[rgba(127,119,221,0.25)]" />
        <div className="absolute w-[220px] h-[220px] rounded-full border-[1.5px] border-[rgba(127,119,221,0.35)]" />
        <div className="absolute w-[160px] h-[160px] rounded-full bg-[rgba(127,119,221,0.18)]" />
        {/* Center disc */}
        <div
          className="w-[110px] h-[110px] rounded-full flex items-center justify-center relative"
          style={{
            background: 'linear-gradient(135deg, #7F77DD, #534AB7)',
            boxShadow: '0 12px 30px rgba(127,119,221,0.45)',
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="13" cy="4" r="2"/><path d="m13 7-2 4 3 3v6"/><path d="m11 11-3 1-2 4"/><path d="M14 14h4"/>
          </svg>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-7 pt-8 pb-7 gap-4">
        <ProgressDots step={0} />
        <h1 className="text-[26px] font-bold text-[#1A1A28] text-center tracking-[-0.5px] mt-2">
          Stay safe while you walk.
        </h1>
        <p className="text-[14px] text-[#4A4A5A] text-center leading-relaxed">
          SafeWalk monitors your journey and alerts your trusted contacts if something seems wrong.
        </p>
        <div className="flex-1" />
        <Button fullWidth onClick={() => setStep(1)}>Next</Button>
      </div>
    </div>
  );

  // ── Step 2: Add contact ───────────────────────────────────────────────────
  if (step === 1) return (
    <div className="min-h-screen bg-white flex flex-col px-7 pt-6 pb-7">
      <div className="mb-5">
        <ProgressDots step={1} />
      </div>
      <h1 className="text-[26px] font-bold text-[#1A1A28] tracking-[-0.5px] mb-2.5">
        Add your trusted contacts.
      </h1>
      <p className="text-[14px] text-[#4A4A5A] leading-relaxed mb-6">
        Choose up to 5 people who'll be notified if you need help. They don't need the app.
      </p>

      <form onSubmit={handleSubmit(onSaveContact)} className="flex flex-col gap-3.5">
        <Input label="Full name" placeholder="Mom" error={errors.full_name?.message} {...register('full_name')} />
        <Input label="Phone number" type="tel" placeholder="+1 (555) 000-0000" error={errors.phone?.message} {...register('phone')} />
        <Input label="Email (optional)" type="email" placeholder="optional@email.com" error={errors.email?.message} {...register('email')} />

        <div className="flex items-center justify-between bg-[#EEEDFE] rounded-[12px] px-3.5 py-3">
          <div>
            <div className="text-[14px] font-semibold text-[#1A1A28]">Set as primary</div>
            <div className="text-[12px] text-[#888899]">Receives a voice call during emergencies</div>
          </div>
          <Toggle on={isPrimary} onChange={setIsPrimary} />
        </div>

        <Button type="submit" fullWidth loading={isSubmitting} className="mt-1">
          Add contact and continue
        </Button>
      </form>

      <button
        onClick={() => setStep(2)}
        className="mt-2 py-3 text-[14px] font-semibold text-[#534AB7] text-center"
      >
        Skip for now
      </button>
    </div>
  );

  // ── Step 3: Location permission ───────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: 'rgba(40,36,80,0.85)' }}>
      {/* Dimmed map background */}
      <div className="absolute inset-0 bg-[#EEF1F6] opacity-40" aria-hidden="true" />

      <div className="flex-1" />

      {/* Bottom sheet */}
      <div
        className="relative z-10 bg-white px-6 pb-8 pt-2"
        style={{ borderRadius: '24px 24px 0 0', boxShadow: '0 -10px 40px rgba(0,0,0,0.2)' }}
      >
        <div className="w-11 h-1 bg-[#D5D5DD] rounded-full mx-auto mb-4" />

        <div className="flex justify-center mb-4">
          <ProgressDots step={2} />
        </div>

        <div className="w-16 h-16 rounded-full bg-[#EEEDFE] flex items-center justify-center mb-3.5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </div>

        <h1 className="text-[26px] font-bold text-[#1A1A28] tracking-[-0.5px] mb-2.5">
          Allow location access.
        </h1>
        <p className="text-[14px] text-[#4A4A5A] leading-relaxed mb-4">
          SafeWalk needs your location only while a walk is active. We never track you in the background.
        </p>

        <div className="bg-[#EEEDFE] rounded-[12px] px-3.5 py-3 flex items-start gap-2.5 mb-5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-px" aria-hidden="true">
            <path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8Z"/>
          </svg>
          <p className="text-[12px] text-[#3C3489] leading-relaxed">
            Location is only active during walks and deleted after 30 days.
          </p>
        </div>

        <Button fullWidth onClick={requestLocation}>Allow location</Button>
        <button
          onClick={finish}
          className="w-full py-3 mt-1 text-[14px] font-semibold text-[#534AB7] text-center"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
