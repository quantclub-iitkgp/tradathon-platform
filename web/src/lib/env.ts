// Centralized environment variable access for Supabase

function requireEnv(name: string, allowEmpty = false): string {
  const value = process.env[name];
  if (value === undefined || (!allowEmpty && value.length === 0)) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  // Public (browser) variables
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  NEXT_PUBLIC_SUPABASE_REALTIME_HEADERS: process.env.NEXT_PUBLIC_SUPABASE_REALTIME_HEADERS ?? "",

  // Server-only
  get SUPABASE_SERVICE_ROLE_KEY(): string {
    return requireEnv("SUPABASE_SERVICE_ROLE_KEY", true);
  },
};

export function hasSupabasePublicEnv(): boolean {
  return (
    typeof env.NEXT_PUBLIC_SUPABASE_URL === "string" && env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    typeof env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" && env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0
  );
}


