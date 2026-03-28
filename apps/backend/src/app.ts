import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { authRouter } from "./routes/auth.route.js";
import { createCoreRouter } from "./routes/core.route.js";
import { healthRouter } from "./routes/health.route.js";

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
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", healthRouter);
  app.use("/api", authRouter);
  app.use("/api", createCoreRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
