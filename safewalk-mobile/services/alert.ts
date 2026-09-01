// ─── Alert service ─────────────────────────────────────────────────────────────
// SOS alert preview and real SMS delivery via Supabase Edge Function

import { supabase } from "../lib/supabase";
import { withTimeout } from "./withTimeout";
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

export interface SosContact {
  name: string;
  phone: string;
}

/**
 * The single source of truth for "actually send an SOS" — marks the walk
 * session sos_triggered, loads trusted contacts, and fires the Twilio alert.
 * Shared by the in-app hold-to-confirm SOS button and the lock-screen
 * notification countdown, so there is exactly one place this safety-critical
 * side effect is implemented rather than two implementations that can drift.
 * Every network step is timeout-wrapped — see withTimeout.ts — since this
 * can run from a notification-response listener with no UI to fall back on.
 */
export async function triggerSOS(params: {
  sessionId: string;
  userId: string;
  userName: string;
  shareToken: string | null;
}): Promise<{ contacts: SosContact[]; alertError?: string }> {
  const { sessionId, userId, userName, shareToken } = params;

  try {
    await withTimeout(
      supabase.from('walk_sessions').update({ status: 'sos_triggered' }).eq('id', sessionId),
      10000,
    );
  } catch {
    // Non-fatal — proceed to alert contacts regardless of whether this sync landed.
  }

  let contacts: SosContact[] = [];
  try {
    const { data } = await withTimeout(
      supabase.from('trusted_contacts').select('full_name, phone').eq('user_id', userId),
      10000,
    );
    contacts = (data ?? []).map((c: { full_name: string; phone: string }) => ({ name: c.full_name, phone: c.phone }));
  } catch {
    return { contacts: [], alertError: "Couldn't load your contacts." };
  }

  if (!contacts.length) {
    return { contacts: [], alertError: 'No trusted contacts to alert.' };
  }

  const shareUrl = shareToken ? buildShareUrl(shareToken) : null;
  const message = shareUrl
    ? `EMERGENCY: ${userName} has triggered an SOS on Trayl. Track their live location: ${shareUrl}`
    : `EMERGENCY: ${userName} has triggered an SOS on Trayl. Please check on them immediately.`;

  try {
    await withTimeout(supabase.functions.invoke('send-alert', { body: { contacts, message } }), 10000);
  } catch {
    return { contacts, alertError: 'Alert may not have sent.' };
  }

  return { contacts };
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
