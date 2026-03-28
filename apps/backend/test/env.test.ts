import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe("env validation", () => {
  it("throws on missing required values", async () => {
    process.env = {
      NODE_ENV: "test",
      PORT: "4000"
    };

    await expect(import("../src/config/env.js")).rejects.toThrowError(/Invalid environment configuration/);
  });

  it("parses and exposes typed env", async () => {
    process.env = {
      NODE_ENV: "test",
      PORT: "4020",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      CLAUDE_API_KEY: "claude-key",
      CLAUDE_MODEL: "claude-3-5-sonnet-20241022",
      CLAUDE_TIMEOUT_MS: "20000",
      CLAUDE_MAX_RETRIES: "2",
      JWT_SECRET: "this_is_a_test_secret_that_is_long_enough",
      CORS_ORIGIN: "http://localhost:5173",
      LOG_LEVEL: "debug"
    };

    const module = await import("../src/config/env.js");

    expect(module.env.PORT).toBe(4020);
    expect(module.env.LOG_LEVEL).toBe("debug");
  });
});
