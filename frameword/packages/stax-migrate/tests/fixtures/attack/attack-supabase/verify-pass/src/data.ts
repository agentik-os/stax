import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function getProfile(id: string) {
  const { data } = await supabase
    .from("UserProfiles")
    .select(
      `
      id,
      fullName
    `
    )
    .eq("id", id)
    .single();
  return data;
}

export async function createProfile(payload: { id: string; fullName: string }) {
  const { data, error } = await supabase
    .from("UserProfiles")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function countProfiles() {
  const { count } = await supabase
    .from("UserProfiles")
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

export async function listLedger(orgId: string) {
  const { data } = await supabase
    .schema("accounting")
    .from("ledger_entries")
    .select("*")
    .eq("org_id", orgId);
  return data;
}

export async function dashboardTotals(orgId: string) {
  const { data, error } = await supabase
    .rpc(
      "compute_dashboard_totals",
      { org_id: orgId }
    );
  if (error) throw error;
  return data;
}

export async function uploadAvatar(path: string, blob: Blob) {
  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { upsert: true });
  if (error) throw error;
  return data;
}
