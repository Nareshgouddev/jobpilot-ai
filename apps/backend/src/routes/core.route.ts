import { aiGenerationRequestSchema, candidateProfileSchema, jobInputSchema } from "@jobpilot/shared";
import createHttpError from "http-errors";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";

import { requireAuth } from "../auth/require-auth.js";
import { CoverLetterGenerationService } from "../ai/generation-service.js";
import { repositories, type Repositories } from "../db/index.js";

const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional()
});

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  jobId: z.string().trim().uuid().optional()
});

type GenerationServiceLike = Pick<CoverLetterGenerationService, "generate">;

type CoreRouterDeps = {
  repositories: Repositories;
  generationService: GenerationServiceLike;
};

function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void>
): (request: Request, response: Response, next: NextFunction) => void {
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}

function normalizeProfileInput(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return body;
  }

  const normalized = { ...(body as Record<string, unknown>) };
  const nullableOptionalFields = [
    "phone",
    "address",
    "city",
    "state",
    "country",
    "postalCode",
    "linkedinUrl",
    "portfolioUrl"
  ] as const;

  for (const key of nullableOptionalFields) {
    if (normalized[key] === null) {
      normalized[key] = undefined;
    }
  }

  if (normalized.education === null) {
    normalized.education = [];
  }

  if (normalized.certifications === null) {
    normalized.certifications = [];
  }

  return normalized;
}

