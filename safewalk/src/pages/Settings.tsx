import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useWalkStore } from '../store/walkStore';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';

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

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[13px] font-semibold text-[#888899] uppercase tracking-[0.6px] pt-4 pb-2">
      {label}
    </p>
  );
}

function SettingRow({
  label, sub, right, onClick, danger, isLast,
}: {
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  isLast?: boolean;
}) {
  const El = onClick ? 'button' : 'div';
  return (
    <El
      className={`flex items-center w-full px-4 py-3.5 gap-3 min-h-[52px] text-left ${onClick ? 'cursor-pointer hover:bg-[#F8F8FA] active:bg-[#F0F0F4]' : ''} ${isLast ? '' : 'border-b border-[#E0E0E8]'}`}
      onClick={onClick}
      type={onClick && El === 'button' ? 'button' : undefined}
    >
      <div className="flex-1 min-w-0">
        <div className={`text-[14px] font-semibold ${danger ? 'text-[#A32D2D]' : 'text-[#1A1A28]'}`}>{label}</div>
        {sub && <div className="text-[12px] text-[#888899] mt-0.5">{sub}</div>}
      </div>
      {right ?? (onClick && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      ))}
    </El>
  );
}

export default function Settings() {
  const { user, profile, clear } = useAuthStore();
  const { endWalk } = useWalkStore();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [prefs, setPrefs] = useState({ checkin_reminders: true, walk_summary: true, auto_delete: true });

  const { data: profileData } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
      return data;
    },
  });

  const displayName = profileData?.full_name ?? profile?.full_name ?? user?.email ?? 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  const signOut = async () => {
    await supabase.auth.signOut();
    endWalk();
    clear();
    navigate('/sign-in', { replace: true });
  };

  const exportData = async () => {
    if (!user) return;
    const [{ data: p }, { data: c }, { data: w }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id),
      supabase.from('trusted_contacts').select('*').eq('user_id', user.id),
      supabase.from('walk_sessions').select('*').eq('user_id', user.id),
    ]);
    const blob = new Blob([JSON.stringify({ profile: p, contacts: c, walks: w }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `safewalk-data-${Date.now()}.json`;
    a.click();
  };

  const deleteAll = async () => {
    if (!user || deleteInput !== 'DELETE') return;
    await Promise.all([
      supabase.from('trusted_contacts').delete().eq('user_id', user.id),
      supabase.from('walk_sessions').delete().eq('user_id', user.id),
    ]);
    await supabase.functions.invoke('delete-account', { body: { user_id: user.id } });
    await supabase.auth.signOut();
    endWalk();
    clear();
    navigate('/sign-in', { replace: true });
    toast.success('All data deleted. Account removed.');
  };

  return (
    <div className="min-h-full bg-[#F0F0F4]">
      {/* Header */}
      <div className="px-5 pt-3 pb-3">
        <h1 className="text-[26px] font-bold text-[#1A1A28] tracking-[-0.5px]">Settings</h1>
      </div>

      <div className="px-4 pb-8">
        {/* Profile card */}
        <div className="bg-white border border-[#E0E0E8] rounded-[14px] p-4 flex items-center gap-3.5 mb-2">
          <Avatar initials={initials} size={56} />
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-bold text-[#1A1A28] truncate">{displayName}</div>
            <div className="text-[12px] text-[#888899] truncate">{user?.email}</div>
          </div>
          <button className="h-9 px-3.5 bg-[#EEEDFE] text-[#534AB7] border border-[#DCD9FB] rounded-[14px] text-[13px] font-semibold">
            Edit
          </button>
        </div>

        {/* Notifications */}
        <SectionHeader label="Notifications" />
        <div className="bg-white border border-[#E0E0E8] rounded-[14px] overflow-hidden">
          <SettingRow
            label="Check-in reminders"
            sub="In-app countdown during walks"
            right={<Toggle on={prefs.checkin_reminders} onChange={(v) => setPrefs((p) => ({ ...p, checkin_reminders: v }))} />}
          />
          <SettingRow
            label="Walk summary"
            sub="Toast when a walk ends"
            right={<Toggle on={prefs.walk_summary} onChange={(v) => setPrefs((p) => ({ ...p, walk_summary: v }))} />}
            isLast
          />
        </div>

        {/* Privacy */}
        <SectionHeader label="Privacy" />
        <div className="bg-white border border-[#E0E0E8] rounded-[14px] overflow-hidden">
          <SettingRow
            label="Location only during walks"
            sub="Background tracking is never used"
            right={<Toggle on={true} onChange={() => {}} />}
          />
          <SettingRow
            label="Auto-delete after 30 days"
            sub="Walks & location data"
            right={<Toggle on={prefs.auto_delete} onChange={(v) => setPrefs((p) => ({ ...p, auto_delete: v }))} />}
          />
          <SettingRow label="Privacy policy" onClick={() => {}} isLast />
        </div>

        {/* Data */}
        <SectionHeader label="Your data" />
        <div className="bg-white border border-[#E0E0E8] rounded-[14px] overflow-hidden">
          <SettingRow
            label="Export my data"
            right={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>
              </svg>
            }
            onClick={exportData}
          />
          <SettingRow label="Delete all my data" danger onClick={() => setShowDeleteConfirm(true)} isLast />
        </div>

        {/* Footer */}
        <p className="text-center text-[12px] text-[#888899] mt-6">SafeWalk v1.0.0 · PIPEDA compliant</p>

        <Button
          variant="text"
          fullWidth
          onClick={signOut}
          className="mt-3 text-[#A32D2D] hover:text-[#A32D2D] flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>
          </svg>
          Sign out
        </Button>
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-[18px] w-full max-w-[320px] p-6 flex flex-col gap-4">
            <h2 className="text-[16px] font-bold text-[#A32D2D]">Delete all data?</h2>
            <p className="text-[13px] text-[#888899] leading-relaxed">
              This will permanently delete your account, contacts, and walk history. Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="Type DELETE"
              className="w-full h-[52px] px-4 text-[14px] bg-white border border-[#E24B4A] rounded-[12px] outline-none focus:shadow-[0_0_0_3px_rgba(226,75,74,0.15)]"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-[52px] rounded-[14px] border border-[#E0E0E8] text-[14px] font-semibold text-[#888899]"
              >
                Cancel
              </button>
              <button
                onClick={deleteAll}
                disabled={deleteInput !== 'DELETE'}
                className="flex-1 h-[52px] rounded-[14px] bg-[#E24B4A] text-white text-[14px] font-semibold disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
