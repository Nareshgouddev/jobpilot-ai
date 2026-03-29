import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  jobInputSchema,
  aiGenerationRequestSchema,
  authSessionRequestSchema,
  authTokenResponseSchema,
  emailSchema
} from "../src/schemas";

describe("contract parity", () => {
  describe("schema structure consistency", () => {
    it("job schema has required fields for capture and API", () => {
      const requiredFields = jobInputSchema.keyof().options;
      expect(requiredFields).toContain("title");
      expect(requiredFields).toContain("company");
      expect(requiredFields).toContain("location");
    });

    it("email schema enforces valid email format", () => {
      expect(() => emailSchema.parse("invalid")).toThrow();
      expect(emailSchema.parse("test@example.com")).toBe("test@example.com");
    });

    it("generation request schema includes applicant profile", () => {
      const request = aiGenerationRequestSchema.parse({
        job: {
          title: "Engineer",
          company: "Corp",
          location: "Remote",
          description: "Build systems and collaborate",
          employmentType: "full-time"
        },
        applicantProfile: {
          fullName: "Jane Doe",
          skills: ["JavaScript", "React"],
          experienceSummary: "5 years of software development experience"
        }
      });

      expect(request.job.title).toBe("Engineer");
      expect(request.applicantProfile.fullName).toBe("Jane Doe");
    });

    it("auth schemas provide symmetric request/response", () => {
      const request = authSessionRequestSchema.parse({
        userId: "550e8400-e29b-41d4-a716-446655440000",
        email: "user@example.com"
      });

      expect(request).toHaveProperty("email");

      const response = authTokenResponseSchema.parse({
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        tokenType: "Bearer",
        expiresInSeconds: 3600,
        issuedAt: new Date().toISOString()
      });

      expect(response).toHaveProperty("accessToken");
      expect(response.expiresInSeconds).toBeGreaterThan(0);
    });
  });

  describe("backward compatibility", () => {
    it("job schema enforces required fields consistently", () => {
      const job = jobInputSchema.parse({
        title: "Role",
        company: "Corp",
        location: "Remote",
        description: "This is a job description with enough words",
        employmentType: "full-time"
      });

      expect(job).toHaveProperty("title");
      expect(job.title).toBe("Role");
    });

    it("job schema ignores unexpected fields (Zod default)", () => {
      const job = jobInputSchema.parse({
        title: "Role",
        company: "Corp",
        location: "Remote",
        description: "This is enough content",
        employmentType: "full-time",
        unexpectedField: "ignored"
      } as any);

      expect(job).toHaveProperty("title");
      expect(job).not.toHaveProperty("unexpectedField");
    });

    it("generation request enforces tone options", () => {
      expect(() => {
        aiGenerationRequestSchema.parse({
          job: {
            title: "R",
            company: "C",
            location: "L",
            description: "This is enough content for a description here",
            employmentType: "full-time"
          },
          applicantProfile: {
            fullName: "Jane",
            skills: ["JS"],
            experienceSummary: "Has experience in the field"
          },
          tone: "unknown_tone"
        } as any);
      }).toThrow();
    });
  });

  describe("edge case handling", () => {
    it("job title cannot be empty or whitespace-only", () => {
      expect(() => {
        jobInputSchema.parse({
          title: "   ",
          company: "Corp",
          location: "Remote",
          description: "Description with enough content",
          employmentType: "full-time"
        });
      }).toThrow();
    });

    it("email must be well-formed", () => {
      expect(() => {
        emailSchema.parse("user@");
      }).toThrow();

      expect(() => {
        emailSchema.parse("@example.com");
      }).toThrow();
    });

    it("generation request handles optional tone", () => {
      const request = aiGenerationRequestSchema.parse({
        job: {
          title: "Role",
          company: "Corp",
          location: "Remote",
          description: "Description with enough content",
          employmentType: "full-time"
        },
        applicantProfile: {
          fullName: "Jane",
          skills: ["JS"],
          experienceSummary: "Has experience in the field here"
        }
      });

      expect(request.tone).toBe("formal");
    });
  });

  describe("snapshot stability", () => {
    it("job schema structure remains stable", () => {
      const shape = jobInputSchema.shape;
      expect(Object.keys(shape).sort()).toMatchInlineSnapshot(`
        [
          "company",
          "contactEmail",
          "description",
          "employmentType",
          "location",
          "sourceUrl",
          "title",
        ]
      `);
    });

    it("auth response schema enforces token contract", () => {
      const response = authTokenResponseSchema.parse({
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        tokenType: "Bearer",
        expiresInSeconds: 7200,
        issuedAt: new Date().toISOString()
      });

      expect(response.accessToken).toBeTruthy();
      expect(response.expiresInSeconds).toBe(7200);
    });
  });

  describe("version skew detection", () => {
    it("detects missing required fields early", () => {
      const incompleteJob = {
        title: "Role"
      };

      expect(() => jobInputSchema.parse(incompleteJob)).toThrow();
    });

    it("rejects unexpected field types", () => {
      expect(() => {
        aiGenerationRequestSchema.parse({
          job: { title: "R" },
          applicantProfile: { fullName: "J", skills: ["JS"], experienceSummary: "Has experience" }
        });
      }).toThrow();
    });

    it("email type strictness", () => {
      expect(() => {
        emailSchema.parse(12345 as any);
      }).toThrow();
    });
  });
});
