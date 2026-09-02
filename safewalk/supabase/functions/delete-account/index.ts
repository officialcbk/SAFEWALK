// ─── Supabase Edge Function: delete-account ───────────────────────────────────
// Permanently deletes the calling user's account and all their data.
// This function did not exist until now — the app had been calling it and
// silently ignoring the resulting error, so "Delete all my data" always
// signed the user out and claimed success while their actual auth.users row
// (and anything client-side deletes didn't reach) was left behind. See the
// mobile app's account-delete.tsx / web's Settings.tsx deleteAll.
//
// Security: only ever deletes the AUTHENTICATED caller's own account — the
// user_id the client sends is intentionally ignored. Trusting a
// client-supplied user_id here would let any signed-in user delete anyone
// else's account by passing their id (the same "trust the server, not the
// client" fix applied to send-alert).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Identify the caller from their own token — never from the request body.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated." }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Deleting the auth user (and cleaning up any rows client-side deletes
    // may have missed, e.g. from a hung request) requires elevated
    // privileges a normal user session doesn't have.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    await Promise.all([
      adminClient.from("trusted_contacts").delete().eq("user_id", user.id),
      adminClient.from("walk_sessions").delete().eq("user_id", user.id),
      adminClient.from("feedback").delete().eq("user_id", user.id),
      adminClient.from("profiles").delete().eq("id", user.id),
    ]);

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
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
