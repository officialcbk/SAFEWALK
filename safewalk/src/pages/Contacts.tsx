import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { TrustedContact } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BottomSheet } from '../components/ui/BottomSheet';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';

const schema = z.object({
  full_name:  z.string().min(1, 'Name is required'),
  phone:      z.string().min(7, 'Enter a valid phone number'),
  email:      z.string().email('Enter a valid email').or(z.literal('')).optional(),
});
type FormData = z.infer<typeof schema>;

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
          ...data,
          email: data.email || null,
          is_primary: isPrimary,
        }).eq('id', editing.id);
      } else {
        await supabase.from('trusted_contacts').insert({
          user_id: user.id,
          ...data,
          email: data.email || null,
          is_primary: isPrimary,
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
    <div className="px-4 pt-5 pb-4">
      <h1 className="text-[13px] font-bold text-[#1A1A28] mb-4">Trusted contacts</h1>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1,2,3].map((i) => (
            <div key={i} className="h-[52px] bg-[#F0F0F4] rounded-[10px] animate-shimmer" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No trusted contacts yet"
          body="Add at least one person who should be notified if you need help."
          actionLabel="Add your first contact"
          onAction={openAdd}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => openEdit(c)}
              className="flex items-center gap-3 p-3 bg-white border border-[#E0E0E8] rounded-[10px] text-left w-full min-h-[52px] hover:bg-[#F0F0F4] transition-colors"
            >
              <Avatar initials={c.full_name.slice(0, 2)} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-[#1A1A28] truncate">{c.full_name}</p>
                <p className="text-[8px] text-[#888899]">{c.phone}</p>
              </div>
              {c.is_primary && <Badge variant="purple">Primary</Badge>}
              <span className="text-[11px] text-[#888899]">›</span>
            </button>
          ))}

          {remaining > 0 && (
            <button
              onClick={openAdd}
              className="flex items-center gap-3 p-3 bg-white border border-[#E0E0E8] rounded-[10px] w-full min-h-[42px] hover:bg-[#F0F0F4] transition-colors"
            >
              <div className="w-5 h-5 rounded-full bg-[#EEEDFE] flex items-center justify-center">
                <Plus size={10} className="text-[#7F77DD]" />
              </div>
              <span className="text-[9px] text-[#888899]">Add contact ({remaining} of 5 remaining)</span>
            </button>
          )}
        </div>
      )}

      {/* Info box */}
      {contacts.length > 0 && (
        <div className="mt-4 bg-[#EEEDFE] border-l-[3px] border-[#7F77DD] rounded-r-lg px-3 py-2">
          <p className="text-[8px] text-[#534AB7] leading-relaxed">
            The primary contact will receive a voice call in addition to SMS during an emergency.
          </p>
        </div>
      )}

      {/* Add / edit sheet */}
      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)}>
        <h2 className="text-[13px] font-bold text-[#1A1A28] text-center mb-5">
          {editing ? 'Edit contact' : 'Add trusted contact'}
        </h2>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="flex flex-col gap-3">
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

          <Button type="submit" fullWidth loading={isSubmitting || saveMutation.isPending}>
            Save contact
          </Button>
          {editing && (
            <button
              type="button"
              onClick={() => { setSheetOpen(false); setDeleteTarget(editing); }}
              className="flex items-center justify-center gap-1.5 text-[#A32D2D] text-[9px] py-2"
            >
              <Trash2 size={11} /> Remove contact
            </button>
          )}
          <button type="button" onClick={() => setSheetOpen(false)} className="text-[9px] text-[#888899] text-center py-1">Cancel</button>
        </form>
      </BottomSheet>

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
