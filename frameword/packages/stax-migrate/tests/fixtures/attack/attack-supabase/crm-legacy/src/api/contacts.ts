import { supabase } from "../lib/supabaseClient";

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

// supabase-js v1 style: the table type rides on .from<T>()
export async function listContacts() {
  const { data, error } = await supabase
    .from<Contact>("contacts")
    .select("*")
    .order("last_name");
  if (error) throw error;
  return data;
}

export async function createContact(fields: Partial<Contact>) {
  const { data, error } = await supabase.from<Contact>("contacts").insert(fields);
  if (error) throw error;
  return data;
}
