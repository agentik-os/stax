import { supabase } from "../lib/supabaseClient";

export interface FeedbackEntry {
  message: string;
  rating: number;
  page: string;
}

export async function submitFeedback(entry: FeedbackEntry) {
  const feedback = supabase.from("feedback");
  const { error } = await feedback.insert({ ...entry, created_at: new Date().toISOString() });
  if (error) throw error;
}
