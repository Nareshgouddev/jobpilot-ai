/**
 * Analytics event tracking
 * Supports multiple providers: Sentry, Heap, Amplitude, Posthog, etc.
 */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
  timestamp?: Date;
}

type AnalyticsProvider = "sentry" | "heap" | "amplitude" | "posthog";

class Analytics {
  private providers: AnalyticsProvider[] = [];

  constructor() {
    // Auto-detect providers from window
    this.detectProviders();
  }

  /**
   * Initialize analytics providers based on environment
   */
  initialize(enabledProviders: AnalyticsProvider[] = ["sentry"]): void {
    this.providers = enabledProviders;
    console.debug("[Analytics] Initialized with providers:", this.providers);
  }

  /**
   * Auto-detect providers that are loaded
   */
  private detectProviders(): void {
    if (typeof window !== "undefined") {
      // Sentry is always available if installed
      this.providers.push("sentry");

      // Check for other providers
      if ((window as any).heap) this.providers.push("heap");
      if ((window as any).amplitude) this.providers.push("amplitude");
      if ((window as any).posthog) this.providers.push("posthog");
    }
  }

  /**
   * Track an event
   */
  track(event: AnalyticsEvent): void {
    const { name, properties = {} } = event;

    for (const provider of this.providers) {
      this.sendToProvider(provider, name, properties);
    }

    // Log in development
    if (import.meta.env.DEV) {
      console.debug("[Analytics]", name, properties);
    }
  }

  /**
   * Send event to specific provider
   */
  private sendToProvider(
    provider: AnalyticsProvider,
    eventName: string,
    properties: Record<string, string | number | boolean>
  ): void {
    try {
      switch (provider) {
        case "sentry": {
          // Use Sentry's captureMessage to track events
          import("./sentry").then(({ captureMessage }) => {
            captureMessage(`Event: ${eventName}`, properties);
          });
          break;
        }
        case "heap": {
          const heel = (window as any).heap;
          if (heel?.track) {
            heel.track(eventName, properties);
          }
          break;
        }
        case "amplitude": {
          const amplitude = (window as any).amplitude;
          if (amplitude?.track) {
            amplitude.track(eventName, properties);
          }
          break;
        }
        case "posthog": {
          const posthog = (window as any).posthog;
          if (posthog?.capture) {
            posthog.capture(eventName, properties);
          }
          break;
        }
      }
    } catch (error) {
      console.error(`[Analytics] Failed to send event to ${provider}:`, error);
    }
  }

  /**
   * Set user properties for all providers
   */
  setUserProperties(userId: string, properties: Record<string, string | number | boolean>): void {
    for (const provider of this.providers) {
      try {
        switch (provider) {
          case "sentry": {
            import("./sentry").then(({ Sentry }) => {
              Sentry.setUser({ id: userId, ...properties });
            });
            break;
          }
          case "heap": {
            const heap = (window as any).heap;
            if (heap?.identify) {
              heap.identify(userId);
              heap.addUserProperties(properties);
            }
            break;
          }
          case "amplitude": {
            const amplitude = (window as any).amplitude;
            if (amplitude?.setUserId && amplitude.setUserProperties) {
              amplitude.setUserId(userId);
              amplitude.setUserProperties(properties);
            }
            break;
          }
          case "posthog": {
            const posthog = (window as any).posthog;
            if (posthog?.identify) {
              posthog.identify(userId, properties);
            }
            break;
          }
        }
      } catch (error) {
        console.error(`[Analytics] Failed to set user properties on ${provider}:`, error);
      }
    }
  }

  /**
   * Clear user properties
   */
  clearUser(): void {
    for (const provider of this.providers) {
      try {
        switch (provider) {
          case "sentry": {
            import("./sentry").then(({ Sentry }) => {
              Sentry.setUser(null);
            });
            break;
          }
          case "heap": {
            const heap = (window as any).heap;
            if (heap?.resetIdentity) {
              heap.resetIdentity();
            }
            break;
          }
          case "amplitude": {
            const amplitude = (window as any).amplitude;
            if (amplitude?.setUserId) {
              amplitude.setUserId(null);
            }
            break;
          }
          case "posthog": {
            const posthog = (window as any).posthog;
            if (posthog?.reset) {
              posthog.reset();
            }
            break;
          }
        }
      } catch (error) {
        console.error(`[Analytics] Failed to clear user on ${provider}:`, error);
      }
    }
  }
}

export const analytics = new Analytics();

// Export common event names for consistency
export const events = {
  // Generation events
  GENERATION_STARTED: "generation_started",
  GENERATION_COMPLETED: "generation_completed",
  GENERATION_FAILED: "generation_failed",
  GENERATION_TONE_CHANGED: "generation_tone_changed",

  // Resume events
  RESUME_UPLOADED: "resume_uploaded",
  RESUME_DELETED: "resume_deleted",
  RESUME_DOWNLOAD_REQUESTED: "resume_download_requested",

  // Profile events
  PROFILE_UPDATED: "profile_updated",
  PROFILE_VIEWED: "profile_viewed",

  // ATS events
  ATS_SCORE_COMPUTED: "ats_score_computed",
  ATS_SCORE_VIEWED: "ats_score_viewed",
  ATS_HISTORY_VIEWED: "ats_history_viewed",

  // Application events
  APPLICATION_CREATED: "application_created",
  APPLICATION_STATUS_UPDATED: "application_status_updated",
  APPLICATION_NOTES_UPDATED: "application_notes_updated",
  APPLICATION_DELETED: "application_deleted",
  APPLICATION_LIST_VIEWED: "application_list_viewed",

  // UI events
  FEATURE_FLAG_TOGGLED: "feature_flag_toggled",
  TAB_CHANGED: "tab_changed",
  STEP_STARTED: "step_started",
  STEP_COMPLETED: "step_completed",

  // Auth events
  LOGIN_ATTEMPTED: "login_attempted",
  LOGIN_SUCCESSFUL: "login_successful",
  LOGOUT: "logout",

  // Engagement
  FEATURE_DISCOVERED: "feature_discovered",
  HELP_REQUESTED: "help_requested",
  ERROR_ENCOUNTERED: "error_encountered"
} as const;
