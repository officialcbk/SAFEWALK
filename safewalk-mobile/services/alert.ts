// ─── Alert service ─────────────────────────────────────────────────────────────
// SOS alert preview and real SMS delivery via Supabase Edge Function

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

/**
 * Generate the trusted-contact share URL from a session ID.
 * Points at the web app's public /track/:token page — trusted contacts open
 * this in a browser, no app install required.
 */
export function buildShareUrl(shareToken: string): string {
  const base = process.env.EXPO_PUBLIC_WEB_BASE_URL as string;
  return `${base}/track/${shareToken}`;
}

/**
 * Send SMS alerts to all trusted contacts via the Supabase Edge Function.
 * Falls back to console logging if the function call fails.
 */
export async function sendAlert(payload: AlertPayload): Promise<void> {
  const message = buildSmsMessage(payload.userName, payload.location, payload.sessionUrl);

  // Always log for debugging
  console.log("[Trayl] 🚨 SOS Alert", {
    triggeredAt: payload.triggeredAt.toISOString(),
    user: payload.userName,
    contacts: payload.contacts.map((c) => c.name).join(", "),
    location: payload.location,
    message,
  });

  if (!payload.contacts.length) {
    console.warn("[Trayl] No contacts to alert.");
    return;
  }

  const { data, error } = await supabase.functions.invoke("send-alert", {
    body: {
      contacts: payload.contacts.map((c) => ({ name: c.name, phone: c.phone })),
      message,
    },
  });

  if (error) {
    console.warn("[Trayl] SMS delivery failed:", error.message);
    return;
  }

  console.log(`[Trayl] SMS — sent: ${data.sent}, failed: ${data.failed}`);
  if (data.failed > 0) {
    data.results
      .filter((r: { success: boolean; name: string; error?: string }) => !r.success)
      .forEach((r: { name: string; error?: string }) =>
        console.warn(`[Trayl] Failed to SMS ${r.name}:`, r.error)
      );
  }
}
