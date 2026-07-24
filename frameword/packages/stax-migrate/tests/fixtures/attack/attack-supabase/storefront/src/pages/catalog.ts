import { supabase } from "../lib/supabase";

export async function loadCatalog() {
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("name");
  if (error) throw error;
  return products;
}

export async function loadDashboardStats() {
  // reads the reporting view shipped in 20240215000000_product_stats.sql
  const { data: stats, error } = await supabase
    .from("product_stats")
    .select("*");
  if (error) throw error;
  return stats;
}

export async function createProfile(userId: string, fullName: string) {
  const { error } = await supabase
    .from("profiles")
    .insert({ id: userId, full_name: fullName });
  if (error) throw error;
}
