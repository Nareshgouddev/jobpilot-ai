import { describe, expect, it } from "vitest";

import { aiGenerationRequestSchema, authSessionRequestSchema, authTokenResponseSchema, jobInputSchema } from "../src/schemas";

describe("jobInputSchema", () => {
  it("accepts a valid job payload", () => {
    const parsed = jobInputSchema.safeParse({
      title: "Senior Frontend Engineer",
      company: "Acme Corp",
      location: "Remote",
      description: "A".repeat(50),
      employmentType: "full-time",
      sourceUrl: "https://example.com/jobs/1",
      contactEmail: "recruiting@example.com"
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid email and too-short description", () => {
    const parsed = jobInputSchema.safeParse({
      title: "SE",
      company: "Acme Corp",
      location: "Remote",
      description: "Too short",
      employmentType: "full-time",
      contactEmail: "bad-email"
    });

    expect(parsed.success).toBe(false);
  });
});

describe("aiGenerationRequestSchema", () => {
  it("defaults tone to formal", () => {
    const parsed = aiGenerationRequestSchema.parse({
      job: {
        title: "Engineer",
        company: "Acme",
        location: "Remote",
        description: "A".repeat(50),
        employmentType: "contract"
      },
      applicantProfile: {
        fullName: "Taylor Doe",
        skills: ["React"],
        experienceSummary: "B".repeat(40)
      }
    });

    expect(parsed.tone).toBe("formal");
  });
});

describe("auth schemas", () => {
  it("accepts valid session request", () => {
    const parsed = authSessionRequestSchema.safeParse({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      email: "user@example.com",
      fullName: "Taylor Dev"
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects malformed token response", () => {
    const parsed = authTokenResponseSchema.safeParse({
      accessToken: "short",
      tokenType: "Bearer",
      expiresInSeconds: 0,
      issuedAt: "bad-date"
    });

    expect(parsed.success).toBe(false);
  });
});
