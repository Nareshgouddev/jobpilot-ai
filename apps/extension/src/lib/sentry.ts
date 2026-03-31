import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Called early in the extension lifecycle
 */
export function initializeSentry(): void {
  // Only initialize in production; use environment variable to control
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  const environment = import.meta.env.MODE || "development";

  if (!sentryDsn) {
    console.debug("[Sentry] No DSN provided, monitoring disabled");
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment,
      tracesSampleRate: environment === "production" ? 0.1 : 1.0, // 10% in prod, 100% in dev
      denyUrls: [
        // Ignore errors from browser extensions like ad blockers
        /extensions\//i,
        /^chrome:\/\//i
      ],
      // Ignore specific error messages that are not actionable
      ignoreErrors: [
        // Random plugins/extensions
        "top.GLOBALS",
        // See: http://blog.errorception.com/2012/03/tale-of-unfindable-js-error.html
        "originalCreateNotification",
        "canvas.contentDocument",
        "MyApp_RemoveAllHighlights",
        // Network errors are often environment-specific and not actionable
        "NetworkError",
        "Network request failed",
        // Browser extension noise from third-party scripts
        "mgt.clearMarks is not a function"
      ],
      beforeSend(event, _hint) {
        // Filter out errors that shouldn't be reported
        if (event.exception) {
          const error = event.exception.values?.[0]?.value || "";
          // Don't report extension-specific errors
          if (error.includes("Extension context invalidated")) {
            return null;
          }
          if (error.includes("mgt.clearMarks is not a function")) {
            return null;
          }
        }
        return event;
      }
    });

    console.debug(`[Sentry] Initialized with environment: ${environment}`);
  } catch (error) {
    console.error("[Sentry] Failed to initialize:", error);
  }
}

/**
 * Capture a message with context
 */
export function captureMessage(message: string, context?: Record<string, unknown>): void {
  if (context) {
    Sentry.captureMessage(message, {
      contexts: { custom: context }
    });
  } else {
    Sentry.captureMessage(message);
  }
}

/**
 * Capture an exception and extra context
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, { value });
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

export { Sentry };
