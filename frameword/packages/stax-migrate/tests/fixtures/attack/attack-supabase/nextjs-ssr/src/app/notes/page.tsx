import { createClient } from "../../lib/supabase/server";

export default async function NotesPage() {
  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <ul>
      {(notes ?? []).map((n) => (
        <li key={n.id}>{n.title}</li>
      ))}
    </ul>
  );
}
