import { Text, View } from 'react-native';
import { AccountPageShell, ChoicePill, SettingsRow, SettingsSection, useSettingsPrefs } from '../../components/account/SettingsPrefs';
import { Toggle } from '../../components/ui/Toggle';

export default function AccountSafety() {
  const { prefs, setPrefs } = useSettingsPrefs();

  return (
    <AccountPageShell title="Safety">
      <SettingsSection label="SOS">
        <View className="bg-gray-bg rounded-xl px-3.5 py-3">
          <Text className="text-sm font-semibold text-dark-text mb-2">SOS hold time</Text>
          <View className="flex-row gap-2">
            {([2, 3, 5] as const).map((seconds) => (
              <ChoicePill key={seconds} label={`${seconds}s`} value={String(seconds)} selected={prefs.sosHoldSeconds === seconds} onPress={() => setPrefs((p) => ({ ...p, sosHoldSeconds: seconds }))} />
            ))}
          </View>
        </View>
        <SettingsRow title="Call primary first" sub="Use your primary contact during escalation">
          <Toggle on={prefs.callPrimaryFirst} onChange={(v) => setPrefs((p) => ({ ...p, callPrimaryFirst: v }))} />
        </SettingsRow>
        <SettingsRow title="SOS sound" sub="Play a confirmation sound before sending">
          <Toggle on={prefs.sosSound} onChange={(v) => setPrefs((p) => ({ ...p, sosSound: v }))} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection label="On-screen behavior">
        <SettingsRow title="Discreet mode" sub="Keep help controls quiet on screen">
          <Toggle on={prefs.discreetMode} onChange={(v) => setPrefs((p) => ({ ...p, discreetMode: v }))} />
        </SettingsRow>
      </SettingsSection>
    </AccountPageShell>
  );
}
