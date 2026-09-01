import { useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

export const PREFS_KEY = 'trayl-settings-preferences';

export type SettingsPrefs = {
  checkin_reminders: boolean;
  walk_summary: boolean;
  lowBatteryAlerts: boolean;
  watcherEtaUpdates: boolean;
  auto_delete: boolean;
  units: 'metric' | 'imperial';
  mapStyle: 'standard' | 'highContrast';
  appearance: 'system' | 'light' | 'dark';
  routePreference: 'fastest' | 'lit' | 'busy';
  defaultShareWindow: 'walk' | 'hour' | 'day';
  checkinInterval: '5' | '10' | '15';
  sosHoldSeconds: number;
  callPrimaryFirst: boolean;
  discreetMode: boolean;
  sosSound: boolean;
  shareExactLocation: boolean;
  allowContactReplay: boolean;
  anonymizedDiagnostics: boolean;
  emergencyName: string;
  emergencyPhone: string;
  emergencyBloodType: string;
  emergencyNotes: string;
  emergencyShareMedical: boolean;
  homePlace: string;
  workPlace: string;
  safePlace: string;
  placeAlerts: boolean;
};

export const DEFAULT_PREFS: SettingsPrefs = {
  checkin_reminders: true,
  walk_summary: true,
  lowBatteryAlerts: true,
  watcherEtaUpdates: true,
  auto_delete: true,
  units: 'metric',
  mapStyle: 'standard',
  appearance: 'system',
  routePreference: 'lit',
  defaultShareWindow: 'walk',
  checkinInterval: '10',
  sosHoldSeconds: 3,
  callPrimaryFirst: true,
  discreetMode: true,
  sosSound: true,
  shareExactLocation: true,
  allowContactReplay: false,
  anonymizedDiagnostics: true,
  emergencyName: '',
  emergencyPhone: '',
  emergencyBloodType: '',
  emergencyNotes: '',
  emergencyShareMedical: true,
  homePlace: '',
  workPlace: '',
  safePlace: '',
  placeAlerts: true,
};

export function useSettingsPrefs() {
  const [prefs, setPrefs] = useState<SettingsPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => {
        if (raw) {
          setPrefs((current) => ({ ...current, ...JSON.parse(raw) }));
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs)).catch(() => {});
  }, [hydrated, prefs]);

  return { prefs, setPrefs };
}

export function SettingsRow({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between bg-gray-bg rounded-xl px-3.5 py-3">
      <View className="flex-1 pr-3">
        <Text className="text-sm font-semibold text-dark-text">{title}</Text>
        <Text className="text-xs text-gray-text">{sub}</Text>
      </View>
      {children}
    </View>
  );
}

export function SettingsActionRow({
  title,
  sub,
  value,
  onPress,
}: {
  title: string;
  sub: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center justify-between bg-gray-bg rounded-xl px-3.5 py-3">
      <View className="flex-1 pr-3">
        <Text className="text-sm font-semibold text-dark-text">{title}</Text>
        <Text className="text-xs text-gray-text">{sub}</Text>
      </View>
      {!!value && <Text className="text-xs font-semibold text-dark-text mr-3">{value}</Text>}
      <View style={{ width: 8, height: 8, borderTopWidth: 2, borderRightWidth: 2, borderColor: 'rgba(0,0,0,.3)', transform: [{ rotate: '45deg' }] }} />
    </Pressable>
  );
}

export function SettingsSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 9.5, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)', marginBottom: 8 }}>{label}</Text>
      <View className="gap-3">{children}</View>
    </View>
  );
}

export function SegmentedTabs<T extends string>({
  value,
  tabs,
  onChange,
}: {
  value: T;
  tabs: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', padding: 3, borderRadius: 10, backgroundColor: '#F1F0ED', gap: 3 }}>
      {tabs.map((tab) => {
        const selected = value === tab.value;
        return (
          <Pressable
            key={tab.value}
            onPress={() => onChange(tab.value)}
            style={{ flex: 1, minHeight: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? '#0A0A0A' : 'transparent' }}
          >
            <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 12, color: selected ? '#fff' : '#0A0A0A' }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ChoicePill<T extends string>({
  label,
  value,
  selected,
  onPress,
}: {
  label: string;
  value: T;
  selected: boolean;
  onPress: (value: T) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(value)}
      style={{
        minHeight: 34,
        paddingHorizontal: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? '#0A0A0A' : '#fff',
        borderWidth: 1,
        borderColor: selected ? '#0A0A0A' : 'rgba(0,0,0,.12)',
      }}
    >
      <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 12, color: selected ? '#fff' : '#0A0A0A' }}>{label}</Text>
    </Pressable>
  );
}

export function AccountPageShell({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,.08)' }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: 'center' }}>
          <View style={{ width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#0A0A0A', transform: [{ rotate: '45deg' }], marginLeft: 5 }} />
        </Pressable>
        <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 28, letterSpacing: -1.12, color: '#0A0A0A', marginTop: 8 }}>{title}</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
        {children}
      </ScrollView>
    </View>
  );
}
