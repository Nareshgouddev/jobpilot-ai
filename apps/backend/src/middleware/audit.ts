import { type Request } from "express";
import { logger } from "../config/logger.js";

export enum SecurityEventType {
  AUTH_ATTEMPT = "AUTH_ATTEMPT",
  AUTH_FAILURE = "AUTH_FAILURE",
  AUTH_SUCCESS = "AUTH_SUCCESS",
  INVALID_TOKEN = "INVALID_TOKEN",
  EXPIRED_TOKEN = "EXPIRED_TOKEN",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  CORS_REJECTED = "CORS_REJECTED",
  UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  SUSPICIOUS_PAYLOAD = "SUSPICIOUS_PAYLOAD",
  TOKEN_BRUTE_FORCE = "TOKEN_BRUTE_FORCE"
}

export interface SecurityAuditEvent {
  type: SecurityEventType;
  timestamp: string;
  ipAddress: string;
  userId?: string;
  endpoint: string;
  method: string;
  reason?: string;
  details?: Record<string, unknown>;
}

export function extractClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp =
    typeof forwarded === "string"
      ? forwarded.split(",")[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]?.trim()
        : undefined;

  return (
    forwardedIp ||
    req.headers["x-client-ip"]?.toString() ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

export function logSecurityEvent(event: SecurityAuditEvent): void {
  const logLevel =
    event.type === SecurityEventType.AUTH_SUCCESS
      ? "info"
      : ["AUTH_FAILURE", "RATE_LIMIT_EXCEEDED", "CORS_REJECTED", "TOKEN_BRUTE_FORCE"].includes(
          event.type
        )
        ? "warn"
        : "error";

  logger[logLevel as "info" | "warn" | "error"](
    {
      eventType: event.type,
      ipAddress: event.ipAddress,
      userId: event.userId,
      endpoint: event.endpoint,
      method: event.method,
      reason: event.reason,
      details: event.details,
      timestamp: event.timestamp
    },
    `Security Event: ${event.type}`
  );
}

export function createAuditLogEntry(
  type: SecurityEventType,
  req: Request,
  options?: {
    userId?: string;
    reason?: string;
    details?: Record<string, unknown>;
  }
): SecurityAuditEvent {
  const baseEntry: SecurityAuditEvent = {
    type,
    timestamp: new Date().toISOString(),
    ipAddress: extractClientIp(req),
    endpoint: req.path,
    method: req.method
  };

  if (options?.userId) {
    baseEntry.userId = options.userId;
  }

  if (options?.reason) {
    baseEntry.reason = options.reason;
  }

  if (options?.details) {
    baseEntry.details = options.details;
  }

  return baseEntry;
}

export function createSecurityAuditMiddleware() {
  return (req: Request, _res: any, next: any) => {
    // Attach audit logging functions to request
    req.audit = {
      log: (type: SecurityEventType, options?: { userId?: string; reason?: string; details?: Record<string, unknown> }) => {
        const entry = createAuditLogEntry(type, req, options);
        logSecurityEvent(entry);
      }
    };
    next();
  };
}

// Detect potential brute force attacks
export function detectBruteForceBehavior(
  failureCount: number,
  timeWindowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean {
  // More than 5 failures in 15 minutes suggests brute force
  return failureCount > 5;
}

// Payload size validation to prevent buffer overflow attacks
export function validatePayloadSize(
  payload: unknown,
  maxSizeKb: number = 1
): { valid: boolean; reason?: string } {
  try {
    const sizeKb = Buffer.byteLength(JSON.stringify(payload)) / 1024;
    if (sizeKb > maxSizeKb) {
      return { valid: false, reason: `Payload exceeds ${maxSizeKb}KB limit` };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: "Unable to validate payload size" };
  }
}

// SQL injection-like pattern detection
export function detectSuspiciousPatterns(input: string): boolean {
  const suspiciousPatterns = [
    /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i,
    /<script[\s\S]*?<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\(/i
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(input));
}

declare global {
  namespace Express {
    interface Request {
      audit?: {
        log: (type: SecurityEventType, options?: {
          userId?: string;
          reason?: string;
          details?: Record<string, unknown>;
        }) => void;
      };
    }
  }
}
