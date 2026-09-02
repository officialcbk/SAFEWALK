import { Text, TextInput } from 'react-native';
import { AccountPageShell, SettingsRow, SettingsSection, useSettingsPrefs } from '../../components/account/SettingsPrefs';
import { Toggle } from '../../components/ui/Toggle';

export default function AccountEmergency() {
  const { prefs, setPrefs } = useSettingsPrefs();

  return (
    <AccountPageShell title="Emergency info">
      <SettingsSection label="Primary">
        <TextInput
          value={prefs.emergencyName}
          onChangeText={(emergencyName) => setPrefs((p) => ({ ...p, emergencyName }))}
          placeholder="Preferred emergency contact"
          className="w-full h-[52px] px-4 text-sm bg-white border border-gray-border rounded-xl"
        />
        <TextInput
          value={prefs.emergencyPhone}
          onChangeText={(emergencyPhone) => setPrefs((p) => ({ ...p, emergencyPhone }))}
          placeholder="Emergency phone"
          keyboardType="phone-pad"
          className="w-full h-[52px] px-4 text-sm bg-white border border-gray-border rounded-xl"
        />
      </SettingsSection>

      <SettingsSection label="Medical">
        <TextInput
          value={prefs.emergencyBloodType}
          onChangeText={(emergencyBloodType) => setPrefs((p) => ({ ...p, emergencyBloodType }))}
          placeholder="Blood type or key condition"
          className="w-full h-[52px] px-4 text-sm bg-white border border-gray-border rounded-xl"
        />
        <TextInput
          value={prefs.emergencyNotes}
          onChangeText={(emergencyNotes) => setPrefs((p) => ({ ...p, emergencyNotes }))}
          placeholder="Medical notes, allergies, access codes"
          multiline
          textAlignVertical="top"
          className="w-full min-h-[96px] px-4 py-3 text-sm bg-white border border-gray-border rounded-xl"
        />
        <SettingsRow title="Share medical notes" sub="Include notes in emergency handoff">
          <Toggle on={prefs.emergencyShareMedical} onChange={(v) => setPrefs((p) => ({ ...p, emergencyShareMedical: v }))} />
        </SettingsRow>
        <Text className="text-xs text-gray-text leading-relaxed">Saved on this device for now. It is not sent unless you choose to share it during an emergency flow.</Text>
      </SettingsSection>
    </AccountPageShell>
  );
}
