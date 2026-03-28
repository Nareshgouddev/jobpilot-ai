import { describe, expect, it } from "vitest";

import { ClaudeApiError } from "../../src/ai/claude-client.js";
import { CoverLetterGenerationService } from "../../src/ai/generation-service.js";

describe("CoverLetterGenerationService", () => {
  it("returns parsed content and metadata", async () => {
    const service = new CoverLetterGenerationService(
      {
        async generateJsonCompletion() {
          return {
            text: JSON.stringify({
              subjectLine: "Application: Frontend Engineer",
              keyHighlights: ["React leadership", "Performance optimization"],
              coverLetter: "E".repeat(180)
            }),
            model: "claude-test",
            stopReason: "end_turn",
            usage: {
              inputTokens: 120,
              outputTokens: 250
            }
          };
        }
      },
      { retries: 1, baseDelayMs: 1, maxDelayMs: 10 }
    );

    const result = await service.generate({
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
        experienceSummary: "B".repeat(220)
      }
    });

    expect(result.content.keyHighlights).toHaveLength(2);
    expect(result.metadata.provider).toBe("anthropic");
  });

  it("retries retryable Claude failures", async () => {
    let attempts = 0;
    const service = new CoverLetterGenerationService(
      {
        async generateJsonCompletion() {
          attempts += 1;
          if (attempts === 1) {
            throw new ClaudeApiError("rate limited", 429, true);
          }

          return {
            text: JSON.stringify({
              subjectLine: "Application: Product Engineer",
              keyHighlights: ["System design", "Cross-functional delivery"],
              coverLetter: "F".repeat(190)
            }),
            model: "claude-test",
            stopReason: "end_turn",
            usage: {
              inputTokens: 110,
              outputTokens: 210
            }
          };
        }
      },
      { retries: 2, baseDelayMs: 1, maxDelayMs: 10 }
    );

    const result = await service.generate({
      tone: "concise",
      job: {
        title: "Product Engineer",
        company: "Acme",
        location: "Remote",
        description: "A".repeat(220),
        employmentType: "contract"
      },
      applicantProfile: {
        fullName: "Alex Dev",
        skills: ["Node.js", "SQL"],
        experienceSummary: "B".repeat(220)
      }
    });

    expect(result.content.subjectLine).toContain("Product Engineer");
    expect(attempts).toBe(2);
  });
});
