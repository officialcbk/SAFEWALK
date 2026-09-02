import { useState } from 'react';
import { Text, View } from 'react-native';
import { AccountPageShell, SegmentedTabs, SettingsRow, SettingsSection } from '../../components/account/SettingsPrefs';

type LegalTab = 'privacy' | 'terms' | 'data';

export default function AccountLegal() {
  const [tab, setTab] = useState<LegalTab>('privacy');

  return (
    <AccountPageShell title="Legal">
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { label: 'Privacy', value: 'privacy' },
          { label: 'Terms', value: 'terms' },
          { label: 'Data', value: 'data' },
        ]}
      />

      <View style={{ marginTop: 18 }}>
        {tab === 'privacy' && (
          <SettingsSection label="Privacy summary">
            <Text className="text-[13px] text-gray-text leading-relaxed">
              Trayl stores account, contact, and walk data needed to provide safety features. Location sharing is scoped to active walks.
            </Text>
            <SettingsRow title="Live location" sub="Visible to selected watchers during active walks">
              <Text className="text-xs font-semibold text-dark-text">Scoped</Text>
            </SettingsRow>
            <SettingsRow title="Emergency info" sub="Saved locally unless shared by an emergency flow">
              <Text className="text-xs font-semibold text-dark-text">Limited</Text>
            </SettingsRow>
          </SettingsSection>
        )}

        {tab === 'terms' && (
          <SettingsSection label="Safety terms">
            <Text className="text-[13px] text-gray-text leading-relaxed">
              Trayl provides route sharing, check-ins, and contact escalation tools. It does not guarantee personal safety or emergency dispatch.
            </Text>
            <SettingsRow title="Emergency services" sub="Call local emergency services for immediate danger">
              <Text className="text-xs font-semibold text-dark-text">Required</Text>
            </SettingsRow>
            <SettingsRow title="Trusted contacts" sub="You control who can watch each walk">
              <Text className="text-xs font-semibold text-dark-text">User set</Text>
            </SettingsRow>
          </SettingsSection>
        )}

        {tab === 'data' && (
          <SettingsSection label="Data handling">
            <SettingsRow title="Data region" sub="Supabase project configuration">
              <Text className="text-xs font-semibold text-dark-text">App</Text>
            </SettingsRow>
            <SettingsRow title="Retention" sub="Walk and location history auto-delete preference">
              <Text className="text-xs font-semibold text-dark-text">30 days</Text>
            </SettingsRow>
            <SettingsRow title="Compliance" sub="Privacy copy placeholder">
              <Text className="text-xs font-semibold text-dark-text">PIPEDA</Text>
            </SettingsRow>
          </SettingsSection>
        )}
      </View>
    </AccountPageShell>
  );
}
