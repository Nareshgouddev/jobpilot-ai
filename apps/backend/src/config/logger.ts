import pino from "pino";

import { env } from "./env.js";

export const logger = pino({
  name: "jobpilot-backend",
  level: env.LOG_LEVEL,
  redact: {
    paths: ["req.headers.authorization", "headers.authorization", "password", "token"],
    censor: "[REDACTED]"
  }
});
