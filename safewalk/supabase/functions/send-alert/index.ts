// ─── Supabase Edge Function: send-alert ───────────────────────────────────────
// Sends SMS to all trusted contacts via Twilio when SOS is triggered.
// Secrets required (set in Supabase Dashboard → Settings → Edge Functions):
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Contact {
  name: string;
  phone: string;
}

interface SendAlertPayload {
  contacts: Contact[];
  message: string;
}

interface SmsResult {
  name: string;
  phone: string;
  success: boolean;
  error?: string;
}

async function sendSms(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = btoa(`${accountSid}:${authToken}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    return { success: false, error: err.message ?? res.statusText };
  }
  return { success: true };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken  = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

    if (!accountSid || !authToken || !fromNumber) {
      return new Response(
        JSON.stringify({ error: "Twilio secrets not configured." }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const { contacts, message } = (await req.json()) as SendAlertPayload;

    if (!contacts?.length || !message) {
      return new Response(
        JSON.stringify({ error: "contacts and message are required." }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const results: SmsResult[] = await Promise.all(
      contacts.map(async (contact) => {
        const result = await sendSms(accountSid, authToken, fromNumber, contact.phone, message);
        return { name: contact.name, phone: contact.phone, ...result };
      })
    );

    const sent   = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`[SafeWalk] Alerts — sent: ${sent}, failed: ${failed}`);

    return new Response(
      JSON.stringify({ sent, failed, results }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
