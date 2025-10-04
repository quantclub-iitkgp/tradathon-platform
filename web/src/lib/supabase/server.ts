import { createClient } from "@supabase/supabase-js";
import { env, hasSupabasePublicEnv } from "@/lib/env";

export function getSupabaseServer() {
  if (!hasSupabasePublicEnv()) {
    throw new Error("Supabase env not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: env.NEXT_PUBLIC_SUPABASE_REALTIME_HEADERS ? JSON.parse(env.NEXT_PUBLIC_SUPABASE_REALTIME_HEADERS) : undefined,
      },
    }
  );
}


