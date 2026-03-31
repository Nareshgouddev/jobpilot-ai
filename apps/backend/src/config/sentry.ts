import { createRequire } from "node:module";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { env } from "./env.js";

type SentryEvent = { transaction?: string };

type SentryLike = {
  init: (config: {
    dsn: string;
    environment: string;
    integrations?: unknown[];
    tracesSampleRate?: number;
    ignoreTransactions?: string[];
    beforeSend?: (event: SentryEvent, hint: unknown) => SentryEvent | null;
  }) => void;
  captureMessage: (message: string, level?: string) => void;
  Integrations?: {
    OnUncaughtExceptionIntegration?: new () => unknown;
    OnUnhandledRejectionIntegration?: new () => unknown;
    Http?: new (opts?: { tracing?: boolean }) => unknown;
    Express?: new (opts?: { request?: boolean; serverName?: boolean }) => unknown;
  };
  Handlers?: {
    requestHandler: () => RequestHandler;
    errorHandler: () => ErrorRequestHandler;
  };
};

const require = createRequire(import.meta.url);

function loadSentry(): SentryLike | null {
  try {
    return require("@sentry/node") as SentryLike;
  } catch {
    return null;
  }
}

const sentry = loadSentry();
let sentryEnabled = false;

const noOpRequestHandler: RequestHandler = (_request, _response, next) => {
  next();
};

const noOpErrorHandler: ErrorRequestHandler = (_error, _request, _response, next) => {
  next(_error);
};

/**
 * Initialize Sentry for backend error tracking and performance monitoring
 */
export function initializeSentry(): void {
  if (!sentry) {
    console.log("@sentry/node not installed, monitoring disabled");
    return;
  }

  if (!env.SENTRY_DSN) {
    console.log("Sentry DSN not provided, monitoring disabled");
    return;
  }

  try {
    sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      integrations: [
        ...(sentry.Integrations?.OnUncaughtExceptionIntegration
          ? [new sentry.Integrations.OnUncaughtExceptionIntegration()]
          : []),
        ...(sentry.Integrations?.OnUnhandledRejectionIntegration
          ? [new sentry.Integrations.OnUnhandledRejectionIntegration()]
          : []),
        ...(sentry.Integrations?.Http ? [new sentry.Integrations.Http({ tracing: true })] : []),
        ...(sentry.Integrations?.Express
          ? [
              new sentry.Integrations.Express({
                request: true,
                serverName: true
              })
            ]
          : [])
      ],
      tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
      // Ignore health check endpoints in performance tracking
      ignoreTransactions: ["/api/health"],
      beforeSend(event: SentryEvent, _hint: unknown) {
        // Filter out specific errors or transactions
        if (event.transaction === "/api/health") {
          return null;
        }
        return event;
      }
    });

    console.log(`Sentry initialized with environment: ${env.NODE_ENV}`);
    sentryEnabled = true;

    // Capture a startup event
    sentry.captureMessage("Backend server starting", "info");
  } catch (error) {
    console.error("Failed to initialize Sentry:", error);
  }
}

/**
 * Wrap Express Request Handler with Sentry tracing
 */
export function createSentryRequestHandler() {
  return sentryEnabled && sentry?.Handlers?.requestHandler
    ? sentry.Handlers.requestHandler()
    : noOpRequestHandler;
}

/**
 * Wrap Express Error Handler with Sentry
 */
export function createSentryErrorHandler() {
  return sentryEnabled && sentry?.Handlers?.errorHandler
    ? sentry.Handlers.errorHandler()
    : noOpErrorHandler;
}

export { sentry as Sentry };
