import { createClient } from "@supabase/supabase-js";
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON);

export const listInvoices = () => supabase.from("invoices").select("*");
export const addInvoice = (row: object) => supabase.from("invoices").insert(row);
export const closeMonth = () => supabase.rpc("close_month", { month: "2026-07" });
export const live = () => supabase.channel("room:invoices").on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => {}).subscribe();
export const avatar = (id: string) => supabase.storage.from("avatars").getPublicUrl(id);
const tbl = "dynamic_" + Date.now();
export const risky = () => supabase.from(tbl).select();
