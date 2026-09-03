// ─── Alert service ─────────────────────────────────────────────────────────────
// SOS alert preview and real SMS delivery via Supabase Edge Function

import { supabase } from "../lib/supabase";
import { withTimeout } from "./withTimeout";

/**
 * Consecutive missed check-ins before triggerMissedCheckInAlert fires —
 * shared by home.tsx's counting logic and the copy shown on the check-in
 * overlay and walk-confirm screen, so they can't drift out of sync.
 */
export const MISSED_CHECKINS_THRESHOLD = 3;

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
    // send-alert sources the actual SMS recipients itself, server-side, from
    // this authenticated caller's own trusted_contacts rows — it doesn't
    // trust a client-supplied contacts list (see the function's own comment
    // for why). The `contacts` fetched above is only for local UI display
    // (the SOS overlay's "X, Y notified").
    await withTimeout(supabase.functions.invoke('send-alert', { body: { message } }), 10000);
  } catch {
    return { contacts, alertError: 'Alert may not have sent.' };
  }

  return { contacts };
}

/**
 * Fires when MISSED_CHECKINS_THRESHOLD check-ins in a row go unanswered —
 * the walk-confirm screen tells the user this happens, so it needs to
 * actually happen. Deliberately
 * lighter than triggerSOS: marks the session 'escalating' (not
 * 'sos_triggered', which is reserved for the user's own deliberate SOS) and
 * sends a "missed check-ins" SMS rather than an "EMERGENCY" one, since this
 * is an automatic system detection, not a confirmed emergency.
 */
export async function triggerMissedCheckInAlert(params: {
  sessionId: string;
  userId: string;
  userName: string;
  shareToken: string | null;
}): Promise<{ contacts: SosContact[]; alertError?: string }> {
  const { sessionId, userId, userName, shareToken } = params;

  try {
    await withTimeout(
      supabase.from('walk_sessions').update({ status: 'escalating' }).eq('id', sessionId),
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
    ? `Trayl: ${userName} has missed ${MISSED_CHECKINS_THRESHOLD} check-ins in a row on their walk. Last known location: ${shareUrl}`
    : `Trayl: ${userName} has missed ${MISSED_CHECKINS_THRESHOLD} check-ins in a row on their walk. Please check on them.`;

  try {
    await withTimeout(supabase.functions.invoke('send-alert', { body: { message } }), 10000);
  } catch {
    return { contacts, alertError: 'Alert may not have sent.' };
  }

  return { contacts };
}
