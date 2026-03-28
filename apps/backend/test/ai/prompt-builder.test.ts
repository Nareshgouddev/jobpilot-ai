import { describe, expect, it } from "vitest";

import { buildCoverLetterPrompt } from "../../src/ai/prompt-builder.js";

describe("buildCoverLetterPrompt", () => {
  it("includes core fields and output instructions", () => {
    const prompt = buildCoverLetterPrompt({
      tone: "formal",
      job: {
        title: "Frontend Engineer",
        company: "Acme",
        location: "Remote",
        description: "A".repeat(220),
        employmentType: "full-time"
      },
      applicantProfile: {
        fullName: "Taylor Dev",
        skills: ["React", "TypeScript"],
        experienceSummary: "B".repeat(250)
      }
    });

    expect(prompt).toContain("Return ONLY valid JSON");
    expect(prompt).toContain("title: Frontend Engineer");
    expect(prompt).toContain("skills: React, TypeScript");
  });
});
