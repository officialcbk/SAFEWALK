import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { LogoBadge } from '../landing/LogoBadge';

const STORAGE_KEY = 'sw_onboarding_answers';

interface Question {
  id: string;
  question: (name: string) => string;
  hint?: string;
  options: string[];
  multi: boolean;
}

const QUESTIONS: Question[] = [
  {
    id: 'reason',
    question: (name) => name ? `Thanks ${name}! What brings you to SafeWalk?` : 'What brings you to SafeWalk?',
    hint: 'Select all that apply',
    multi: true,
    options: ['I walk alone often', 'I commute at night', "I'm on campus", "I'm new to an area", 'I want extra peace of mind'],
  },
  {
    id: 'when',
    question: () => 'When do you usually want extra support?',
    hint: 'Select all that apply',
    multi: true,
    options: ['Late at night', 'Early morning', 'After work or classes', 'While traveling', "Anytime I'm alone"],
  },
  {
    id: 'where',
    question: () => "Where do you usually want SafeWalk's support?",
    hint: 'Select all that apply',
    multi: true,
    options: ['Around school or campus', 'Near home', 'Around work', 'Public transit stops', 'Parking lots or garages', 'Unfamiliar places'],
  },
  {
    id: 'safety',
    question: () => 'What makes a route feel safer to you?',
    hint: 'Select all that apply',
    multi: true,
    options: ['Better lighting', 'More people nearby', 'Main roads', 'Avoiding isolated areas', 'Shorter walking time'],
  },
  {
    id: 'checkin',
    question: () => 'How would you like SafeWalk to check in?',
    multi: false,
    options: ['Gentle reminders', 'Standard check-ins', 'More frequent check-ins', 'Only when I start a walk'],
  },
  {
    id: 'priority',
    question: () => 'What should SafeWalk prioritize for your walks?',
    multi: false,
    options: ['Fastest route', 'Safest-feeling route', 'Balanced route', 'Well-lit and public route'],
  },
];

const TOTAL_STEPS = 8;

const accountSchema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
});
type AccountForm = z.infer<typeof accountSchema>;
type Answers = Record<string, string[]>;

// ── Page shell (outer bg + centering) ──────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white sm:bg-[#EEEDF8] sm:items-center sm:justify-center sm:py-12 sm:px-4">
      <div className="flex-1 sm:flex-none w-full sm:max-w-[600px] bg-white sm:rounded-[28px] sm:shadow-[0_16px_64px_rgba(38,33,92,0.14)] flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ── Logo bar (shared across all steps) ─────────────────────────────────────

function LogoBar() {
  return (
    <div className="flex items-center gap-2 px-8 sm:px-10 pt-7 pb-0 flex-shrink-0">
      <LogoBadge size={22} />
      <span className="font-extrabold text-[14px] text-[#1A1A28] tracking-[-0.3px]">SafeWalk</span>
    </div>
  );
}

// ── Progress bar ────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  return (
    <div className="px-8 sm:px-10 pt-5 pb-0 flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-[#AFA9EC] uppercase tracking-wide">
          Step {step} of {TOTAL_STEPS}
        </span>
        <span className="text-[11px] font-semibold text-[#AFA9EC]">{pct}%</span>
      </div>
      <div className="h-1.5 bg-[#EEEDF8] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#AFA9EC,#534AB7)' }}
        />
      </div>
    </div>
  );
}

// ── Card: full onboarding step wrapper ──────────────────────────────────────

