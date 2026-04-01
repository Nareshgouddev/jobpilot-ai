import { atsScoreRequestSchema, atsScoreSchema } from "@jobpilot/shared";
import createHttpError from "http-errors";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";

import { requireAuth } from "../auth/require-auth.js";
import { logger } from "../config/logger.js";
import { DataAccessError } from "../db/errors.js";
import { repositories, type Repositories } from "../db/index.js";
import { AtsService } from "../ai/ats-service.js";

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional()
});

type AtsServiceLike = Pick<AtsService, "computeScoreAsync">;

type AtsRouterDeps = {
  repositories: Repositories;
  atsService: AtsServiceLike;
};

function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void>
): (request: Request, response: Response, next: NextFunction) => void {
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}

function mapAtsScoreRow(row: {
  id: string;
  user_id: string;
  job_id: string;
  profile_snapshot: unknown;
  overall_score: number;
  required_skills_score: number;
  preferred_skills_score: number;
  soft_skills_score: number;
  domain_terms_score: number;
  matched_required_skills: string[];
  unmatched_required_skills: string[];
  matched_preferred_skills: string[];
  unmatched_preferred_skills: string[];
  matched_soft_skills: string[];
  matched_domain_terms: string[];
  computed_at: string;
}) {
  return {
    id: row.id,
    userId: row.user_id,
    jobId: row.job_id,
    profileSnapshot: row.profile_snapshot,
    overallScore: row.overall_score,
    requiredSkillsScore: row.required_skills_score,
    preferredSkillsScore: row.preferred_skills_score,
    softSkillsScore: row.soft_skills_score,
    domainTermsScore: row.domain_terms_score,
    matchedRequiredSkills: row.matched_required_skills,
    unmatchedRequiredSkills: row.unmatched_required_skills,
    matchedPreferredSkills: row.matched_preferred_skills,
    unmatchedPreferredSkills: row.unmatched_preferred_skills,
    matchedSoftSkills: row.matched_soft_skills,
    matchedDomainTerms: row.matched_domain_terms,
    analyzedAt: row.computed_at
  };
}

export function createAtsRouter(
  deps: AtsRouterDeps = {
    repositories,
    atsService: new AtsService()
  }
): Router {
  const router = Router();

  router.use(requireAuth);

  // POST /api/ats/score - Compute ATS score for a job description
  router.post(
    "/score",
    asyncHandler(async (request, response) => {
      const auth = request.auth;

      if (!auth) {
        throw createHttpError(401, "Unauthorized");
      }

      const input = atsScoreRequestSchema.parse(request.body);

      const profile = await deps.repositories.profiles.findById(auth.sub);

      if (!profile) {
        throw createHttpError(404, "Profile not found");
      }

      const candidateProfile = {
        fullName: profile.full_name,
        skills: profile.skills,
        experienceSummary: profile.experience_summary,
        certifications: (profile.certifications as string[]) ?? [],
        education: profile.education as Array<{
          institution: string;
          degree: string;
          fieldOfStudy?: string;
          startYear?: string;
          endYear?: string;
          gpa?: string;
        }>,
        resumeText: profile.resume_text ?? ""
      };

      const score = await deps.atsService.computeScoreAsync(candidateProfile, input.jobDescription);

      // If job info provided, find or create job record and persist score
      if (input.jobTitle) {
        try {
          const jobSourceUrl = `ats:${input.jobTitle}:${input.company ?? "unknown"}`;
          let job = await deps.repositories.jobs.findBySourceUrl(auth.sub, jobSourceUrl);

          if (!job) {
            job = await deps.repositories.jobs.create({
              user_id: auth.sub,
              title: input.jobTitle,
              company: input.company ?? "Unknown",
              location: "Unknown",
              description: input.jobDescription,
              employment_type: "other",
              source_url: jobSourceUrl,
              metadata: { source: "ats-scoring" }
            });
          }

          await deps.repositories.atsScores.create({
            user_id: auth.sub,
            job_id: job.id,
            profile_snapshot: candidateProfile as unknown as import("../db/types.js").Json,
            overall_score: score.overallScore,
            required_skills_score: score.requiredSkillsScore,
            preferred_skills_score: score.preferredSkillsScore,
            soft_skills_score: score.softSkillsScore,
            domain_terms_score: score.domainTermsScore,
            matched_required_skills: score.matchedRequiredSkills,
            unmatched_required_skills: score.unmatchedRequiredSkills,
            matched_preferred_skills: score.matchedPreferredSkills,
            unmatched_preferred_skills: score.unmatchedPreferredSkills,
            matched_soft_skills: score.matchedSoftSkills,
            matched_domain_terms: score.matchedDomainTerms
          });
        } catch (error) {
          if (error instanceof DataAccessError) {
            logger.warn(
              {
                userId: auth.sub,
                email: auth.email,
                err: error
              },
              "ATS score computed but failed to persist"
            );
          } else {
            throw error;
          }
        }
      }

      response.status(200).json(score);
    })
  );

  // GET /api/ats/history - Get past ATS scores for the authenticated user
  router.get(
    "/history",
    asyncHandler(async (request, response) => {
      const auth = request.auth;

      if (!auth) {
        throw createHttpError(401, "Unauthorized");
      }

      const query = historyQuerySchema.parse(request.query);

      const rows = await deps.repositories.atsScores.listByUserId(auth.sub, query.limit ?? 20);

      response.status(200).json({
        scores: rows.map(mapAtsScoreRow)
      });
    })
  );

  return router;
}
