// ─── Supabase Edge Function: send-alert ───────────────────────────────────────
// Sends SMS to all trusted contacts via Twilio when SOS is triggered.
// Secrets required (set in Supabase Dashboard → Settings → Edge Functions):
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
//
// Security: the caller's contacts are ALWAYS looked up server-side from the
// authenticated caller's own trusted_contacts rows — the request body's
// `contacts` field, if present, is ignored. This function used to trust
// whatever `contacts` array the client sent, which meant anyone holding the
// public anon key (bundled into the app by design, not a secret) could POST
// an arbitrary phone-number list and message and get free SMS sent via this
// project's Twilio account to anyone in the world. Requiring a real
// authenticated user (not just a validly-shaped anon-key request) and
// sourcing contacts from the DB — where RLS already restricts a user to
// their own trusted_contacts rows — closes that off.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendAlertPayload {
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

    // A client scoped to the CALLER's own auth token (not the service role)
    // — .auth.getUser() only succeeds with a genuine signed-in user's JWT,
    // and any query below inherits that user's row-level-security scope.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated." }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const { message } = (await req.json()) as SendAlertPayload;
    if (!message) {
      return new Response(
        JSON.stringify({ error: "message is required." }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // RLS on trusted_contacts scopes this to the authenticated user's own
    // rows regardless of what's queried for — this is the actual SMS
    // destination list, never the client-supplied one.
    const { data: contacts, error: contactsError } = await userClient
      .from("trusted_contacts")
      .select("full_name, phone")
      .eq("user_id", user.id);

    if (contactsError) {
      return new Response(
        JSON.stringify({ error: "Could not load trusted contacts." }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
    if (!contacts?.length) {
      return new Response(
        JSON.stringify({ error: "No trusted contacts to alert." }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const results: SmsResult[] = await Promise.all(
      contacts.map(async (contact) => {
        const result = await sendSms(accountSid, authToken, fromNumber, contact.phone, message);
        return { name: contact.full_name, phone: contact.phone, ...result };
      })
    );

    const sent   = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`[SafeWalk] Alerts for user ${user.id} — sent: ${sent}, failed: ${failed}`);

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
