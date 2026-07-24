// legacy app — supabase-js v1 (package.json pins @supabase/supabase-js@^1.35.7)
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!
);
