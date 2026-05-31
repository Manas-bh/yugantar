import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

let cachedSupabaseAdminClient: SupabaseClient | null = null;
let hasLoggedSupabaseConfigWarning = false;

export class SupabaseConfigError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)."
    );
    this.name = "SupabaseConfigError";
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)
  );
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (cachedSupabaseAdminClient) {
    return cachedSupabaseAdminClient;
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !serviceKey) {
    if (!hasLoggedSupabaseConfigWarning) {
      hasLoggedSupabaseConfigWarning = true;
      logger.warn(new SupabaseConfigError().message);
    }

    throw new SupabaseConfigError();
  }

  cachedSupabaseAdminClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedSupabaseAdminClient;
}
