import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useWalkStore } from '../store/walkStore';
import { Avatar } from '../components/ui/Avatar';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`w-7 h-4 rounded-full transition-colors relative ${on ? 'bg-[#7F77DD]' : 'bg-[#E0E0E8]'}`}
    >
      <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function SectionHeader({ label }: { label: string }) {
  return <p className="text-[7px] font-bold uppercase tracking-wider text-[#888899] mt-5 mb-1.5">{label}</p>;
}

function SettingRow({ label, right, onClick }: { label: string; right?: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2.5 min-h-[44px] ${onClick ? 'cursor-pointer hover:bg-[#F0F0F4]' : ''}`}
      onClick={onClick}
    >
      <span className="text-[9px] text-[#1A1A28]">{label}</span>
      {right ?? (onClick && <ChevronRight size={12} className="text-[#888899]" />)}
    </div>
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
  const initials    = displayName.slice(0, 2).toUpperCase();

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
    <div className="px-4 pt-5 pb-8">
      <h1 className="text-[13px] font-bold text-[#1A1A28] mb-4">Settings</h1>

      {/* Profile card */}
      <div className="flex items-center gap-3 p-3 bg-white border border-[#E0E0E8] rounded-[10px]">
        <Avatar initials={initials} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-[#1A1A28] truncate">{displayName}</p>
          <p className="text-[8px] text-[#888899] truncate">{user?.email}</p>
        </div>
        <span className="text-[9px] text-[#7F77DD] font-medium">Edit ›</span>
      </div>

      {/* Notifications */}
      <SectionHeader label="Notifications" />
      <div className="bg-white border border-[#E0E0E8] rounded-[10px] divide-y divide-[#F0F0F4]">
        <SettingRow label="Check-in reminders" right={<Toggle on={prefs.checkin_reminders} onChange={(v) => setPrefs((p) => ({ ...p, checkin_reminders: v }))} />} />
        <SettingRow label="Walk summary" right={<Toggle on={prefs.walk_summary} onChange={(v) => setPrefs((p) => ({ ...p, walk_summary: v }))} />} />
      </div>

      {/* Privacy */}
      <SectionHeader label="Privacy" />
      <div className="bg-white border border-[#E0E0E8] rounded-[10px] divide-y divide-[#F0F0F4]">
        <SettingRow label="Location only during walks" right={<Toggle on={true} onChange={() => {}} />} />
        <SettingRow label="Auto-delete after 30 days" right={<Toggle on={prefs.auto_delete} onChange={(v) => setPrefs((p) => ({ ...p, auto_delete: v }))} />} />
        <SettingRow label="Privacy policy" onClick={() => {}} />
      </div>

      {/* Data */}
      <SectionHeader label="Data" />
      <div className="bg-white border border-[#E0E0E8] rounded-[10px] divide-y divide-[#F0F0F4]">
        <SettingRow label="Export my data" onClick={exportData} />
      </div>

      {/* Danger */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-[9px] text-[#A32D2D]"
        >
          Delete all my data
        </button>
        <button onClick={signOut} className="text-[9px] text-[#888899]">Sign out</button>
      </div>

      <p className="text-center text-[7px] text-[#888899] mt-8">SafeWalk v1.0.0 · PIPEDA compliant</p>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-[18px] w-full max-w-[320px] p-6 flex flex-col gap-4">
            <h2 className="text-[13px] font-bold text-[#A32D2D]">Delete all data?</h2>
            <p className="text-[11px] text-[#888899] leading-relaxed">
              This will permanently delete your account, contacts, and walk history. Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="Type DELETE"
              className="w-full h-10 px-3 text-[11px] border border-[#E24B4A] rounded-[6px] outline-none focus:ring-2 focus:ring-[#E24B4A]/20"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 h-10 rounded-[50px] border border-[#E0E0E8] text-[11px] text-[#888899]">Cancel</button>
              <button
                onClick={deleteAll}
                disabled={deleteInput !== 'DELETE'}
                className="flex-1 h-10 rounded-[50px] bg-[#E24B4A] text-white text-[11px] font-bold disabled:opacity-40"
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
