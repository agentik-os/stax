import { supabase } from "../lib/supabaseClient";

export interface SettingsPatch {
  company_name?: string;
  timezone?: string;
}

/** hand-rolled upsert: the row may not exist yet on first save */
export async function saveSettings(payload: SettingsPatch, exists: boolean) {
  const q = supabase.from("site_settings");
  const { error } = exists
    ? await q.update({ ...payload, updated_at: new Date().toISOString() }).eq("id", 1)
    : await q.insert({ id: 1, ...payload });
  if (error) throw error;
}
