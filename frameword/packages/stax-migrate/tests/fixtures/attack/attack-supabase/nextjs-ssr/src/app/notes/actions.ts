"use server";

import { createClient } from "../../lib/supabase/server";

export async function addNote(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notes")
    .insert({ title: String(formData.get("title") ?? "") });
  if (error) throw error;
}
