// ─── Lock-screen SOS notification ─────────────────────────────────────────────
// While a walk is active, an ongoing notification carries an SOS action button
// that works without unlocking the phone. Tapping it fires the real alert
// immediately — there is no cancelable countdown here. An earlier version
// tried a 3-second cancelable countdown driven by a JS setInterval, but
// Android throttles JS timers for a backgrounded/locked app (Doze-style power
// management): in testing, a "3…2…1…" countdown sat frozen on the lock screen
// for 23+ real seconds before the OS let the timer catch up, then fired for
// real with no actual chance to cancel. A countdown that can't reliably run
// while locked is worse than no countdown — it looks cancelable but isn't.
// Firing immediately is the honest behavior; Cancel-SOS is still available
// in-app (SosOverlay) the moment the walk screen is reopened, same as the
// in-app SOS button already works today.
//
// This is intentionally scoped to "during an active walk only": the app
// process is already alive and doing real work then (GPS watchPositionAsync,
// this very notification), which is what makes the plain
// addNotificationResponseReceivedListener path reliable for receiving the tap
// itself (as opposed to Expo's background notification *tasks*, for a fully-
// killed app, which have documented reliability issues with async work — see
// withTimeout.ts's sibling reasoning).

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useWalkStore } from '../store/walkStore';
import { useAuthStore } from '../store/authStore';
import { triggerSOS } from './alert';

// Android locks a channel's importance/sound/lockscreen-visibility after its
// first creation — an app can never change them again, only the user can via
// system settings. The 'walk-active' id got created once during testing
// before lockscreenVisibility was set correctly, so it's now stuck. Bumping
// the id forces Android to create it fresh with the right settings.
const CHANNEL_ID = 'walk-active-v2';
const NOTIFICATION_ID = 'walk-active-notification';
const CATEGORY_ARMED = 'walk-armed';

// Without this, expo-notifications has no instruction on whether to actually
// display a notification and silently no-ops — scheduleNotificationAsync
// still resolves with an id, permission still reports granted, but nothing
// ever reaches the OS. This must be registered before any notification is
// scheduled.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Registers the Android channel + notification action category. Call once at app start — no permission prompt here. */
export async function setupSosNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Active walk',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
  await Notifications.setNotificationCategoryAsync(CATEGORY_ARMED, [
    { identifier: 'SOS', buttonTitle: 'SOS', options: { opensAppToForeground: false, isDestructive: true } },
  ]);
}

function post(content: Notifications.NotificationContentInput) {
  return Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: { sticky: true, autoDismiss: false, ...content },
    // channelId belongs on the trigger, not content, as of this expo-notifications
    // version — putting it on content is silently ignored and falls back to
    // Expo's default channel (which is what was actually happening before).
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
  });
}

/** Shows the persistent "walk in progress" notification with the SOS action. Silently no-ops if permission isn't granted. */
export async function showWalkNotification(destination: string | null) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  await post({
    title: 'Walk in progress',
    body: destination ? `Walking to ${destination}` : 'Trayl is tracking your walk',
    categoryIdentifier: CATEGORY_ARMED,
  });
}

export async function dismissWalkNotification() {
  await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
}

async function fireSos() {
  const { walk, markSOS, setStatus, setEscalationStage, setSosContacts } = useWalkStore.getState();
  const { user, profile } = useAuthStore.getState();
  if (!user || !walk.sessionId) return;

  setStatus('sos_triggered');
  setEscalationStage(2);
  markSOS();

  const { contacts, alertError } = await triggerSOS({
    sessionId: walk.sessionId,
    userId: user.id,
    userName: profile?.full_name || user.email || 'Someone',
    shareToken: walk.shareToken,
  });
  setSosContacts(contacts);

  await post({
    title: alertError ?? 'SOS sent',
    body: alertError ? 'Call your contacts directly if you can.' : 'Your contacts have been alerted.',
  });
}

/**
 * Registers the notification-action listener. Call once at app root — it
 * reads live walk/auth state at the moment an action fires rather than
 * closing over stale props, so it works regardless of which screen (if any)
 * is currently mounted.
 */
export function registerSosNotificationListener(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    if (response.actionIdentifier !== 'SOS') return;
    const { walk } = useWalkStore.getState();
    if (!walk.sessionId) return; // No active walk — same guard as the in-app button.
    fireSos();
  });
  return () => sub.remove();
}
