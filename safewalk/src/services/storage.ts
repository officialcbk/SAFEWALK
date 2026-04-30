// ─── localStorage helpers ─────────────────────────────────────────────────────
// Slice  5 – last known location persistence
// Slice 10 – trusted contacts CRUD persistence
// Slice 17 – delete-all-data + export-my-data

import type { LocationData } from "../types/walk";
import type { TrustedContact } from "../types/contact";

/** All SafeWalk localStorage keys in one place – prevents key drift. */
const KEYS = {
  LAST_KNOWN_LOCATION: "sw:last_known_location",
  CONTACTS: "sw:contacts",
  PERMISSION_SEEN: "sw:permission_seen",
  WALK_SESSIONS: "sw:walk_sessions",
} as const;

// ── Last Known Location (Slice 5) ─────────────────────────────────────────────

/**
 * Persist the user's last GPS position to localStorage.
 * Called when a walk session ends.
 */
export function saveLastKnownLocation(loc: LocationData): void {
  try {
    localStorage.setItem(KEYS.LAST_KNOWN_LOCATION, JSON.stringify(loc));
  } catch {
    console.warn("[SafeWalk] Could not save last known location – storage quota may be full.");
  }
}

/**
 * Load the last persisted GPS position.
 * Returns null if no position has been saved yet.
 * Handles the Date re-hydration from JSON string.
 */
export function loadLastKnownLocation(): LocationData | null {
  try {
    const raw = localStorage.getItem(KEYS.LAST_KNOWN_LOCATION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocationData & { timestamp: string };
    return { ...parsed, timestamp: new Date(parsed.timestamp) };
  } catch {
    return null;
  }
}

/** Remove the stored last known location entry. */
export function clearLastKnownLocation(): void {
  localStorage.removeItem(KEYS.LAST_KNOWN_LOCATION);
}

// ── Trusted Contacts (Slice 10) ───────────────────────────────────────────────

/** Load all trusted contacts from localStorage. Returns empty array if absent. */
export function loadContacts(): TrustedContact[] {
  try {
    const raw = localStorage.getItem(KEYS.CONTACTS);
    return raw ? (JSON.parse(raw) as TrustedContact[]) : [];
  } catch {
    return [];
  }
}

/** Persist the entire contacts array to localStorage. */
export function saveContacts(contacts: TrustedContact[]): void {
  try {
    localStorage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
  } catch {
    console.warn("[SafeWalk] Could not save contacts.");
  }
}

// ── Permission Modal (Slice 17) ───────────────────────────────────────────────

/**
 * Returns true if the user has already acknowledged the location
 * permission / privacy modal.
 */
export function hasSeenPermissionModal(): boolean {
  return localStorage.getItem(KEYS.PERMISSION_SEEN) === "true";
}

/** Mark the permission modal as acknowledged so it won't show again. */
export function markPermissionSeen(): void {
  localStorage.setItem(KEYS.PERMISSION_SEEN, "true");
}

// ── Delete All / Export (Slice 17) ────────────────────────────────────────────

/** Wipe every SafeWalk key from localStorage. */
export function deleteAllData(): void {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}

/**
 * Serialize all stored SafeWalk data to a pretty-printed JSON string
 * suitable for download.
 */
export function exportAllData(): string {
  const snapshot: Record<string, unknown> = {};
  Object.entries(KEYS).forEach(([label, key]) => {
    const raw = localStorage.getItem(key);
    snapshot[label] = raw ? JSON.parse(raw) : null;
  });
  return JSON.stringify(snapshot, null, 2);
}