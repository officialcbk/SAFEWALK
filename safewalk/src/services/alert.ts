// ─── Alert service ─────────────────────────────────────────────────────────────
// Slice 11 – SOS alert preview and real SMS delivery via Supabase Edge Function

import { supabase } from "../lib/supabase";
import type { TrustedContact } from "../types/contact";
import type { LocationData } from "../types/walk";

export interface AlertPayload {
  userName: string;
  contacts: TrustedContact[];
  location: LocationData | null;
  sessionUrl: string;
  triggeredAt: Date;
}

/**
 * Build the SMS message sent to each trusted contact.
 * @example "⚠️ Emergency alert from Alex. Location: 43.65320, -79.38320. Track here: https://…"
 */
export function buildSmsMessage(
  userName: string,
  location: LocationData | null,
  sessionUrl: string
): string {
  const coords = location
    ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
    : "unknown";
  return `⚠️ Emergency alert from ${userName}. Location: ${coords}. Track here: ${sessionUrl}`;
}

/** Generate the trusted-contact share URL from a session ID. */
export function buildShareUrl(sessionId: string): string {
  return `${window.location.origin}/share/${sessionId}`;
}

/**
 * Send SMS alerts to all trusted contacts via the Supabase Edge Function.
 * Falls back to console logging if the function call fails.
 */
export async function sendAlert(payload: AlertPayload): Promise<void> {
  const message = buildSmsMessage(payload.userName, payload.location, payload.sessionUrl);

  // Always log for debugging
  console.group("[SafeWalk] 🚨 SOS Alert");
  console.log("Triggered at :", payload.triggeredAt.toISOString());
  console.log("User         :", payload.userName);
  console.log("Contacts     :", payload.contacts.map((c) => c.name).join(", "));
  console.log("Location     :", payload.location);
  console.log("Message      :", message);
  console.groupEnd();

  if (!payload.contacts.length) {
    console.warn("[SafeWalk] No contacts to alert.");
    return;
  }

  const { data, error } = await supabase.functions.invoke("send-alert", {
    body: {
      contacts: payload.contacts.map((c) => ({ name: c.name, phone: c.phone })),
      message,
    },
  });

  if (error) {
    console.warn("[SafeWalk] SMS delivery failed:", error.message);
    return;
  }

  console.log(`[SafeWalk] SMS — sent: ${data.sent}, failed: ${data.failed}`);
  if (data.failed > 0) {
    data.results
      .filter((r: { success: boolean; name: string; error?: string }) => !r.success)
      .forEach((r: { name: string; error?: string }) =>
        console.warn(`[SafeWalk] Failed to SMS ${r.name}:`, r.error)
      );
  }
}

/** @deprecated Use sendAlert instead. Kept for backwards compatibility. */
export function logAlertPayload(payload: AlertPayload): void {
  sendAlert(payload);
}
