import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { AccountPageShell, SegmentedTabs, SettingsActionRow, SettingsSection } from '../../components/account/SettingsPrefs';

type HelpTab = 'walks' | 'safety' | 'support';

export default function AccountHelp() {
  const [tab, setTab] = useState<HelpTab>('walks');

  return (
    <AccountPageShell title="Help">
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { label: 'Walks', value: 'walks' },
          { label: 'Safety', value: 'safety' },
          { label: 'Support', value: 'support' },
        ]}
      />

      <View style={{ marginTop: 18 }}>
        {tab === 'walks' && (
          <SettingsSection label="Walk setup">
            <SettingsActionRow title="Start a walk" sub="Choose a destination, review route, then pick watchers" value="Guide" onPress={() => Toast.show({ type: 'info', text1: 'Start from Home, then review route and watchers.' })} />
            <SettingsActionRow title="Check-ins" sub="Trayl asks for confirmation during active walks" value="Guide" onPress={() => Toast.show({ type: 'info', text1: 'Missed check-ins can escalate to contacts.' })} />
            <SettingsActionRow title="Arrival summaries" sub="Review route, time, and answered check-ins" value="Guide" onPress={() => Toast.show({ type: 'info', text1: 'Summaries appear after each completed walk.' })} />
          </SettingsSection>
        )}

        {tab === 'safety' && (
          <SettingsSection label="Emergency flows">
            <SettingsActionRow title="Test SOS" sub="Run a silent test without contacting anyone" value="No alert" onPress={() => Toast.show({ type: 'info', text1: 'SOS test complete.', text2: 'No alert was sent.' })} />
            <SettingsActionRow title="Discreet help" sub="Use quieter in-walk controls when you feel uneasy" value="Guide" onPress={() => Toast.show({ type: 'info', text1: 'Open help from an active walk for quiet options.' })} />
            <SettingsActionRow title="Trusted contacts" sub="Keep primary and backup watchers up to date" value="Review" onPress={() => Toast.show({ type: 'info', text1: 'Open Contacts from the main tab to update watchers.' })} />
          </SettingsSection>
        )}

        {tab === 'support' && (
          <SettingsSection label="Contact">
            <SettingsActionRow title="Contact support" sub="support@trayl.app" value="Email" onPress={() => Linking.openURL('mailto:support@trayl.app').catch(() => {})} />
            <SettingsActionRow title="Report a route issue" sub="Send destination and route details to support" value="Email" onPress={() => Linking.openURL('mailto:support@trayl.app?subject=Route%20issue').catch(() => {})} />
            <Text className="text-xs text-gray-text leading-relaxed">For immediate danger, call local emergency services. Trayl helps coordinate trusted contacts but does not replace emergency response.</Text>
          </SettingsSection>
        )}
      </View>
    </AccountPageShell>
  );
}
