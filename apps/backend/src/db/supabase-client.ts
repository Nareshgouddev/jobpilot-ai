import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { env } from "../config/env.js";
import type { Database } from "./types.js";

const supabaseConfigSchema = z.object({
  supabaseUrl: z.string().trim().url(),
  supabaseServiceRoleKey: z.string().trim().min(1)
});

export type SupabaseConfig = z.infer<typeof supabaseConfigSchema>;

export function parseSupabaseConfig(config: SupabaseConfig): SupabaseConfig {
  return supabaseConfigSchema.parse(config);
}

export function createSupabaseAdminClient(config?: SupabaseConfig): SupabaseClient<Database> {
  const parsed = parseSupabaseConfig(
    config ?? {
      supabaseUrl: env.SUPABASE_URL,
      supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
    }
  );

  return createClient<Database>(parsed.supabaseUrl, parsed.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        "x-application-name": "jobpilot-backend"
      }
    }
  });
}
