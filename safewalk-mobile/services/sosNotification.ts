// ─── Lock-screen SOS notification ─────────────────────────────────────────────
// While a walk is active, an ongoing notification carries an SOS action button
// that works without unlocking the phone. Tapping it doesn't fire the real
// alert immediately — a single notification tap can't replicate the in-app
// SOS button's 3-second hold-to-confirm gesture, and instant-fire-on-tap is a
// real misfire risk on a lock screen. Instead it arms a cancelable 3-second
// countdown (updating the same notification each second), and only fires
// triggerSOS() if it isn't canceled in time — the same safety guarantee a
// hold gesture gives, built on APIs that actually exist for notifications.
//
// This is intentionally scoped to "during an active walk only": the app
// process is already alive and doing real work then (GPS watchPositionAsync,
// this very notification), which is what makes the plain
// addNotificationResponseReceivedListener path reliable. Expo's background
// notification *tasks* (for a fully-killed app) have documented reliability
// issues with async work — see withTimeout.ts's sibling reasoning — so this
// deliberately does not depend on that path.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useWalkStore } from '../store/walkStore';
import { useAuthStore } from '../store/authStore';
import { triggerSOS } from './alert';

const CHANNEL_ID = 'walk-active';
const NOTIFICATION_ID = 'walk-active-notification';
const CATEGORY_ARMED = 'walk-armed';
const CATEGORY_COUNTDOWN = 'walk-countdown';
const COUNTDOWN_SECONDS = 3;

let countdownTimer: ReturnType<typeof setInterval> | null = null;
let countdownRemaining = 0;

function clearCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = null;
}

/** Registers the Android channel + notification action categories. Call once at app start — no permission prompt here. */
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
  await Notifications.setNotificationCategoryAsync(CATEGORY_COUNTDOWN, [
    { identifier: 'CANCEL', buttonTitle: "I'm okay — cancel", options: { opensAppToForeground: false } },
  ]);
}

function post(content: Notifications.NotificationContentInput) {
  return Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: { sticky: true, autoDismiss: false, ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}), ...content },
    trigger: null,
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
  clearCountdown();
  await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
}

async function fireSos() {
  const { walk, markSOS, setStatus, setEscalationStage } = useWalkStore.getState();
  const { user, profile } = useAuthStore.getState();
  if (!user || !walk.sessionId) return;

  setStatus('sos_triggered');
  setEscalationStage(2);
  markSOS();

  const { alertError } = await triggerSOS({
    sessionId: walk.sessionId,
    userId: user.id,
    userName: profile?.full_name || user.email || 'Someone',
    shareToken: walk.shareToken,
  });

  await post({
    title: alertError ?? 'SOS sent',
    body: alertError ? 'Call your contacts directly if you can.' : 'Your contacts have been alerted.',
  });
}

function startCountdown() {
  clearCountdown();
  countdownRemaining = COUNTDOWN_SECONDS;

  const tick = async () => {
    if (countdownRemaining <= 0) {
      clearCountdown();
      await fireSos();
      return;
    }
    await post({
      title: `Sending SOS in ${countdownRemaining}…`,
      body: "Tap \"I'm okay\" if this was unintentional.",
      categoryIdentifier: CATEGORY_COUNTDOWN,
    });
    countdownRemaining -= 1;
  };

  tick();
  countdownTimer = setInterval(tick, 1000);
}

/**
 * Registers the notification-action listener. Call once at app root — it
 * reads live walk/auth state at the moment an action fires rather than
 * closing over stale props, so it works regardless of which screen (if any)
 * is currently mounted.
 */
export function registerSosNotificationListener(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const actionId = response.actionIdentifier;
    if (actionId === 'SOS') {
      const { walk } = useWalkStore.getState();
      if (!walk.sessionId) return; // No active walk — same guard as the in-app button.
      startCountdown();
    } else if (actionId === 'CANCEL') {
      clearCountdown();
      const { walk } = useWalkStore.getState();
      showWalkNotification(walk.destination);
    }
  });
  return () => sub.remove();
}
