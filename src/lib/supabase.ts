import { createClient } from "@supabase/supabase-js";

// The publishable key is meant to be public: it only allows what the
// row level security rules in supabase/setup.sql allow.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key ? createClient(url, key) : null;
