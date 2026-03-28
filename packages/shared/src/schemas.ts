import { z } from "zod";

export const emailSchema = z.string().trim().email();

export const jobInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(120),
  description: z.string().trim().min(20).max(12000),
  employmentType: z.enum(["full-time", "part-time", "contract", "internship", "other"]),
  sourceUrl: z.string().trim().url().optional(),
  contactEmail: emailSchema.optional()
});

export type JobInput = z.infer<typeof jobInputSchema>;

export const aiGenerationRequestSchema = z.object({
  job: jobInputSchema,
  applicantProfile: z.object({
    fullName: z.string().trim().min(2).max(100),
    skills: z.array(z.string().trim().min(1)).min(1).max(100),
    experienceSummary: z.string().trim().min(20).max(5000)
  }),
  tone: z.enum(["formal", "concise", "friendly"]).default("formal")
});

export type AiGenerationRequest = z.infer<typeof aiGenerationRequestSchema>;

export const authSessionRequestSchema = z.object({
  userId: z.string().trim().uuid(),
  email: emailSchema,
  fullName: z.string().trim().min(2).max(100).optional()
});

export type AuthSessionRequest = z.infer<typeof authSessionRequestSchema>;

export const authTokenResponseSchema = z.object({
  accessToken: z.string().min(20),
  tokenType: z.literal("Bearer"),
  expiresInSeconds: z.number().int().positive(),
  issuedAt: z.string().datetime()
});

export type AuthTokenResponse = z.infer<typeof authTokenResponseSchema>;
