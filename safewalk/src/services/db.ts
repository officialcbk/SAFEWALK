// ─── Supabase database service ────────────────────────────────────────────────
// All remote persistence operations. localStorage stays for UI-only prefs
// (permission modal seen flag, last known location cache).

import { supabase } from "../lib/supabase";
import type { TrustedContact } from "../types/contact";
import type { LocationData } from "../types/walk";

// ── Auth ──────────────────────────────────────────────────────────────────────

/** Sign in anonymously if no session exists. Safe to call on every app load. */
export async function ensureAnonymousAuth(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) console.warn("[SafeWalk] Anonymous sign-in failed:", error.message);
  }
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export async function loadContactsDB(): Promise<TrustedContact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[SafeWalk] loadContactsDB:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    isPrimary: r.is_primary,
  }));
}

export async function insertContactDB(
  contact: Omit<TrustedContact, "id">
): Promise<TrustedContact | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      user_id: user.id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      is_primary: contact.isPrimary,
    })
    .select()
    .single();

  if (error) {
    console.warn("[SafeWalk] insertContactDB:", error.message);
    return null;
  }
  return { id: data.id, name: data.name, phone: data.phone, email: data.email, isPrimary: data.is_primary };
}

export async function updateContactDB(contact: TrustedContact): Promise<boolean> {
  const { error } = await supabase
    .from("contacts")
    .update({ name: contact.name, phone: contact.phone, email: contact.email, is_primary: contact.isPrimary })
    .eq("id", contact.id);

  if (error) { console.warn("[SafeWalk] updateContactDB:", error.message); return false; }
  return true;
}

export async function setPrimaryContactDB(id: string): Promise<boolean> {
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from("contacts").update({ is_primary: false }).neq("id", id),
    supabase.from("contacts").update({ is_primary: true }).eq("id", id),
  ]);
  if (e1 || e2) { console.warn("[SafeWalk] setPrimaryContactDB:", e1?.message ?? e2?.message); return false; }
  return true;
}

export async function deleteContactDB(id: string): Promise<boolean> {
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) { console.warn("[SafeWalk] deleteContactDB:", error.message); return false; }
  return true;
}

// ── Walk Sessions ─────────────────────────────────────────────────────────────

export async function createWalkSessionDB(destination: string | null): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("walk_sessions")
    .insert({ user_id: user.id, destination, status: "active" })
    .select("id")
    .single();

  if (error) { console.warn("[SafeWalk] createWalkSessionDB:", error.message); return null; }
  return data.id;
}

export async function endWalkSessionDB(
  sessionId: string,
  status: "completed" | "escalated" = "completed"
): Promise<void> {
  const { error } = await supabase
    .from("walk_sessions")
    .update({ ended_at: new Date().toISOString(), status })
    .eq("id", sessionId);
  if (error) console.warn("[SafeWalk] endWalkSessionDB:", error.message);
}

export async function updateWalkDestinationDB(sessionId: string, destination: string): Promise<void> {
  const { error } = await supabase
    .from("walk_sessions")
    .update({ destination })
    .eq("id", sessionId);
  if (error) console.warn("[SafeWalk] updateWalkDestinationDB:", error.message);
}

// ── Location Snapshots ────────────────────────────────────────────────────────

export async function pushLocationSnapshotDB(sessionId: string, loc: LocationData): Promise<void> {
  const { error } = await supabase
    .from("location_snapshots")
    .insert({ session_id: sessionId, lat: loc.lat, lng: loc.lng, bearing: loc.bearing, speed: loc.speed });
  if (error) console.warn("[SafeWalk] pushLocationSnapshotDB:", error.message);
}

// ── Share Sessions ────────────────────────────────────────────────────────────

export interface ShareSessionRow {
  id: string;
  user_name: string;
  user_phone: string | null;
  last_lat: number | null;
  last_lng: number | null;
  last_bearing: number | null;
  last_speed: number | null;
  last_updated_at: string | null;
  expires_at: string;
}

export async function createShareSessionDB(
  shareId: string,
  walkSessionId: string,
  userName: string,
  userPhone: string,
  loc: LocationData | null
): Promise<boolean> {
  const { error } = await supabase.from("share_sessions").insert({
    id: shareId,
    walk_session_id: walkSessionId,
    user_name: userName,
    user_phone: userPhone || null,
    last_lat: loc?.lat ?? null,
    last_lng: loc?.lng ?? null,
    last_bearing: loc?.bearing ?? null,
    last_speed: loc?.speed ?? null,
    last_updated_at: loc ? new Date().toISOString() : null,
    expires_at: new Date(Date.now() + 24 * 3_600_000).toISOString(),
  });
  if (error) { console.warn("[SafeWalk] createShareSessionDB:", error.message); return false; }
  return true;
}

export async function updateShareSessionLocationDB(shareId: string, loc: LocationData): Promise<void> {
  const { error } = await supabase
    .from("share_sessions")
    .update({
      last_lat: loc.lat,
      last_lng: loc.lng,
      last_bearing: loc.bearing,
      last_speed: loc.speed,
      last_updated_at: new Date().toISOString(),
    })
    .eq("id", shareId);
  if (error) console.warn("[SafeWalk] updateShareSessionLocationDB:", error.message);
}

export async function getShareSessionDB(shareId: string): Promise<ShareSessionRow | null> {
  const { data, error } = await supabase
    .from("share_sessions")
    .select("*")
    .eq("id", shareId)
    .single();
  if (error) { console.warn("[SafeWalk] getShareSessionDB:", error.message); return null; }
  return data;
}

export function subscribeToShareSession(
  shareId: string,
  onUpdate: (row: ShareSessionRow) => void
) {
  return supabase
    .channel(`share_session_${shareId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "share_sessions", filter: `id=eq.${shareId}` },
      (payload) => onUpdate(payload.new as ShareSessionRow)
    )
    .subscribe();
}

// ── Delete All User Data ──────────────────────────────────────────────────────

export async function deleteAllUserDataDB(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  // ON DELETE CASCADE handles location_snapshots and share_sessions automatically
  await Promise.all([
    supabase.from("walk_sessions").delete().eq("user_id", user.id),
    supabase.from("contacts").delete().eq("user_id", user.id),
  ]);
}
