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

// Education entry stored inside the education JSONB array
export const educationEntrySchema = z.object({
  institution: z.string().trim().min(1).max(200),
  degree: z.string().trim().min(1).max(100),
  fieldOfStudy: z.string().trim().max(100).optional(),
  startYear: z.string().trim().max(4).optional(),
  endYear: z.string().trim().max(4).optional(),
  gpa: z.string().trim().max(10).optional()
});

export type EducationEntry = z.infer<typeof educationEntrySchema>;

// Full candidate profile for PUT /api/profile/me
export const candidateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  skills: z.array(z.string().trim().min(1)).min(1).max(100),
  experienceSummary: z.string().trim().min(20).max(5000),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  linkedinUrl: z.string().trim().url().optional().or(z.literal("")),
  portfolioUrl: z.string().trim().url().optional().or(z.literal("")),
  education: z.array(educationEntrySchema).default([]),
  certifications: z.array(z.string().trim().max(200)).default([])
});

export type CandidateProfile = z.infer<typeof candidateProfileSchema>;

// Profile response from GET /api/profile/me
export const candidateProfileResponseSchema = candidateProfileSchema.extend({
  id: z.string(),
  email: z.string(),
  resumeFilename: z.string().nullable(),
  resumeMimeType: z.string().nullable(),
  resumeUploadedAt: z.string().datetime().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type CandidateProfileResponse = z.infer<typeof candidateProfileResponseSchema>;

// Resume upload response
export const resumeUploadResponseSchema = z.object({
  resumeId: z.string().uuid(),
  filename: z.string(),
  mimeType: z.string(),
  uploadedAt: z.string().datetime(),
  isDuplicate: z.boolean()
});

export type ResumeUploadResponse = z.infer<typeof resumeUploadResponseSchema>;
