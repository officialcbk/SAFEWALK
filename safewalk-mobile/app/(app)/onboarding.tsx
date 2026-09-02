import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Footprints, Info, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { withTimeout } from '../../services/withTimeout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Toggle } from '../../components/ui/Toggle';

const contactSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
});
type ContactForm = z.infer<typeof contactSchema>;

function ProgressDots({ step }: { step: number }) {
  return (
    <View className="flex-row items-center justify-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          className="h-1.5 rounded-full"
          style={{ width: i === step ? 18 : 6, backgroundColor: i === step ? '#7F77DD' : '#AFA9EC' }}
        />
      ))}
    </View>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const { session, setProfile, profile } = useAuthStore();
  const [step, setStep] = useState(0);
  const [isPrimary, setIsPrimary] = useState(true);
  const [finishing, setFinishing] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { full_name: '', phone: '', email: '' },
  });

  const finish = async () => {
    if (!session || finishing) return;
    setFinishing(true);
    try {
      // Neither "Allow location" nor "Not now" showed any loading state
      // before — a hang here meant tapping either button did nothing at
      // all, with no spinner, no error, and the user stuck on this screen.
      await withTimeout(
        supabase.from('profiles').update({ onboarding_completed: true }).eq('id', session.user.id),
        10000,
      );
      if (profile) setProfile({ ...profile, onboarding_completed: true });
      router.replace('/home');
    } catch {
      Toast.show({ type: 'error', text1: "Couldn't connect.", text2: 'Try again.' });
    } finally {
      setFinishing(false);
    }
  };

  const onSaveContact = async (data: ContactForm) => {
    if (!session) return;
    try {
      const { error } = await withTimeout(
        supabase.from('trusted_contacts').insert({
          user_id: session.user.id, full_name: data.full_name, phone: data.phone,
          email: data.email || null, is_primary: isPrimary,
        }),
        10000,
      );
      if (error) { Toast.show({ type: 'error', text1: 'Could not save contact.' }); return; }
      Toast.show({ type: 'success', text1: `${data.full_name} added.` });
      setStep(2);
    } catch {
      Toast.show({ type: 'error', text1: "Couldn't connect.", text2: 'Try again.' });
    }
  };

  const requestLocation = async () => {
    await Location.requestForegroundPermissionsAsync();
    finish();
  };

  // ── Step 1: Welcome ───────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <View className="flex-1 bg-white">
        <View
          className="items-center justify-center bg-purple-50 overflow-hidden"
          style={{ height: 320, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
        >
          <View className="absolute w-[280px] h-[280px] rounded-full border-[1.5px] border-purple-400/25" />
          <View className="absolute w-[220px] h-[220px] rounded-full border-[1.5px] border-purple-400/35" />
          <View className="absolute w-[160px] h-[160px] rounded-full bg-purple-400/20" />
          <LinearGradient
            colors={['#7F77DD', '#534AB7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 110, height: 110, borderRadius: 55,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Footprints size={48} color="white" />
          </LinearGradient>
        </View>

        <View className="flex-1 px-7 pt-8 pb-7 gap-4">
          <ProgressDots step={0} />
          <Text className="text-[26px] font-bold text-dark-text text-center tracking-tight mt-2">
            Stay safe while you walk.
          </Text>
          <Text className="text-sm text-[#4A4A5A] text-center leading-relaxed">
            Trayl monitors your journey and alerts your trusted contacts if something seems wrong.
          </Text>
          <View className="flex-1" />
          <Button fullWidth onPress={() => setStep(1)}>Next</Button>
        </View>
      </View>
    );
  }

  // ── Step 2: Add contact ───────────────────────────────────────────────────
  if (step === 1) {
    return (
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 24, paddingBottom: 28 }}>
        <View className="mb-5">
          <ProgressDots step={1} />
        </View>
        <Text className="text-[26px] font-bold text-dark-text tracking-tight mb-2.5">
          Add your trusted contacts.
        </Text>
        <Text className="text-sm text-[#4A4A5A] leading-relaxed mb-6">
          Choose up to 5 people who&apos;ll be notified if you need help. They don&apos;t need the app.
        </Text>

        <View className="gap-3.5">
          <Controller
            control={control}
            name="full_name"
            render={({ field }) => (
              <Input
                label="Full name"
                placeholder="Mom"
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
                placeholder="+1 (555) 000-0000"
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

          <Button loading={isSubmitting} fullWidth onPress={handleSubmit(onSaveContact)} className="mt-1">
            Add contact and continue
          </Button>
        </View>

        <Pressable onPress={() => setStep(2)} className="mt-2 py-3">
          <Text className="text-sm font-semibold text-purple-600 text-center">Skip for now</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Step 3: Location permission ───────────────────────────────────────────
  return <LocationStep onAllow={requestLocation} onSkip={finish} loading={finishing} />;
}

function LocationStep({ onAllow, onSkip, loading }: { onAllow: () => void; onSkip: () => void; loading: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(40,36,80,0.85)' }}>
      <View
        className="bg-white px-6 pt-2"
        style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 24 }}
      >
        <View className="w-11 h-1 bg-[#D5D5DD] rounded-full self-center mb-4" />

        <View className="items-center mb-4">
          <ProgressDots step={2} />
        </View>

        <View className="w-16 h-16 rounded-full bg-purple-50 items-center justify-center mb-3.5">
          <MapPin size={28} color="#534AB7" />
        </View>

        <Text className="text-[26px] font-bold text-dark-text tracking-tight mb-2.5">
          Allow location access.
        </Text>
        <Text className="text-sm text-[#4A4A5A] leading-relaxed mb-4">
          Trayl needs your location only while a walk is active. We never track you in the background.
        </Text>

        <View className="flex-row items-start gap-2.5 bg-purple-50 rounded-xl px-3.5 py-3 mb-5">
          <Info size={18} color="#534AB7" style={{ marginTop: 1 }} />
          <Text className="text-xs text-purple-800 leading-relaxed flex-1">
            Location is only active during walks and deleted after 30 days.
          </Text>
        </View>

        <Button fullWidth loading={loading} onPress={onAllow}>Allow location</Button>
        <Pressable onPress={onSkip} disabled={loading} className="w-full py-3 mt-1">
          <Text className="text-sm font-semibold text-purple-600 text-center">Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}
