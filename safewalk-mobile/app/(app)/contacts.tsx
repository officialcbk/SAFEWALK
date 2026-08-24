import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronRight, Info, Plus, Trash2, UserPlus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { TrustedContact } from '../../types';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Toggle } from '../../components/ui/Toggle';

const schema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
});
type FormData = z.infer<typeof schema>;

export default function Contacts() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<TrustedContact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrustedContact | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);

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

  const { control, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', phone: '', email: '' },
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
      Toast.show({ type: 'success', text1: editing ? 'Contact updated.' : `${data.full_name} added.` });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Could not save contact.' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('trusted_contacts').delete().eq('id', id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setDeleteTarget(null);
      Toast.show({ type: 'success', text1: 'Contact removed.' });
    },
  });

  const remaining = 5 - contacts.length;

  return (
    <View className="flex-1 bg-gray-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <View>
          <Text className="text-[26px] font-bold text-dark-text tracking-tight">Contacts</Text>
          <Text className="text-xs text-gray-text mt-0.5">Up to 5 trusted contacts</Text>
        </View>
        <Pressable
          onPress={openAdd}
          disabled={contacts.length >= 5}
          className="flex-row items-center gap-2 rounded-2xl px-4 h-[42px] overflow-hidden disabled:opacity-40"
        >
          <LinearGradient
            colors={['#7F77DD', '#534AB7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', inset: 0, borderRadius: 14 }}
          />
          <Plus size={15} color="white" strokeWidth={2.5} />
          <Text className="text-white font-semibold text-[13px]">Add contact</Text>
        </Pressable>
      </View>

      <ScrollView className="px-4" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Info box */}
        <View className="flex-row items-start gap-2.5 bg-purple-50 rounded-md px-3.5 py-3 mb-3.5">
          <Info size={18} color="#534AB7" style={{ marginTop: 1 }} />
          <Text className="text-xs text-purple-800 leading-relaxed flex-1">
            Trusted contacts are notified by SMS with your live location during an emergency.
          </Text>
        </View>

        {isLoading ? (
          <View className="gap-2">
            {[1, 2, 3].map((i) => (
              <View key={i} className="h-[72px] bg-white rounded-2xl opacity-60" />
            ))}
          </View>
        ) : contacts.length === 0 ? (
          <View className="bg-white rounded-[18px] px-6 py-10 items-center border border-gray-border">
            <View className="w-16 h-16 rounded-[20px] bg-purple-50 items-center justify-center mb-4">
              <UserPlus size={28} color="#534AB7" strokeWidth={1.8} />
            </View>
            <Text className="text-base font-bold text-dark-text mb-1.5 text-center">No contacts yet</Text>
            <Text className="text-[13px] text-gray-text leading-relaxed mb-5 text-center max-w-[220px]">
              Add someone you trust — they&apos;ll be alerted if you need help.
            </Text>
            <Pressable onPress={openAdd} className="h-[46px] px-8 rounded-2xl flex-row items-center gap-2 overflow-hidden">
              <LinearGradient
                colors={['#7F77DD', '#534AB7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', inset: 0, borderRadius: 14 }}
              />
              <Plus size={15} color="white" strokeWidth={2.5} />
              <Text className="text-white font-semibold text-sm">Add first contact</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-2">
            {contacts.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => openEdit(c)}
                className="flex-row items-center gap-3 bg-white border border-gray-border rounded-2xl p-3.5"
              >
                <Avatar initials={c.full_name.slice(0, 2)} size={44} />
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-[15px] font-semibold text-dark-text" numberOfLines={1}>{c.full_name}</Text>
                    {c.is_primary && <Badge variant="purple">Primary</Badge>}
                  </View>
                  <Text className="text-xs text-gray-text mt-0.5">{c.phone}</Text>
                </View>
                <ChevronRight size={18} color="#888899" />
              </Pressable>
            ))}
          </View>
        )}

        {contacts.length > 0 && (
          <Text className="text-xs text-gray-text text-center mt-4">
            {contacts.length} of 5 contacts · {remaining} slot{remaining !== 1 ? 's' : ''} remaining
          </Text>
        )}
      </ScrollView>

      {/* Add / edit bottom sheet */}
      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)}>
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-bold text-dark-text tracking-tight">
            {editing ? 'Edit contact' : 'Add trusted contact'}
          </Text>
        </View>

        <View className="gap-3.5">
          <Controller
            control={control}
            name="full_name"
            render={({ field }) => (
              <Input
                label="Full name"
                placeholder="e.g. Mom"
                error={errors.full_name?.message}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <Input
                label="Phone number"
                keyboardType="phone-pad"
                placeholder="+1 (000) 000-0000"
                error={errors.phone?.message}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input
                label="Email (optional)"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="optional@email.com"
                error={errors.email?.message}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />

          <View className="flex-row items-center justify-between bg-purple-50 rounded-xl px-3.5 py-3">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-semibold text-dark-text">Set as primary</Text>
              <Text className="text-xs text-gray-text">Receives a voice call during emergencies</Text>
            </View>
            <Toggle on={isPrimary} onChange={setIsPrimary} />
          </View>

          <Button loading={isSubmitting || saveMutation.isPending} fullWidth onPress={handleSubmit((d) => saveMutation.mutate(d))}>
            Save contact
          </Button>

          {editing && (
            <Pressable
              onPress={() => { setSheetOpen(false); setDeleteTarget(editing); }}
              className="flex-row items-center justify-center gap-1.5 py-1"
            >
              <Trash2 size={14} color="#A32D2D" />
              <Text className="text-status-danger text-[13px]">Remove contact</Text>
            </Pressable>
          )}
        </View>
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
    </View>
  );
}
