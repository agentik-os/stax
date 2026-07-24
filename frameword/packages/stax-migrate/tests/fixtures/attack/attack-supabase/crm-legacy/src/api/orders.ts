import { supabase } from "../lib/supabaseClient";

// Prettier (printWidth 80) breaks the long ternary argument onto its own line
export async function listOrders(includeArchived: boolean) {
  const { data, error } = await supabase
    .from(
      includeArchived ? "customer_orders_archive" : "customer_orders"
    )
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