function Card({
  step, children, onBack, onNext,
  nextLabel = 'Next', nextDisabled, nextLoading,
  showBack = true, footer,
}: {
  step?: number; children: React.ReactNode;
  onBack?: () => void; onNext?: () => void;
  nextLabel?: string; nextDisabled?: boolean; nextLoading?: boolean;
  showBack?: boolean; footer?: React.ReactNode;
}) {
  return (
    <Shell>
      <LogoBar />
      {step !== undefined && step > 0 && <ProgressBar step={step} />}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-8 sm:px-10 pt-8 pb-2">
        {children}
      </div>

      {/* Sticky footer */}
      <div className="px-8 sm:px-10 pb-8 pt-5 flex-shrink-0">
        <div className={`flex gap-3 ${showBack ? '' : ''}`}>
          {showBack && onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex-1 h-[52px] rounded-[14px] border-2 border-[#E0E0E8] bg-white text-[#3F3F58] font-semibold text-[15px] transition-colors hover:border-[#AFA9EC] hover:text-[#534AB7] active:scale-[0.98]"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled || nextLoading}
            className={[
              'h-[52px] rounded-[14px] font-bold text-[15px] text-white transition-all active:scale-[0.98]',
              showBack ? 'flex-1' : 'w-full',
              nextDisabled || nextLoading
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:opacity-90 cursor-pointer',
            ].join(' ')}
            style={{ background: 'linear-gradient(135deg,#7F77DD,#534AB7)', boxShadow: nextDisabled || nextLoading ? 'none' : '0 4px 20px rgba(83,74,183,0.30)' }}
          >
            {nextLoading
              ? <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : nextLabel}
          </button>
        </div>
        {footer && <div className="mt-4 text-center">{footer}</div>}
      </div>
    </Shell>
  );
}

// ── Option button (MFP-style: border, no icon) ──────────────────────────────

function Option({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full text-left transition-all duration-150 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7F77DD]/40"
      style={{
        padding: '15px 20px',
        borderRadius: 14,
        border: `2px solid ${selected ? '#7F77DD' : '#E5E5F0'}`,
        background: selected ? '#EEEDFE' : 'white',
        color: selected ? '#3C3489' : '#1A1A28',
        fontSize: 15,
        fontWeight: selected ? 600 : 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: selected ? '0 0 0 4px rgba(127,119,221,0.10)' : 'none',
      }}
    >
      <span>{label}</span>
      {selected && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="9" fill="#7F77DD"/>
          <path d="M5 9l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

// ── Password strength ───────────────────────────────────────────────────────

function StrengthBar({ pw }: { pw: string }) {
  if (!pw) return null;
  const s = pw.length < 6
    ? { label: 'Weak',   color: '#E24B4A', w: '33%'  }
    : pw.length < 10
    ? { label: 'Fair',   color: '#E8A020', w: '66%'  }
    : { label: 'Strong', color: '#3B9E5A', w: '100%' };
  return (
    <div className="flex items-center gap-3 mt-2.5">
      <div className="flex-1 h-1.5 bg-[#F0F0F6] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: s.w, background: s.color }} />
      </div>
      <span className="text-[12px] font-semibold w-12 text-right" style={{ color: s.color }}>{s.label}</span>
    </div>
  );
}

// ── Text input ──────────────────────────────────────────────────────────────

function BigInput({ value, onChange, onEnter, placeholder, type = 'text', autoFocus, error }: {
  value: string; onChange: (v: string) => void; onEnter?: () => void;
  placeholder: string; type?: string; autoFocus?: boolean; error?: string;
}) {
  return (
    <div>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        autoComplete={type === 'email' ? 'email' : type === 'password' ? 'new-password' : 'given-name'}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter(); }}
        style={{
          width: '100%',
          border: `2px solid ${error ? '#E24B4A' : '#E5E5F0'}`,
          borderRadius: 14,
          padding: '16px 20px',
          fontSize: 16,
          color: '#1A1A28',
          background: 'white',
          outline: 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxSizing: 'border-box',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = error ? '#E24B4A' : '#7F77DD';
          e.currentTarget.style.boxShadow = error ? '0 0 0 4px rgba(226,75,74,0.10)' : '0 0 0 4px rgba(127,119,221,0.12)';
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = error ? '#E24B4A' : '#E5E5F0';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      {error && <p className="text-[13px] text-[#E24B4A] mt-1.5 font-medium">{error}</p>}
    </div>
  );
}

// ── Section heading ─────────────────────────────────────────────────────────

function StepHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-8">
      <h2 className="text-[24px] sm:text-[26px] font-bold text-[#1A1A28] tracking-[-0.5px] leading-[1.25]">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[14px] text-[#6F6F84] mt-2.5 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function OnboardingFlow() {
  const navigate  = useNavigate();
  const { session } = useAuthStore();
  const [step, setStep]           = useState(0);
  const [firstName, setFirstName] = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [answers, setAnswers] = useState<Answers>({});

  const { handleSubmit, formState: { errors }, clearErrors } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    values: { email, password },
  });

  if (session) return <Navigate to="/home" replace />;

  const q   = step >= 2 && step <= 7 ? QUESTIONS[step - 2] : null;
  const sel = q ? (answers[q.id] || []) : [];

  const toggle = (id: string, option: string, multi: boolean) => {
    setAnswers(prev => {
      const cur = prev[id] || [];
      if (multi) return { ...prev, [id]: cur.includes(option) ? cur.filter(o => o !== option) : [...cur, option] };
      return { ...prev, [id]: [option] };
    });
  };

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  const onCreateAccount = async () => {
    setServerError('');
    setSubmitting(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...answers, name: [firstName] }));
      const { data: authData, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: firstName } },
      });
      if (error) {
        setServerError(
          error.message.includes('already registered') || error.message.includes('already exists')
            ? 'An account with this email already exists.'
            : error.message
        );
        return;
      }
      if (authData.session) {
        await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', authData.session.user.id);
        navigate('/home', { replace: true });
      } else {
        navigate('/auth/check-email', { state: { email } });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const validateAndSubmit = handleSubmit(onCreateAccount);

  // ── Step 0: Welcome ─────────────────────────────────────────────────────
  if (step === 0) return (
    <Shell>
      <LogoBar />

      {/* Illustration */}
      <div
        className="mx-8 sm:mx-10 mt-6 rounded-[20px] flex flex-col items-center justify-center relative overflow-hidden flex-shrink-0"
        style={{ height: 200, background: 'linear-gradient(160deg,#EEEDFE 0%,#D8D5FB 100%)' }}
      >
        <div className="absolute w-[240px] h-[240px] rounded-full" style={{ border: '1.5px solid rgba(127,119,221,0.22)' }}/>
        <div className="absolute w-[172px] h-[172px] rounded-full" style={{ border: '1.5px solid rgba(127,119,221,0.32)' }}/>
        <div className="absolute w-[108px] h-[108px] rounded-full" style={{ background: 'rgba(127,119,221,0.10)' }}/>
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center z-10"
          style={{ background: 'linear-gradient(135deg,#7F77DD,#534AB7)', boxShadow: '0 12px 40px rgba(127,119,221,0.42)' }}
        >
          <svg viewBox="0 0 64 64" width="42" height="42">
            <circle cx="32" cy="32" r="22" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
            <circle cx="32" cy="32" r="14" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5"/>
            <circle cx="32" cy="32" r="6" fill="white"/>
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-8 sm:px-10 pt-7 pb-0">
        <h1 className="text-[26px] sm:text-[28px] font-bold text-[#1A1A28] tracking-[-0.5px] leading-[1.2] text-center">
          Let's personalize<br />SafeWalk for you.
        </h1>
        <p className="text-[15px] text-[#6F6F84] leading-relaxed mt-3 text-center">
          Answer a few quick questions so SafeWalk can adapt to how, when, and where you like extra support.
        </p>
        <div className="flex-1" />
      </div>

      {/* Footer */}
      <div className="px-8 sm:px-10 pb-8 pt-5">
        <button
          type="button"
          onClick={next}
          className="w-full h-[52px] rounded-[14px] font-bold text-[15px] text-white hover:opacity-90 active:scale-[0.98] transition-all"
          style={{ background: 'linear-gradient(135deg,#7F77DD,#534AB7)', boxShadow: '0 4px 20px rgba(83,74,183,0.30)' }}
        >
          Get started
        </button>
        <p className="text-[13px] text-[#888899] text-center mt-4">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-[#534AB7] font-semibold" style={{ textDecoration: 'none' }}>Sign in →</Link>
        </p>
      </div>
    </Shell>
  );

  // ── Step 1: First name ──────────────────────────────────────────────────
  if (step === 1) return (
    <Card step={1} showBack={false} onNext={next} nextDisabled={!firstName.trim()}>
      <StepHeading
        title="What's your first name?"
        subtitle="We'd love to make this feel personal."
      />
      <BigInput
        value={firstName}
        onChange={setFirstName}
        onEnter={() => firstName.trim() && next()}
        placeholder="First name"
        autoFocus
      />
    </Card>
  );

  // ── Steps 2-7: Preference questions ────────────────────────────────────
  if (q) return (
    <Card
      step={step}
      onBack={back}
      onNext={next}
      nextDisabled={sel.length === 0}
      nextLabel={step === 7 ? 'Next — Create account' : 'Next'}
    >
      <StepHeading
        title={q.question(firstName)}
        subtitle={q.hint}
      />
      <div className="flex flex-col gap-3">
        {q.options.map(option => (
          <Option
            key={option}
            label={option}
            selected={sel.includes(option)}
            onToggle={() => toggle(q.id, option, q.multi)}
          />
        ))}
      </div>
    </Card>
  );

  // ── Step 8: Create account ──────────────────────────────────────────────
  if (step === 8) return (
    <Card
      step={8}
      onBack={back}
      onNext={validateAndSubmit}
      nextLabel="Create account"
      nextLoading={submitting}
      footer={
        <p className="text-[13px] text-[#888899]">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-[#534AB7] font-semibold" style={{ textDecoration: 'none' }}>Sign in →</Link>
        </p>
      }
    >
      <StepHeading
        title={`Almost there${firstName ? `, ${firstName}` : ''}!`}
        subtitle="Create your account to start walking safer."
      />
      <div className="flex flex-col gap-4">
        <BigInput
          value={email}
          onChange={v => { setEmail(v); clearErrors('email'); setServerError(''); }}
          placeholder="Email address"
          type="email"
          error={errors.email?.message}
        />
        <div>
          <BigInput
            value={password}
            onChange={v => { setPassword(v); clearErrors('password'); }}
            placeholder="Create a password"
            type="password"
            error={errors.password?.message || serverError}
          />
          <StrengthBar pw={password} />
        </div>
        <p className="text-[12px] text-[#9999AA] text-center leading-relaxed">
          By creating an account you agree to our{' '}
          <a href="#" className="text-[#534AB7] font-medium" style={{ textDecoration: 'none' }}>Terms of Service</a>
          {' & '}
          <a href="#" className="text-[#534AB7] font-medium" style={{ textDecoration: 'none' }}>Privacy Policy</a>.
        </p>
      </div>
    </Card>
  );

  return null;
}