function mapProfileRow(row: {
  id: string;
  email: string;
  full_name: string;
  skills: string[];
  experience_summary: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  education: unknown;
  certifications: unknown;
  resume_storage_path: string | null;
  resume_filename: string | null;
  resume_mime_type: string | null;
  resume_uploaded_at: string | null;
  created_at: string;
  updated_at: string;
}) {
  const normalizedResumeUploadedAt = (() => {
    if (!row.resume_uploaded_at) {
      return null;
    }

    const parsed = new Date(row.resume_uploaded_at);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  })();

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    skills: row.skills,
    experienceSummary: row.experience_summary,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    country: row.country,
    postalCode: row.postal_code,
    linkedinUrl: row.linkedin_url,
    portfolioUrl: row.portfolio_url,
    education: row.education,
    certifications: row.certifications,
    resumeFilename: row.resume_filename,
    resumeMimeType: row.resume_mime_type,
    resumeUploadedAt: normalizedResumeUploadedAt,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapJobRow(row: {
  id: string;
  user_id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  employment_type: string;
  source_url: string | null;
  contact_email: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    company: row.company,
    location: row.location,
    description: row.description,
    employmentType: row.employment_type,
    sourceUrl: row.source_url,
    contactEmail: row.contact_email,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapGenerationRow(row: {
  id: string;
  job_id: string;
  user_id: string;
  tone: "formal" | "concise" | "friendly";
  prompt: string;
  output_text: string;
  provider: string;
  model: string;
  tokens_input: number | null;
  tokens_output: number | null;
  created_at: string;
}) {
  return {
    id: row.id,
    jobId: row.job_id,
    userId: row.user_id,
    tone: row.tone,
    prompt: row.prompt,
    outputText: row.output_text,
    provider: row.provider,
    model: row.model,
    tokensInput: row.tokens_input,
    tokensOutput: row.tokens_output,
    createdAt: row.created_at
  };
}

export function createCoreRouter(
  deps: CoreRouterDeps = {
    repositories,
    generationService: new CoverLetterGenerationService()
  }
): Router {
  const router = Router();

  router.use(requireAuth);

  router.get("/profile/me", asyncHandler(async (request, response) => {
    const auth = request.auth;

    if (!auth) {
      throw createHttpError(401, "Unauthorized");
    }

    const profile = await deps.repositories.profiles.findByEmail(auth.email);

    if (!profile) {
      throw createHttpError(404, "Profile not found");
    }

    response.status(200).json(mapProfileRow(profile));
  }));

  router.put("/profile/me", asyncHandler(async (request, response) => {
    const auth = request.auth;

    if (!auth) {
      throw createHttpError(401, "Unauthorized");
    }

    const input = candidateProfileSchema.parse(normalizeProfileInput(request.body));

    const profile = await deps.repositories.profiles.upsertFull({
      id: auth.sub,
      email: auth.email,
      full_name: input.fullName,
      skills: input.skills,
      experience_summary: input.experienceSummary,
      phone: input.phone ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      country: input.country ?? null,
      postal_code: input.postalCode ?? null,
      linkedin_url: input.linkedinUrl || null,
      portfolio_url: input.portfolioUrl || null,
      education: input.education,
      certifications: input.certifications
    });

    response.status(200).json(mapProfileRow(profile));
  }));

  router.post("/jobs", asyncHandler(async (request, response) => {
    const auth = request.auth;

    if (!auth) {
      throw createHttpError(401, "Unauthorized");
    }

    const input = jobInputSchema.parse(request.body);

    if (input.sourceUrl) {
      const existing = await deps.repositories.jobs.findBySourceUrl(auth.sub, input.sourceUrl);
      if (existing) {
        response.status(200).json({
          deduplicated: true,
          job: mapJobRow(existing)
        });
        return;
      }
    }

    const created = await deps.repositories.jobs.create({
      user_id: auth.sub,
      title: input.title,
      company: input.company,
      location: input.location,
      description: input.description,
      employment_type: input.employmentType,
      source_url: input.sourceUrl ?? null,
      contact_email: input.contactEmail ?? null,
      metadata: {
        ingestedBy: "extension"
      }
    });

    response.status(201).json({
      deduplicated: false,
      job: mapJobRow(created)
    });
  }));

  router.get("/jobs", asyncHandler(async (request, response) => {
    const auth = request.auth;

    if (!auth) {
      throw createHttpError(401, "Unauthorized");
    }

    const { limit } = paginationQuerySchema.parse(request.query);

    const jobs = await deps.repositories.jobs.listByUserId(auth.sub, limit ?? 20);

    response.status(200).json({
      jobs: jobs.map(mapJobRow)
    });
  }));

  router.post("/generations", asyncHandler(async (request, response) => {
    const auth = request.auth;

    if (!auth) {
      throw createHttpError(401, "Unauthorized");
    }

    const input = aiGenerationRequestSchema.parse(request.body);

    await deps.repositories.profiles.upsert({
      id: auth.sub,
      email: auth.email,
      full_name: input.applicantProfile.fullName,
      skills: input.applicantProfile.skills,
      experience_summary: input.applicantProfile.experienceSummary
    });

    let job = input.job.sourceUrl
      ? await deps.repositories.jobs.findBySourceUrl(auth.sub, input.job.sourceUrl)
      : null;

    if (!job) {
      job = await deps.repositories.jobs.create({
        user_id: auth.sub,
        title: input.job.title,
        company: input.job.company,
        location: input.job.location,
        description: input.job.description,
        employment_type: input.job.employmentType,
        source_url: input.job.sourceUrl ?? null,
        contact_email: input.job.contactEmail ?? null,
        metadata: {
          generatedBy: "ai-service"
        }
      });
    }

    const generated = await deps.generationService.generate(input);

    const stored = await deps.repositories.generations.create({
      job_id: job.id,
      user_id: auth.sub,
      tone: input.tone,
      prompt: "cover-letter-prompt",
      output_text: generated.content.coverLetter,
      provider: generated.metadata.provider,
      model: generated.metadata.model,
      tokens_input: generated.metadata.inputTokens,
      tokens_output: generated.metadata.outputTokens
    });

    response.status(201).json({
      generation: mapGenerationRow(stored),
      output: generated.content,
      metadata: generated.metadata
    });
  }));

  router.get("/generations/history", asyncHandler(async (request, response) => {
    const auth = request.auth;

    if (!auth) {
      throw createHttpError(401, "Unauthorized");
    }

    const query = historyQuerySchema.parse(request.query);

    const rows = query.jobId
      ? await deps.repositories.generations.listByJobAndUserId(query.jobId, auth.sub, query.limit ?? 20)
      : await deps.repositories.generations.listByUserId(auth.sub, query.limit ?? 20);

    response.status(200).json({
      generations: rows.map(mapGenerationRow)
    });
  }));

  return router;
}
