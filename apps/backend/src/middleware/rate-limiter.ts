import { type Request, type Response, type NextFunction } from "express";

export interface RateLimitConfig {
  windowMs: number; // milliseconds
  maxRequests: number; // max requests per window
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const defaultStore: RateLimitStore = {};
let limiterInstanceCounter = 0;

function defaultKeyGenerator(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false
  } = config;
  const limiterId = `limiter-${++limiterInstanceCounter}`;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${limiterId}:${keyGenerator(req)}`;
    const now = Date.now();

    // Initialize or get existing entry
    if (!defaultStore[key]) {
      defaultStore[key] = { count: 0, resetTime: now + windowMs };
    }

    const entry = defaultStore[key];

    // Reset if window has expired
    if (now >= entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + windowMs;
    }

    // Check limit before incrementing
    if (entry.count >= maxRequests) {
      res.set("Retry-After", String(Math.ceil((entry.resetTime - now) / 1000)));
      return res.status(429).json({
        error: "Too many requests",
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      });
    }

    // Increment counter
    entry.count += 1;

    // Optionally do not count successful requests toward the limit.
    // This is useful for auth endpoints where failed attempts should be limited,
    // but valid traffic should not be throttled aggressively.
    if (skipSuccessfulRequests) {
      res.on("finish", () => {
        if (res.statusCode < 400 && entry.count > 0) {
          entry.count -= 1;
        }
      });
    }

    // Add rate limit info to response headers
    res.set("X-RateLimit-Limit", String(maxRequests));
    res.set("X-RateLimit-Remaining", String(maxRequests - entry.count));
    res.set("X-RateLimit-Reset", String(entry.resetTime));

    next();
  };
}

export function createAuthRateLimiter() {
  return createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    skipSuccessfulRequests: true
  });
}

export function createGeneralRateLimiter() {
  return createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60 // 60 requests per minute
  });
}

export function createUploadRateLimiter() {
  return createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 uploads per minute per user
    keyGenerator: (req: Request) => {
      // Use authenticated user ID as key when available, fall back to IP
      const userId = (req as Request & { auth?: { sub: string } }).auth?.sub;
      return userId ?? req.ip ?? req.socket.remoteAddress ?? "unknown";
    }
  });
}
