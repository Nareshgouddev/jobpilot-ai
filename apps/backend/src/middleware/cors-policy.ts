import { type CorsOptions } from "cors";
import { env } from "../config/env.js";

export interface CorsPolicy {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

const DEFAULT_ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

const DEFAULT_ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "X-Request-ID"
];

const DEFAULT_EXPOSED_HEADERS = [
  "X-RateLimit-Limit",
  "X-RateLimit-Remaining",
  "X-RateLimit-Reset",
  "X-Request-ID"
];

export function createCorsPolicy(customOrigins?: string[]): CorsPolicy {
  // Parse CORS_ORIGIN from env (can be comma-separated or wildcard)
  const envOrigins = env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",").map((o) => o.trim()) : [];

  // Merge with custom origins, use environment first
  const allowedOrigins = [...new Set([...envOrigins, ...(customOrigins || [])])];

  return {
    allowedOrigins,
    allowedMethods: DEFAULT_ALLOWED_METHODS,
    allowedHeaders: DEFAULT_ALLOWED_HEADERS,
    exposedHeaders: DEFAULT_EXPOSED_HEADERS,
    credentials: true,
    maxAge: 86400 // 24 hours
  };
}

export function corsOptionsByCaller(policy: CorsPolicy): CorsOptions {
  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in whitelist
      const isAllowed = policy.allowedOrigins.some((allowedOrigin) => {
        // Support wildcards for subdomains: e.g., https://*.example.com
        if (allowedOrigin.includes("*")) {
          const pattern = allowedOrigin
            .replace(/\./g, "\\.")
            .replace(/\*/g, ".*");
          return new RegExp(`^${pattern}$`).test(origin);
        }
        return allowedOrigin === origin;
      });

      if (!isAllowed) {
        return callback(new Error("Not allowed by CORS"));
      }

      callback(null, true);
    },
    methods: policy.allowedMethods,
    allowedHeaders: policy.allowedHeaders,
    exposedHeaders: policy.exposedHeaders,
    credentials: policy.credentials,
    maxAge: policy.maxAge,
    optionsSuccessStatus: 200 // For legacy browser support
  };
}

export function validateOrigin(origin: string, policy: CorsPolicy): boolean {
  return policy.allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin.includes("*")) {
      const pattern = allowedOrigin
        .replace(/\./g, "\\.")
        .replace(/\*/g, ".*");
      return new RegExp(`^${pattern}$`).test(origin);
    }
    return allowedOrigin === origin;
  });
}
