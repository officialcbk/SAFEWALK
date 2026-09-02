import { AccountPageShell, SettingsRow, SettingsSection, useSettingsPrefs } from '../../components/account/SettingsPrefs';
import { Toggle } from '../../components/ui/Toggle';

export default function AccountPrivacy() {
  const { prefs, setPrefs } = useSettingsPrefs();

  return (
    <AccountPageShell title="Privacy">
      <SettingsSection label="Location">
        <SettingsRow title="Location only during walks" sub="Background tracking is never used">
          <Toggle on={true} onChange={() => {}} />
        </SettingsRow>
        <SettingsRow title="Exact live location" sub="Share precise position with active watchers">
          <Toggle on={prefs.shareExactLocation} onChange={(v) => setPrefs((p) => ({ ...p, shareExactLocation: v }))} />
        </SettingsRow>
        <SettingsRow title="Route replay" sub="Let contacts review completed shared walks">
          <Toggle on={prefs.allowContactReplay} onChange={(v) => setPrefs((p) => ({ ...p, allowContactReplay: v }))} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection label="Data">
        <SettingsRow title="Auto-delete after 30 days" sub="Walks and location data">
          <Toggle on={prefs.auto_delete} onChange={(v) => setPrefs((p) => ({ ...p, auto_delete: v }))} />
        </SettingsRow>
        <SettingsRow title="Diagnostics" sub="Share anonymized app reliability data">
          <Toggle on={prefs.anonymizedDiagnostics} onChange={(v) => setPrefs((p) => ({ ...p, anonymizedDiagnostics: v }))} />
        </SettingsRow>
      </SettingsSection>
    </AccountPageShell>
  );
}
