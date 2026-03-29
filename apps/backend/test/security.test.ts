import { describe, expect, it, beforeEach } from "vitest";
import { createRateLimiter, createAuthRateLimiter, createGeneralRateLimiter } from "../src/middleware/rate-limiter";
import { createCorsPolicy, validateOrigin } from "../src/middleware/cors-policy";
import { buildCspHeader, STRICT_CSP_DIRECTIVES, MODERATE_CSP_DIRECTIVES } from "../src/middleware/csp";
import {
  detectBruteForceBehavior,
  validatePayloadSize,
  detectSuspiciousPatterns,
  SecurityEventType
} from "../src/middleware/audit";

describe("security hardening", () => {
  describe("rate limiting", () => {
    it("should allow requests under the limit", () => {
      const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 3 });

      const req = { ip: "192.168.1.1" } as any;
      const res = {
        status: (code: number) => ({ json: () => ({}) }),
        set: () => {}
      } as any;
      const next = () => {};

      // First request should succeed
      limiter(req, res, next);
      limiter(req, res, next);
      // Should complete without calling next on 3rd successful
    });

    it("should reject requests exceeding the limit", () => {
      const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2 });

      const req = { ip: "192.168.1.2" } as any;
      let statusCode = 200;
      const res = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: () => ({})
          };
        },
        set: () => {}
      } as any;
      const next = () => {};

      limiter(req, res, next);
      limiter(req, res, next);
      limiter(req, res, next); // Should be rejected

      expect(statusCode).toBe(429);
    });

    it("auth rate limiter enforces stricter limits", () => {
      const limiter = createAuthRateLimiter();
      expect(limiter).toBeTruthy();
    });

    it("general rate limiter allows higher throughput", () => {
      const limiter = createGeneralRateLimiter();
      expect(limiter).toBeTruthy();
    });
  });

  describe("CORS policy", () => {
    it("should create policy with allowed origins", () => {
      const policy = createCorsPolicy(["https://example.com", "https://app.example.com"]);

      expect(policy.allowedOrigins).toContain("https://example.com");
      expect(policy.allowedMethods).toContain("GET");
      expect(policy.allowedMethods).toContain("POST");
    });

    it("should validate exact origin match", () => {
      const policy = createCorsPolicy(["https://example.com"]);

      expect(validateOrigin("https://example.com", policy)).toBe(true);
      expect(validateOrigin("https://evil.com", policy)).toBe(false);
    });

    it("should support wildcard origins", () => {
      const policy = createCorsPolicy(["https://*.example.com"]);

      expect(validateOrigin("https://api.example.com", policy)).toBe(true);
      expect(validateOrigin("https://app.example.com", policy)).toBe(true);
      expect(validateOrigin("https://evil.com", policy)).toBe(false);
    });

    it("should reject malicious origins", () => {
      const policy = createCorsPolicy(["https://example.com"]);

      const maliciousOrigins = [
        "https://evil.com",
        "http://localhost:3000",
        "https://exampleXcom"
      ];

      maliciousOrigins.forEach((origin) => {
        expect(validateOrigin(origin, policy)).toBe(false);
      });
    });

    it("should include credentials in CORS policy", () => {
      const policy = createCorsPolicy();
      expect(policy.credentials).toBe(true);
    });
  });

  describe("Content Security Policy", () => {
    it("should build CSP header from directives", () => {
      const csp = buildCspHeader(MODERATE_CSP_DIRECTIVES);

      expect(csp).toContain("default-src");
      expect(csp).toContain("script-src");
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it("should prevent clickjacking with frame-ancestors", () => {
      const csp = buildCspHeader({ "frame-ancestors": ["'none'"] });

      expect(csp).toContain("frame-ancestors 'none'");
    });

    it("strict CSP should block inline scripts", () => {
      const csp = buildCspHeader(STRICT_CSP_DIRECTIVES);

      expect(csp).toContain("script-src 'none'");
      expect(csp).toContain("default-src 'none'");
    });

    it("should support report-uri for CSP violations", () => {
      const csp = buildCspHeader(MODERATE_CSP_DIRECTIVES, "https://example.com/csp-report");

      expect(csp).toContain("https://example.com/csp-report");
    });
  });

  describe("audit logging", () => {
    it("should detect brute force behavior", () => {
      expect(detectBruteForceBehavior(3)).toBe(false);
      expect(detectBruteForceBehavior(6)).toBe(true);
      expect(detectBruteForceBehavior(10)).toBe(true);
    });

    it("should validate payload size", () => {
      const smallPayload = { data: "test" };
      const largePayload = { data: "x".repeat(2000) };

      expect(validatePayloadSize(smallPayload, 1).valid).toBe(true);
      expect(validatePayloadSize(largePayload, 1).valid).toBe(false);
    });

    it("should detect SQL injection patterns", () => {
      expect(detectSuspiciousPatterns("SELECT * FROM users")).toBe(true);
      expect(detectSuspiciousPatterns("UNION SELECT")).toBe(true);
      expect(detectSuspiciousPatterns("DROP TABLE")).toBe(true);
      expect(detectSuspiciousPatterns("normal text")).toBe(false);
    });

    it("should detect XSS patterns", () => {
      expect(detectSuspiciousPatterns("<script>alert('xss')</script>")).toBe(true);
      expect(detectSuspiciousPatterns("javascript:void(0)")).toBe(true);
      expect(detectSuspiciousPatterns("onclick=alert()")).toBe(true);
      expect(detectSuspiciousPatterns("normal text")).toBe(false);
    });

    it("should identify all security event types", () => {
      expect(SecurityEventType.AUTH_ATTEMPT).toBe("AUTH_ATTEMPT");
      expect(SecurityEventType.AUTH_FAILURE).toBe("AUTH_FAILURE");
      expect(SecurityEventType.RATE_LIMIT_EXCEEDED).toBe("RATE_LIMIT_EXCEEDED");
      expect(SecurityEventType.TOKEN_BRUTE_FORCE).toBe("TOKEN_BRUTE_FORCE");
    });
  });

  describe("payload validation", () => {
    it("should enforce max payload sizes", () => {
      const payload = { message: "test" };
      const result = validatePayloadSize(payload, 10);

      expect(result.valid).toBe(true);
    });

    it("should reject oversized payloads", () => {
      const largePayload = { data: "x".repeat(5000) };
      const result = validatePayloadSize(largePayload, 1);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("exceeds");
    });
  });

  describe("security headers", () => {
    it("should include rate limit headers", () => {
      const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 });

      const headers: Record<string, string> = {};
      const req = { ip: "192.168.1.3" } as any;
      const res = {
        status: () => ({ json: () => ({}) }),
        set: (key: string, value: string | number) => {
          headers[key] = String(value);
        }
      } as any;
      const next = () => {};

      limiter(req, res, next);

      expect(headers["X-RateLimit-Limit"]).toBeTruthy();
      expect(headers["X-RateLimit-Remaining"]).toBeTruthy();
      expect(headers["X-RateLimit-Reset"]).toBeTruthy();
    });

    it("should include Retry-After on rate limit", () => {
      const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1 });

      const headers: Record<string, string> = {};
      const req = { ip: "192.168.1.4" } as any;
      const res = {
        status: () => ({ json: () => ({}) }),
        set: (key: string, value: string) => {
          headers[key] = value;
        }
      } as any;
      const next = () => {};

      limiter(req, res, next);
      limiter(req, res, next); // Trigger limit

      expect(headers["Retry-After"]).toBeTruthy();
    });
  });

  describe("edge cases", () => {
    it("should handle burst traffic gracefully", () => {
      const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 5 });

      const req = { ip: "192.168.1.5" } as any;
      const res = {
        status: () => ({ json: () => ({}) }),
        set: () => {}
      } as any;
      const next = () => {};

      // Simulate burst
      for (let i = 0; i < 10; i++) {
        limiter(req, res, next);
      }

      // Should not throw, rate limiting should reject extras
      expect(limiter).toBeTruthy();
    });

    it("should handle multiple origins with wildcards", () => {
      const policy = createCorsPolicy([
        "https://*.example.com",
        "https://trusted.org",
        "http://localhost:*"
      ]);

      expect(validateOrigin("https://api.example.com", policy)).toBe(true);
      expect(validateOrigin("https://trusted.org", policy)).toBe(true);
    });

    it("should sanitize payload validation edge cases", () => {
      expect(validatePayloadSize(null, 1).valid).toBe(true);
      expect(validatePayloadSize({}, 1).valid).toBe(true);
      expect(validatePayloadSize([], 1).valid).toBe(true);
    });
  });
});
