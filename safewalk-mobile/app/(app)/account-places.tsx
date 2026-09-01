import { Pressable, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { AccountPageShell, SettingsRow, SettingsSection, useSettingsPrefs } from '../../components/account/SettingsPrefs';
import { Toggle } from '../../components/ui/Toggle';

export default function AccountPlaces() {
  const router = useRouter();
  const { prefs, setPrefs } = useSettingsPrefs();

  return (
    <AccountPageShell title="Places">
      <SettingsSection label="Saved">
        <TextInput
          value={prefs.homePlace}
          onChangeText={(homePlace) => setPrefs((p) => ({ ...p, homePlace }))}
          placeholder="Home address or label"
          className="w-full h-[52px] px-4 text-sm bg-white border border-gray-border rounded-xl"
        />
        <TextInput
          value={prefs.workPlace}
          onChangeText={(workPlace) => setPrefs((p) => ({ ...p, workPlace }))}
          placeholder="Work, school, or frequent place"
          className="w-full h-[52px] px-4 text-sm bg-white border border-gray-border rounded-xl"
        />
        <TextInput
          value={prefs.safePlace}
          onChangeText={(safePlace) => setPrefs((p) => ({ ...p, safePlace }))}
          placeholder="Safe place nearby"
          className="w-full h-[52px] px-4 text-sm bg-white border border-gray-border rounded-xl"
        />
      </SettingsSection>

      <SettingsSection label="Place alerts">
        <SettingsRow title="Arrive and leave alerts" sub="Notify watchers around saved places">
          <Toggle on={prefs.placeAlerts} onChange={(v) => setPrefs((p) => ({ ...p, placeAlerts: v }))} />
        </SettingsRow>
        <Pressable onPress={() => router.push('/search')} className="h-[48px] rounded-xl bg-dark-text items-center justify-center">
          <Text className="text-sm font-semibold text-white">Find a place on map</Text>
        </Pressable>
      </SettingsSection>
    </AccountPageShell>
  );
}
