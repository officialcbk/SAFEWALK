import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { AccountPageShell, SegmentedTabs, SettingsActionRow, SettingsSection } from '../../components/account/SettingsPrefs';

type HelpTab = 'walks' | 'safety' | 'support';

const WALKS_FAQ = [
  { q: 'How do I start a walk?', a: 'Enter a destination from Home, review your route and estimated arrival, choose which contacts to notify, then tap Start walk.' },
  { q: 'What happens during check-ins?', a: "Trayl periodically asks you to confirm you're okay. Set how often in Account → Settings → Route → Check-in interval. Miss one and your trusted contacts are notified." },
  { q: "What's in my arrival summary?", a: 'After you end a walk, you’ll see your total distance, time, and the check-ins you answered along the way, under History.' },
  { q: 'Can I change my route mid-walk?', a: 'Search a new destination from the active walk screen and Trayl re-routes from your current location.' },
] as const;

const SAFETY_FAQ = [
  { q: 'How does SOS work?', a: 'Hold the SOS button for the duration set in Account → Safety → SOS hold time. Your trusted contacts get an immediate alert with your live location.' },
  { q: 'Can I test SOS without alerting anyone?', a: 'Yes — use Test SOS from the Account tab. No message is sent to anyone.' },
  { q: 'What is Discreet mode?', a: "It keeps on-screen safety controls minimal and quiet — useful if you don't want using the app to draw attention. Toggle it in Account → Safety." },
  { q: 'Who can see my location?', a: 'Only the trusted contacts you choose when starting a walk, and only for the duration of that walk.' },
] as const;

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen((v) => !v)} className="bg-gray-bg rounded-xl px-3.5 py-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-sm font-semibold text-dark-text">{q}</Text>
        <Text className="text-base text-gray-text">{open ? '−' : '+'}</Text>
      </View>
      {open && <Text className="text-[13px] text-gray-text leading-relaxed mt-2">{a}</Text>}
    </Pressable>
  );
}

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
          <SettingsSection label="Frequently asked questions">
            {WALKS_FAQ.map((item) => <FaqItem key={item.q} q={item.q} a={item.a} />)}
          </SettingsSection>
        )}

        {tab === 'safety' && (
          <SettingsSection label="Frequently asked questions">
            {SAFETY_FAQ.map((item) => <FaqItem key={item.q} q={item.q} a={item.a} />)}
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
