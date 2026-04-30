import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { AuthPage } from '../../components/layout/AuthPage';

export default function CheckEmail() {
  const location = useLocation();
  const email = (location.state as { email?: string })?.email ?? '';
  const [cooldown, setCooldown] = useState(0);

  const resend = async () => {
    if (!email || cooldown > 0) return;
    await supabase.auth.resend({ type: 'signup', email });
    setCooldown(60);
    const t = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) { clearInterval(t); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  return (
    <AuthPage title="Check your email">
      <div className="flex flex-col flex-1 items-center justify-center text-center gap-6 py-8">
        {/* Green circle with mail icon */}
        <div
          className="w-[88px] h-[88px] rounded-full flex items-center justify-center"
          style={{ background: '#EAF3DE' }}
          aria-hidden="true"
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3B6D11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>
          </svg>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="text-[26px] font-bold text-[#1A1A28] tracking-[-0.5px]">Check your email</div>
          <div className="text-[14px] text-[#4A4A5A] leading-relaxed">We sent a confirmation link to</div>
          <div className="text-[15px] font-bold text-[#1A1A28]">{email || 'your inbox'}</div>
          <div className="text-[14px] text-[#4A4A5A]">Click it to activate your account.</div>
        </div>

        <div className="flex flex-col gap-2.5 w-full">
          {email && (
            <a href={`mailto:${email}`} className="block w-full">
              <Button fullWidth>Open email app</Button>
            </a>
          )}
          <Button
            variant="ghost"
            fullWidth
            onClick={resend}
            disabled={cooldown > 0}
            aria-live="polite"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
          </Button>
        </div>

        <Link
          to="/sign-in"
          className="text-[13px] font-semibold text-[#534AB7] no-underline mt-2"
        >
          ← Back to sign in
        </Link>
      </div>
    </AuthPage>
  );
}
