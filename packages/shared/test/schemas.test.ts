import { describe, expect, it } from "vitest";

import { aiGenerationRequestSchema, jobInputSchema } from "../src/schemas";

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
