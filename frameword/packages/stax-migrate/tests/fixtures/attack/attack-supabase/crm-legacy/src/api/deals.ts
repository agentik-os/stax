import { supabase } from "../lib/supabaseClient";

export async function listDeals(stage?: string) {
  let query = supabase.from("deals").select("*").order("amount_cents", { ascending: false });
  if (stage) query = query.eq("stage", stage);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
