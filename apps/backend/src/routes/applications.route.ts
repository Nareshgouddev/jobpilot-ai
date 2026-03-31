import { applicationSchema, applicationStatusSchema } from "@jobpilot/shared";
import createHttpError from "http-errors";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";

import { requireAuth } from "../auth/require-auth.js";
import { repositories, type Repositories } from "../db/index.js";

const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional()
});

const createApplicationSchema = z.object({
  jobId: z.string().uuid(),
  status: applicationStatusSchema.optional(),
  notes: z.string().max(1000).optional()
});

const updateApplicationSchema = z.object({
  status: applicationStatusSchema.optional(),
  notes: z.string().max(1000).optional()
});

function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void>
): (request: Request, response: Response, next: NextFunction) => void {
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}

function mapApplicationRow(row: {
  id: string;
  user_id: string;
  job_id: string;
  status: string;
  applied_at: string;
  updated_at: string;
  notes: string | null;
  job?: { id: string; title: string; company: string; location: string } | null;
}) {
  return {
    id: row.id,
    userId: row.user_id,
    jobId: row.job_id,
    status: row.status,
    appliedAt: row.applied_at,
    updatedAt: row.updated_at,
    notes: row.notes,
    job: row.job ?? null
  };
}

type ApplicationsRouterDeps = {
  repositories: Repositories;
};

export function createApplicationsRouter(
  deps: ApplicationsRouterDeps = { repositories }
): Router {
  const router = Router();

  router.use(requireAuth);

  // POST /api/applications - Create a new application record
  router.post(
    "/",
    asyncHandler(async (request, response) => {
      const auth = request.auth;

      if (!auth) {
        throw createHttpError(401, "Unauthorized");
      }

      const input = createApplicationSchema.parse(request.body);

      // Check if application already exists for this user-job pair
      const existing = await deps.repositories.applications.findByUserAndJob(auth.sub, input.jobId);
      if (existing) {
        throw createHttpError(409, "Application already exists for this job");
      }

      const created = await deps.repositories.applications.create({
        user_id: auth.sub,
        job_id: input.jobId,
        status: input.status ?? "not_applied",
        notes: input.notes ?? null
      });

      response.status(201).json(mapApplicationRow(created));
    })
  );

  // GET /api/applications - List user's applications with job details
  router.get(
    "/",
    asyncHandler(async (request, response) => {
      const auth = request.auth;

      if (!auth) {
        throw createHttpError(401, "Unauthorized");
      }

      const query = paginationQuerySchema.parse(request.query);

      const applications = await deps.repositories.applications.getEnrichedList(
        auth.sub,
        query.limit ?? 20
      );

      // Fetch ATS scores for all applications
      const jobIds = applications.map((a) => a.job_id);
      const atsScoreMap = await deps.repositories.atsScores.getLatestForJobs(auth.sub, jobIds);

      const enriched = applications.map((app) => {
        const score = atsScoreMap.get(app.job_id);
        return {
          ...mapApplicationRow(app),
          atsScore: score ? { overallScore: score.overall_score } : null
        };
      });

      response.status(200).json({
        applications: enriched,
        total: enriched.length
      });
    })
  );

  // GET /api/applications/:id - Get a single application by ID
  router.get(
    "/:id",
    asyncHandler(async (request, response) => {
      const auth = request.auth;

      if (!auth) {
        throw createHttpError(401, "Unauthorized");
      }

      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

      const result = await deps.repositories.applications.getWithAtsScore(auth.sub, id);

      if (!result) {
        throw createHttpError(404, "Application not found");
      }

      response.status(200).json({
        ...mapApplicationRow(result.application),
        atsScore: result.atsScore
          ? { overallScore: result.atsScore.overall_score }
          : null
      });
    })
  );

  // PATCH /api/applications/:id - Update application status or notes
  router.patch(
    "/:id",
    asyncHandler(async (request, response) => {
      const auth = request.auth;

      if (!auth) {
        throw createHttpError(401, "Unauthorized");
      }

      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const update = updateApplicationSchema.parse(request.body);

      if (!update.status && !update.notes) {
        throw createHttpError(400, "No update fields provided");
      }

      // Verify the application exists and belongs to the user
      const existing = await deps.repositories.applications.getById(auth.sub, id);
      if (!existing) {
        throw createHttpError(404, "Application not found");
      }

      let updated;
      if (update.status) {
        updated = await deps.repositories.applications.updateStatus(id, auth.sub, update.status);
      } else if (update.notes !== undefined) {
        updated = await deps.repositories.applications.updateNotes(id, auth.sub, update.notes);
      } else {
        throw createHttpError(400, "No valid update fields provided");
      }

      response.status(200).json(mapApplicationRow(updated));
    })
  );

  // DELETE /api/applications/:id - Remove an application record
  router.delete(
    "/:id",
    asyncHandler(async (request, response) => {
      const auth = request.auth;

      if (!auth) {
        throw createHttpError(401, "Unauthorized");
      }

      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

      // Verify the application exists and belongs to the user
      const allUserApps = await deps.repositories.applications.listByUserId(auth.sub, 1000);
      const found = allUserApps.find((a) => a.id === id);
      if (!found) {
        throw createHttpError(404, "Application not found");
      }

      await deps.repositories.applications.delete(id, auth.sub);

      response.status(204).send();
    })
  );

  return router;
}
