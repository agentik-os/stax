import { createClient } from "@supabase/supabase-js";
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON);

export const listInvoices = () => supabase.from("invoices").select("*");
export const addInvoice = (row: object) => supabase.from("invoices").insert(row);
export const closeMonth = () => supabase.rpc("close_month", { month: "2026-07" });
export const live = () => supabase.channel("room:invoices").on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => {}).subscribe();
export const avatar = (id: string) => supabase.storage.from("avatars").getPublicUrl(id);
const tbl = "dynamic_" + Date.now();
export const risky = () => supabase.from(tbl).select();

/* Prettier formats real chains across lines — v1 line-grep missed ALL of these */
export const listPayments = async () =>
  supabase
    .from("payments")
    .select("*")
    .order("amount");

export const refund = async (id: string) =>
  supabase
    .from("payments")
    .update({ amount: 0 })
    .eq("id", id);

// a commented-out call must never count: supabase.from("ghost_table").select()
/* neither must this one:
   supabase.from("phantom").delete()
*/

/* the stored-builder pattern: the table must surface + warn (ops unprovable) */
const ordersBase = supabase.from("orders");
export const orderList = () => ordersBase.select("*");
