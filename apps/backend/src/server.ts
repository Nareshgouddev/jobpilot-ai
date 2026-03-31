import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { initializeSentry } from "./config/sentry.js";

// Initialize Sentry first, before everything else
initializeSentry();

const app = createApp();

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, "Backend server started");
});
