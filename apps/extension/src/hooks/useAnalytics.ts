import { useCallback, useDebugValue } from "react";
import { analytics, events, type AnalyticsEvent } from "../lib/analytics";

/**
 * Hook to track analytics events
 */
export function useAnalytics() {
  const track = useCallback((event: AnalyticsEvent) => {
    analytics.track(event);
  }, []);

  const trackGeneration = useCallback(
    (status: "started" | "completed" | "failed", durationMs?: number, model?: string) => {
      const eventName =
        status === "started"
          ? events.GENERATION_STARTED
          : status === "completed"
            ? events.GENERATION_COMPLETED
            : events.GENERATION_FAILED;

      track({
        name: eventName,
        properties: {
          ...(durationMs && { durationMs }),
          ...(model && { model })
        }
      });
    },
    [track]
  );

  const trackResumeUpload = useCallback(
    (fileSizeKb: number, fileType: string, success: boolean) => {
      track({
        name: success ? events.RESUME_UPLOADED : events.GENERATION_FAILED,
        properties: {
          fileSizeKb,
          fileType,
          success
        }
      });
    },
    [track]
  );

  const trackApplicationCreated = useCallback(
    (jobId: string, initialStatus?: string) => {
      track({
        name: events.APPLICATION_CREATED,
        properties: {
          jobId,
          ...(initialStatus && { initialStatus })
        }
      });
    },
    [track]
  );

  const trackApplicationStatusUpdated = useCallback(
    (applicationId: string, newStatus: string, previousStatus?: string) => {
      track({
        name: events.APPLICATION_STATUS_UPDATED,
        properties: {
          applicationId,
          newStatus,
          ...(previousStatus && { previousStatus })
        }
      });
    },
    [track]
  );

  const trackFeatureFlagToggled = useCallback(
    (featureName: string, enabled: boolean) => {
      track({
        name: events.FEATURE_FLAG_TOGGLED,
        properties: {
          featureName,
          enabled
        }
      });
    },
    [track]
  );

  const trackTabChanged = useCallback(
    (tabName: string, previousTab?: string) => {
      track({
        name: events.TAB_CHANGED,
        properties: {
          tabName,
          ...(previousTab && { previousTab })
        }
      });
    },
    [track]
  );

  const trackStepCompleted = useCallback(
    (stepName: string, stepNumber: number, totalSteps: number, durationSeconds?: number) => {
      track({
        name: events.STEP_COMPLETED,
        properties: {
          stepName,
          stepNumber,
          totalSteps,
          ...(durationSeconds && { durationSeconds })
        }
      });
    },
    [track]
  );

  const trackError = useCallback(
    (errorMessage: string, context?: string, severity?: "low" | "medium" | "high") => {
      track({
        name: events.ERROR_ENCOUNTERED,
        properties: {
          errorMessage,
          ...(context && { context }),
          ...(severity && { severity })
        }
      });
    },
    [track]
  );

  useDebugValue("analytics");

  return {
    track,
    trackGeneration,
    trackResumeUpload,
    trackApplicationCreated,
    trackApplicationStatusUpdated,
    trackFeatureFlagToggled,
    trackTabChanged,
    trackStepCompleted,
    trackError
  };
}

/**
 * Hook to track profile/user context
 */
export function useAnalyticsUser(userId?: string, userProperties?: Record<string, string | number | boolean>) {
  useCallback(() => {
    if (userId && userProperties) {
      analytics.setUserProperties(userId, userProperties);
    }
  }, [userId, userProperties]);

  useDebugValue(userId ? `user:${userId}` : "anonymous");
}

/**
 * Hook to measure performance of async operations
 */
export function useAnalyticsPerformance(operationName: string) {
  const { track } = useAnalytics();

  const trackOperation = useCallback(
    (success: boolean, durationMs: number, error?: string) => {
      track({
        name: success ? `${operationName}_success` : `${operationName}_failed`,
        properties: {
          durationMs,
          ...(error && { error })
        }
      });
    },
    [operationName, track]
  );

  return {
    trackOperation,
    measureAsync: async <T,>(fn: () => Promise<T>): Promise<T> => {
      const start = performance.now();
      try {
        const result = await fn();
        const duration = performance.now() - start;
        trackOperation(true, Math.round(duration));
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        trackOperation(false, Math.round(duration), (error as Error)?.message);
        throw error;
      }
    }
  };
}

/**
 * Hook to track page view / tab activation
 */
export function useAnalyticsPageView(pageName: string) {
  useCallback(() => {
    analytics.track({
      name: `page_viewed_${pageName}`,
      properties: { pageName }
    });
  }, [pageName]);
}
