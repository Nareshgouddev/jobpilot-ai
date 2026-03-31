import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  SUPABASE_URL: z.string().trim().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
  OPENROUTER_API_KEY: z.string().trim().min(1),
  OPENROUTER_MODEL: z.string().trim().min(1).default("openrouter/auto"),
  OPENROUTER_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(20000),
  OPENROUTER_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  JWT_SECRET: z.string().trim().min(24),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(86400).default(900),
  JWT_ISSUER: z.string().trim().min(2).default("jobpilot-backend"),
  JWT_AUDIENCE: z.string().trim().min(2).default("jobpilot-extension"),
  EXTENSION_SHARED_SECRET: z.string().trim().min(24),
  ADMIN_API_KEY: z.string().trim().min(24),
  SENTRY_DSN: z.string().trim().url().optional(),
  CORS_ORIGIN: z.string().trim().min(1),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info")
});

const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  const errors = envResult.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${errors}`);
}

export const env = envResult.data;
