import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';

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
    <div className="min-h-screen bg-white flex flex-col">
      <div className="h-[22px] bg-[#7F77DD]" />
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 gap-6">
        <div className="w-[72px] h-[72px] rounded-full bg-[#EAF3DE] flex items-center justify-center">
          <CheckCircle2 size={32} className="text-[#3B6D11]" />
        </div>
        <div className="text-center flex flex-col gap-2">
          <p className="text-[14px] font-bold text-[#1A1A28]">Check your email</p>
          <p className="text-[11px] text-[#888899] leading-relaxed">
            We sent a confirmation link to<br />
            <strong className="text-[#1A1A28]">{email}</strong><br />
            Click it to activate your account.
          </p>
        </div>

        <div className="w-full max-w-[264px] flex flex-col gap-3">
          {email && (
            <a href={`mailto:${email}`} className="block">
              <Button fullWidth>Open email app</Button>
            </a>
          )}
          <Button
            variant="ghost"
            fullWidth
            onClick={resend}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
          </Button>
        </div>

        <Link to="/sign-in" className="text-[9px] text-[#7F77DD]">← Back to sign in</Link>
      </div>
    </div>
  );
}
