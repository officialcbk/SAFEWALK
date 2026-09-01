import { useState } from 'react';
import { Text, View } from 'react-native';
import { AccountPageShell, ChoicePill, SegmentedTabs, SettingsRow, SettingsSection, useSettingsPrefs } from '../../components/account/SettingsPrefs';

type SettingsTab = 'app' | 'route' | 'sharing';

export default function AccountAppSettings() {
  const { prefs, setPrefs } = useSettingsPrefs();
  const [tab, setTab] = useState<SettingsTab>('app');

  return (
    <AccountPageShell title="Settings">
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { label: 'App', value: 'app' },
          { label: 'Route', value: 'route' },
          { label: 'Share', value: 'sharing' },
        ]}
      />

      <View style={{ marginTop: 18 }}>
        {tab === 'app' && (
          <SettingsSection label="Display">
            <SettingsRow title="Units" sub="Distances and route labels">
              <View className="flex-row gap-2">
                <ChoicePill label="KM" value="metric" selected={prefs.units === 'metric'} onPress={(units) => setPrefs((p) => ({ ...p, units }))} />
                <ChoicePill label="MI" value="imperial" selected={prefs.units === 'imperial'} onPress={(units) => setPrefs((p) => ({ ...p, units }))} />
              </View>
            </SettingsRow>
            <SettingsRow title="Map contrast" sub="Keep route lines easy to read">
              <View className="flex-row gap-2">
                <ChoicePill label="Std" value="standard" selected={prefs.mapStyle === 'standard'} onPress={(mapStyle) => setPrefs((p) => ({ ...p, mapStyle }))} />
                <ChoicePill label="High" value="highContrast" selected={prefs.mapStyle === 'highContrast'} onPress={(mapStyle) => setPrefs((p) => ({ ...p, mapStyle }))} />
              </View>
            </SettingsRow>
            <View className="bg-gray-bg rounded-xl px-3.5 py-3">
              <Text className="text-sm font-semibold text-dark-text mb-2">Appearance</Text>
              <View className="flex-row flex-wrap gap-2">
                {(['system', 'light', 'dark'] as const).map((mode) => (
                  <ChoicePill key={mode} label={mode[0].toUpperCase() + mode.slice(1)} value={mode} selected={prefs.appearance === mode} onPress={(appearance) => setPrefs((p) => ({ ...p, appearance }))} />
                ))}
              </View>
            </View>
          </SettingsSection>
        )}

        {tab === 'route' && (
          <SettingsSection label="Route defaults">
            <View className="bg-gray-bg rounded-xl px-3.5 py-3">
              <Text className="text-sm font-semibold text-dark-text mb-2">Preferred routing</Text>
              <SegmentedTabs
                value={prefs.routePreference}
                onChange={(routePreference) => setPrefs((p) => ({ ...p, routePreference }))}
                tabs={[
                  { label: 'Fast', value: 'fastest' },
                  { label: 'Lit', value: 'lit' },
                  { label: 'Busy', value: 'busy' },
                ]}
              />
            </View>
            <View className="bg-gray-bg rounded-xl px-3.5 py-3">
              <Text className="text-sm font-semibold text-dark-text mb-2">Check-in interval</Text>
              <SegmentedTabs
                value={prefs.checkinInterval}
                onChange={(checkinInterval) => setPrefs((p) => ({ ...p, checkinInterval }))}
                tabs={[
                  { label: '5 min', value: '5' },
                  { label: '10 min', value: '10' },
                  { label: '15 min', value: '15' },
                ]}
              />
            </View>
          </SettingsSection>
        )}

        {tab === 'sharing' && (
          <SettingsSection label="Live sharing">
            <View className="bg-gray-bg rounded-xl px-3.5 py-3">
              <Text className="text-sm font-semibold text-dark-text mb-2">Default share window</Text>
              <SegmentedTabs
                value={prefs.defaultShareWindow}
                onChange={(defaultShareWindow) => setPrefs((p) => ({ ...p, defaultShareWindow }))}
                tabs={[
                  { label: 'Walk', value: 'walk' },
                  { label: '1 hr', value: 'hour' },
                  { label: 'Today', value: 'day' },
                ]}
              />
            </View>
          </SettingsSection>
        )}
      </View>
    </AccountPageShell>
  );
}
