import { describe, expect, it } from "vitest";

import { parseSupabaseConfig } from "../src/db/supabase-client.js";

describe("parseSupabaseConfig", () => {
  it("accepts valid configuration", () => {
    const parsed = parseSupabaseConfig({
      supabaseUrl: "https://example.supabase.co",
      supabaseServiceRoleKey: "service-role-key"
    });

    expect(parsed.supabaseUrl).toBe("https://example.supabase.co");
  });

  it("throws for invalid url", () => {
    expect(() =>
      parseSupabaseConfig({
        supabaseUrl: "not-a-url",
        supabaseServiceRoleKey: "service-role-key"
      })
    ).toThrowError();
  });
});
