// ─── AsyncStorage helpers ─────────────────────────────────────────────────────
// RN port of the web app's localStorage service — same keys/shapes, async API.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocationData } from '../types/walk';
import type { TrustedContact } from '../types/contact';

/** All Trayl storage keys in one place – prevents key drift. */
const KEYS = {
  LAST_KNOWN_LOCATION: 'sw:last_known_location',
  CONTACTS: 'sw:contacts',
  PERMISSION_SEEN: 'sw:permission_seen',
  WALK_SESSIONS: 'sw:walk_sessions',
} as const;

// ── Last Known Location ───────────────────────────────────────────────────────

/** Persist the user's last GPS position. Called when a walk session ends. */
export async function saveLastKnownLocation(loc: LocationData): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.LAST_KNOWN_LOCATION, JSON.stringify(loc));
  } catch {
    console.warn('[Trayl] Could not save last known location.');
  }
}

/** Load the last persisted GPS position. Returns null if none saved yet. */
export async function loadLastKnownLocation(): Promise<LocationData | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.LAST_KNOWN_LOCATION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocationData & { timestamp: string };
    return { ...parsed, timestamp: new Date(parsed.timestamp) };
  } catch {
    return null;
  }
}

/** Remove the stored last known location entry. */
export async function clearLastKnownLocation(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.LAST_KNOWN_LOCATION);
}

// ── Trusted Contacts ─────────────────────────────────────────────────────────

/** Load all trusted contacts. Returns empty array if absent. */
export async function loadContacts(): Promise<TrustedContact[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CONTACTS);
    return raw ? (JSON.parse(raw) as TrustedContact[]) : [];
  } catch {
    return [];
  }
}

/** Persist the entire contacts array. */
export async function saveContacts(contacts: TrustedContact[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
  } catch {
    console.warn('[Trayl] Could not save contacts.');
  }
}

// ── Permission Modal ──────────────────────────────────────────────────────────

/** True if the user has already acknowledged the location/privacy modal. */
export async function hasSeenPermissionModal(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.PERMISSION_SEEN)) === 'true';
}

/** Mark the permission modal as acknowledged so it won't show again. */
export async function markPermissionSeen(): Promise<void> {
  await AsyncStorage.setItem(KEYS.PERMISSION_SEEN, 'true');
}

// ── Delete All / Export ───────────────────────────────────────────────────────

/** Wipe every Trayl key from storage. */
export async function deleteAllData(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}

/** Serialize all stored Trayl data to a pretty-printed JSON string. */
export async function exportAllData(): Promise<string> {
  const snapshot: Record<string, unknown> = {};
  for (const [label, key] of Object.entries(KEYS)) {
    const raw = await AsyncStorage.getItem(key);
    snapshot[label] = raw ? JSON.parse(raw) : null;
  }
  return JSON.stringify(snapshot, null, 2);
}
