import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { TrustedContact } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const schema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  phone:     z.string().min(7, 'Enter a valid phone number'),
  email:     z.string().email('Enter a valid email').or(z.literal('')).optional(),
});
type FormData = z.infer<typeof schema>;

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: 50, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
        flexShrink: 0, position: 'relative',
        background: on ? '#7F77DD' : '#C8C8D4',
        transition: 'background 0.2s ease',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3, left: 3,
          width: 22, height: 22,
          borderRadius: '50%',
          background: 'white',
          boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
          transform: `translateX(${on ? 22 : 0}px)`,
          transition: 'transform 0.2s ease',
          display: 'block',
        }}
      />
    </button>
  );
}

export default function Contacts() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [editing, setEditing]       = useState<TrustedContact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrustedContact | null>(null);
  const [isPrimary, setIsPrimary]   = useState(false);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('trusted_contacts')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at');
      return (data ?? []) as TrustedContact[];
    },
  });

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const openAdd = () => {
    setEditing(null);
    setIsPrimary(contacts.length === 0);
    reset({ full_name: '', phone: '', email: '' });
    setSheetOpen(true);
  };

  const openEdit = (c: TrustedContact) => {
    setEditing(c);
    setIsPrimary(c.is_primary);
    setValue('full_name', c.full_name);
    setValue('phone', c.phone);
    setValue('email', c.email ?? '');
    setSheetOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!user) return;
      if (isPrimary) {
        await supabase.from('trusted_contacts').update({ is_primary: false }).eq('user_id', user.id);
      }
      if (editing) {
        await supabase.from('trusted_contacts').update({
          ...data, email: data.email || null, is_primary: isPrimary,
        }).eq('id', editing.id);
      } else {
        await supabase.from('trusted_contacts').insert({
          user_id: user.id, ...data, email: data.email || null, is_primary: isPrimary,
        });
      }
    },
    onSuccess: (_, data) => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setSheetOpen(false);
      toast.success(editing ? 'Contact updated.' : `${data.full_name} added.`);
    },
    onError: () => toast.error('Could not save contact.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('trusted_contacts').delete().eq('id', id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setDeleteTarget(null);
      toast.success('Contact removed.');
    },
  });

  const remaining = 5 - contacts.length;

  return (
    <div className="min-h-full bg-[#F0F0F4]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-3 pb-3 bg-[#F0F0F4]">
        <h1 className="text-[26px] font-bold text-[#1A1A28] tracking-[-0.5px]">Contacts</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-[#7F77DD] text-white rounded-full px-3.5 font-semibold text-[13px] h-10"
          disabled={contacts.length >= 5}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add
        </button>
      </div>

      <div className="px-4 pb-6">
        {/* Info box */}
        <div className="bg-[#EEEDFE] rounded-[14px] px-3.5 py-3 flex items-start gap-2.5 mb-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-px" aria-hidden="true">
            <path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8Z"/>
          </svg>
          <p className="text-[12px] text-[#3C3489] leading-relaxed flex-1">
            Trusted contacts are notified by SMS with your live location during an emergency.
          </p>
        </div>

        {/* Contact list */}
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1,2,3].map((i) => (
              <div key={i} className="h-[72px] bg-white rounded-[14px] animate-shimmer" />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="bg-white rounded-[14px] p-8 text-center border border-[#E0E0E8]">
            <p className="text-[15px] font-semibold text-[#1A1A28] mb-1">No trusted contacts yet</p>
            <p className="text-[13px] text-[#888899]">Add at least one person who should be notified if you need help.</p>
            <button
              onClick={openAdd}
              className="mt-4 text-[13px] font-semibold text-[#534AB7]"
            >
              Add your first contact
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => openEdit(c)}
                className="flex items-center gap-3 bg-white border border-[#E0E0E8] rounded-[14px] p-3.5 text-left w-full"
              >
                <Avatar initials={c.full_name.slice(0, 2)} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-[#1A1A28] truncate">{c.full_name}</span>
                    {c.is_primary && <Badge variant="purple">Primary</Badge>}
                  </div>
                  <div className="text-[12px] text-[#888899] mt-0.5">{c.phone}</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
            ))}
          </div>
        )}

        {contacts.length > 0 && (
          <p className="text-[12px] text-[#888899] text-center mt-4">
            {contacts.length} of 5 contacts · {remaining} slot{remaining !== 1 ? 's' : ''} remaining
          </p>
        )}
      </div>

      {/* Add / edit bottom sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-40 flex flex-col">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSheetOpen(false)}
          />
          <div className="relative mt-auto z-10 bg-white rounded-[24px_24px_0_0] px-6 pb-7 shadow-[0_-10px_40px_rgba(0,0,0,0.18)]">
            {/* Handle */}
            <div className="w-11 h-1 bg-[#D5D5DD] rounded-full mx-auto mt-2 mb-4" />

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[20px] font-bold text-[#1A1A28] tracking-[-0.3px]">
                {editing ? 'Edit contact' : 'Add trusted contact'}
              </h2>
              <button
                onClick={() => setSheetOpen(false)}
                className="w-8 h-8 bg-[#F0F0F4] rounded-full flex items-center justify-center"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888899" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="flex flex-col gap-3.5">
              <Input label="Full name" placeholder="e.g. Mom" error={errors.full_name?.message} {...register('full_name')} />
              <Input label="Phone number" type="tel" placeholder="+1 (000) 000-0000" error={errors.phone?.message} {...register('phone')} />
              <Input label="Email (optional)" type="email" placeholder="optional@email.com" error={errors.email?.message} {...register('email')} />

              <div className="flex items-center justify-between bg-[#EEEDFE] rounded-[12px] px-3.5 py-3">
                <div>
                  <div className="text-[14px] font-semibold text-[#1A1A28]">Set as primary</div>
                  <div className="text-[12px] text-[#888899]">Receives a voice call during emergencies</div>
                </div>
                <Toggle on={isPrimary} onChange={setIsPrimary} />
              </div>

              <Button type="submit" fullWidth loading={isSubmitting || saveMutation.isPending} className="mt-0.5">
                Save contact
              </Button>

              {editing && (
                <button
                  type="button"
                  onClick={() => { setSheetOpen(false); setDeleteTarget(editing); }}
                  className="flex items-center justify-center gap-1.5 text-[#A32D2D] text-[13px] py-1"
                >
                  <Trash2 size={14} aria-hidden="true" /> Remove contact
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title={`Remove ${deleteTarget?.full_name}?`}
        body="They won't be notified during future walks."
        confirmLabel="Remove"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
