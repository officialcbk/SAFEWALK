import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2 } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { withTimeout } from '../../services/withTimeout';
import type { ContactPermissionLevel, TrustedContact } from '../../types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Toggle } from '../../components/ui/Toggle';

const schema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
});
type FormData = z.infer<typeof schema>;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function permissionNote(c: Pick<TrustedContact, 'is_primary' | 'permission_level'>): string {
  if (c.is_primary) return 'Called first on SOS · live route';
  return c.permission_level === 'alerts_only' ? 'Alerts only, no live route' : 'Live route · check-in alerts';
}

export default function Contacts() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<TrustedContact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrustedContact | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [tier, setTier] = useState<ContactPermissionLevel>('live_route');

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
    const primary = contacts.length === 0;
    setIsPrimary(primary);
    setTier(primary ? 'full' : 'live_route');
    reset({ full_name: '', phone: '', email: '' });
    setSheetOpen(true);
  };

  const openEdit = (c: TrustedContact) => {
    setEditing(c);
    setIsPrimary(c.is_primary);
    setTier(c.permission_level);
    setValue('full_name', c.full_name);
    setValue('phone', c.phone);
    setValue('email', c.email ?? '');
    setSheetOpen(true);
  };

  const setPrimaryToggle = (v: boolean) => {
    setIsPrimary(v);
    setTier(v ? 'full' : 'live_route');
  };

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!user) return;
      // A hang here used to leave the Save button spinning forever with no
      // error — withTimeout guarantees this mutation always eventually
      // settles, so react-query's isPending (and the disabled button state
      // it drives) can't get stuck true.
      const permission_level: ContactPermissionLevel = isPrimary ? 'full' : tier;
      if (isPrimary) {
        await withTimeout(supabase.from('trusted_contacts').update({ is_primary: false }).eq('user_id', user.id), 10000);
      }
      if (editing) {
        await withTimeout(
          supabase.from('trusted_contacts').update({
            ...data, email: data.email || null, is_primary: isPrimary, permission_level,
          }).eq('id', editing.id),
          10000,
        );
      } else {
        await withTimeout(
          supabase.from('trusted_contacts').insert({
            user_id: user.id, ...data, email: data.email || null, is_primary: isPrimary, permission_level,
          }),
          10000,
        );
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
      // ConfirmDialog disables its own Cancel button while this is pending
      // — a hang here used to leave "Remove contact?" permanently open and
      // undismissable, with no error and no way out.
      await withTimeout(supabase.from('trusted_contacts').delete().eq('id', id), 10000);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setDeleteTarget(null);
      Toast.show({ type: 'success', text1: 'Contact removed.' });
    },
    onError: () => Toast.show({ type: 'error', text1: "Couldn't remove contact.", text2: 'Try again.' }),
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ paddingTop: 66, paddingHorizontal: 20, paddingBottom: 14 }}>
        <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 28, letterSpacing: -1.12, color: '#0A0A0A' }}>Contacts</Text>
        <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 13, lineHeight: 18.2, color: 'rgba(0,0,0,.55)', marginTop: 10, maxWidth: 300 }}>
          Three people can see your walks. Only your primary contact is called if you stop responding.
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6 }}>
        {isLoading ? (
          <View style={{ gap: 8 }}>
            {[1, 2, 3].map((i) => <View key={i} style={{ height: 72, backgroundColor: '#F1F0ED', borderRadius: 12 }} />)}
          </View>
        ) : (
          contacts.map((c, i) => (
            <Pressable
              key={c.id}
              onPress={() => openEdit(c)}
              style={{ flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 16, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: 'rgba(0,0,0,.09)' }}
            >
              <View style={{ width: 42, height: 42, borderRadius: 99, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 13, color: '#fff' }}>{initialsOf(c.full_name)}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 15, letterSpacing: -0.225, color: '#0A0A0A' }} numberOfLines={1}>
                    {c.full_name}
                  </Text>
                  {c.is_primary && (
                    <View style={{ borderWidth: 1, borderColor: 'rgba(0,0,0,.2)', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 3 }}>
                      <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8, letterSpacing: 0.96, textTransform: 'uppercase', color: '#0A0A0A' }}>Primary</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 11, color: 'rgba(0,0,0,.5)', marginTop: 8 }}>{c.phone}</Text>
                <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 11.5, color: 'rgba(0,0,0,.45)', marginTop: 7 }}>{permissionNote(c)}</Text>
              </View>
              <View style={{ width: 8, height: 8, borderTopWidth: 2, borderRightWidth: 2, borderColor: 'rgba(0,0,0,.3)', transform: [{ rotate: '45deg' }] }} />
            </Pressable>
          ))
        )}

        {!isLoading && (
          <Pressable
            onPress={() => Toast.show({ type: 'info', text1: "Importing from phone contacts isn't available yet." })}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,.09)' }}
          >
            <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 13.5, color: 'rgba(0,0,0,.6)' }}>Invite from phone contacts</Text>
            <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 13.5, color: '#0A0A0A' }}>Open</Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 }}>
        <Pressable
          onPress={openAdd}
          disabled={contacts.length >= 5}
          style={{ backgroundColor: '#0A0A0A', borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', opacity: contacts.length >= 5 ? 0.4 : 1 }}
        >
          <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 15, letterSpacing: -0.15, color: '#fff' }}>Add a contact</Text>
        </Pressable>
      </View>

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
              <Text className="text-xs text-gray-text">Called first on SOS · always gets the live route</Text>
            </View>
            <Toggle on={isPrimary} onChange={setPrimaryToggle} />
          </View>

          {!isPrimary && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['live_route', 'alerts_only'] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setTier(t)}
                  style={{
                    flex: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 10,
                    borderWidth: 1, borderColor: tier === t ? '#0A0A0A' : 'rgba(0,0,0,.12)',
                    backgroundColor: tier === t ? '#0A0A0A' : 'transparent',
                  }}
                >
                  <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 12.5, color: tier === t ? '#fff' : '#0A0A0A', textAlign: 'center' }}>
                    {t === 'live_route' ? 'Live route + alerts' : 'Alerts only'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

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
