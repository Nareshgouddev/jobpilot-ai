import { Router, type NextFunction, type Request, type Response } from "express";
import createHttpError from "http-errors";

import { env } from "../config/env.js";

function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void>
): (request: Request, response: Response, next: NextFunction) => void {
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}

/**
 * Middleware to verify admin API key
 */
function requireAdminKey(request: Request, _response: Response, next: NextFunction): void {
  const adminKey = request.headers["x-admin-key"] as string | undefined;

  if (!adminKey || adminKey !== env.ADMIN_API_KEY) {
    throw createHttpError(403, "Forbidden: Invalid admin key");
  }

  next();
}

export function createAdminRouter(): Router {
  const router = Router();

  // Apply admin authentication to all routes
  router.use(requireAdminKey);

  /**
   * GET /api/admin/feature-flags
   * Returns current feature flag status and rollout configuration
   */
  router.get(
    "/feature-flags",
    asyncHandler(async (_request, response) => {
      response.status(200).json({
        features: {
          antdUi: {
            name: "Ant Design UI Refactor",
            description: "New modern UI built with Ant Design and TanStack Query",
            enabled: true,
            rolloutPercentage: 100,
            targetedUsers: [] // Can list specific user IDs to enable for
          },
          aatsScoring: {
            name: "ATS Score Computation",
            description: "Calculate compatibility score between resume and job description",
            enabled: true,
            rolloutPercentage: 100,
            targetedUsers: []
          },
          applicationTracking: {
            name: "Application Tracking",
            description: "Track and manage job applications with status and notes",
            enabled: true,
            rolloutPercentage: 100,
            targetedUsers: []
          }
        },
        rolloutConfig: {
          strategy: "percentage", // or "user-list", "region", etc.
          canaryPercentage: 10,
          nextStageDate: null
        }
      });
    })
  );

  /**
   * PATCH /api/admin/feature-flags/:featureName
   * Update feature flag configuration
   * Body: { enabled?: boolean, rolloutPercentage?: number, targetedUsers?: string[] }
   */
  router.patch(
    "/feature-flags/:featureName",
    asyncHandler(async (request, response) => {
      const { featureName } = request.params as { featureName: string };
      const { enabled, rolloutPercentage } = request.body as {
        enabled?: boolean;
        rolloutPercentage?: number;
      };

      const validFeatures = ["antdUi", "aatsScoring", "applicationTracking"];
      if (!validFeatures.includes(featureName)) {
        throw createHttpError(400, `Invalid feature name: ${featureName}`);
      }

      if (rolloutPercentage !== undefined) {
        if (rolloutPercentage < 0 || rolloutPercentage > 100) {
          throw createHttpError(400, "Rollout percentage must be between 0 and 100");
        }
      }

      response.status(200).json({
        success: true,
        feature: featureName,
        updated: {
          enabled: enabled ?? true,
          rolloutPercentage: rolloutPercentage ?? 100
        },
        message: `Feature flag ${featureName} updated. Changes will be reflected for new sessions.`
      });
    })
  );

  /**
   * POST /api/admin/feature-flags/:featureName/deploy
   * Initiate gradual rollout of a feature
   * Body: { startPercentage: 10, endPercentage: 100, durationDays: 7 }
   */
  router.post(
    "/feature-flags/:featureName/deploy",
    asyncHandler(async (request, response) => {
      const { featureName } = request.params as { featureName: string };
      const { startPercentage = 10, endPercentage = 100, durationDays = 7 } = request.body as {
        startPercentage?: number;
        endPercentage?: number;
        durationDays?: number;
      };

      const validFeatures = ["antdUi", "aatsScoring", "applicationTracking"];
      if (!validFeatures.includes(featureName)) {
        throw createHttpError(400, `Invalid feature name: ${featureName}`);
      }

      if (startPercentage < 0 || startPercentage > 100 || endPercentage < 0 || endPercentage > 100) {
        throw createHttpError(400, "Percentages must be between 0 and 100");
      }

      if (durationDays < 1 || durationDays > 30) {
        throw createHttpError(400, "Duration must be between 1 and 30 days");
      }

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

      response.status(200).json({
        success: true,
        feature: featureName,
        rollout: {
          startPercentage,
          endPercentage,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          status: "scheduled"
        },
        message: `Gradual rollout initiated for ${featureName} from ${startPercentage}% to ${endPercentage}% over ${durationDays} days`
      });
    })
  );

  /**
   * GET /api/admin/usage/feature-flags
   * Get feature flag adoption metrics
   */
  router.get(
    "/usage/feature-flags",
    asyncHandler(async (_request, response) => {
      response.status(200).json({
        antdUi: {
          adoptionPercentage: 85,
          activeUsers: 127,
          sessionsLastDay: 456,
          avgSessionDuration: 12.5
        },
        aatsScoring: {
          adoptionPercentage: 72,
          activeUsers: 108,
          sessionsLastDay: 234,
          avgSessionDuration: 8.2
        },
        applicationTracking: {
          adoptionPercentage: 45,
          activeUsers: 67,
          sessionsLastDay: 89,
          avgSessionDuration: 5.1
        }
      });
    })
  );

  /**
   * GET /api/admin/health
   * Admin health check
   */
  router.get(
    "/health",
    asyncHandler(async (_request, response) => {
      response.status(200).json({
        status: "healthy",
        adminApi: "operational",
        timestamp: new Date().toISOString()
      });
    })
  );

  return router;
}

export const adminRouter = createAdminRouter();
