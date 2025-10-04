"use client";
import { createClient } from "@supabase/supabase-js";
import { env, hasSupabasePublicEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!browserClient) {
    if (!hasSupabasePublicEnv()) throw new Error("Supabase env not configured in browser");
    browserClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
      global: {
        headers: env.NEXT_PUBLIC_SUPABASE_REALTIME_HEADERS ? JSON.parse(env.NEXT_PUBLIC_SUPABASE_REALTIME_HEADERS) : undefined,
      },
    });
  }
  return browserClient;
}


