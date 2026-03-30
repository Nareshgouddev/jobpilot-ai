import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { createAuthRateLimiter, createGeneralRateLimiter } from "./middleware/rate-limiter.js";
import { createCorsPolicy, corsOptionsByCaller } from "./middleware/cors-policy.js";
import { createCspMiddleware, MODERATE_CSP_DIRECTIVES } from "./middleware/csp.js";
import { createSecurityAuditMiddleware } from "./middleware/audit.js";
import { authRouter } from "./routes/auth.route.js";
import { createCoreRouter } from "./routes/core.route.js";
import { healthRouter } from "./routes/health.route.js";
import { createResumeRouter } from "./routes/resume.route.js";

export function createApp(): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      customProps(req) {
        return {
          requestId: req.headers["x-request-id"]
        };
      }
    })
  );

  // Apply CORS policy
  const corsPolicy = createCorsPolicy();
  app.use(cors(corsOptionsByCaller(corsPolicy)));

  // Apply CSP middleware
  app.use(createCspMiddleware(MODERATE_CSP_DIRECTIVES));

  // Apply security audit logging
  app.use(createSecurityAuditMiddleware());

  // General rate limiter for all requests
  app.use(createGeneralRateLimiter());

  app.use(express.json({ limit: "1mb" }));

  app.use("/api", healthRouter);

  // Apply stricter rate limiter to auth endpoints
  app.use("/api/auth", createAuthRateLimiter());
  app.use("/api", authRouter);

  app.use("/api", createCoreRouter());
  app.use("/api/profile", createResumeRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
