import { AccountPageShell, SettingsRow, SettingsSection, useSettingsPrefs } from '../../components/account/SettingsPrefs';
import { Toggle } from '../../components/ui/Toggle';

export default function AccountNotifications() {
  const { prefs, setPrefs } = useSettingsPrefs();

  return (
    <AccountPageShell title="Notifications">
      <SettingsSection label="Walk alerts">
        <SettingsRow title="Check-in reminders" sub="In-app countdown during walks">
          <Toggle on={prefs.checkin_reminders} onChange={(v) => setPrefs((p) => ({ ...p, checkin_reminders: v }))} />
        </SettingsRow>
        <SettingsRow title="Arrival summary" sub="Notify when a walk ends">
          <Toggle on={prefs.walk_summary} onChange={(v) => setPrefs((p) => ({ ...p, walk_summary: v }))} />
        </SettingsRow>
        <SettingsRow title="Watcher ETA updates" sub="Send contacts meaningful timing changes">
          <Toggle on={prefs.watcherEtaUpdates} onChange={(v) => setPrefs((p) => ({ ...p, watcherEtaUpdates: v }))} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection label="Device alerts">
        <SettingsRow title="Low battery warning" sub="Prompt before a walk if power is low">
          <Toggle on={prefs.lowBatteryAlerts} onChange={(v) => setPrefs((p) => ({ ...p, lowBatteryAlerts: v }))} />
        </SettingsRow>
      </SettingsSection>
    </AccountPageShell>
  );
}
