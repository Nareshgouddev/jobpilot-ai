import { type Request, type Response, type NextFunction } from "express";

export interface CspDirectives {
  "default-src": string[];
  "script-src": string[];
  "style-src": string[];
  "img-src": string[];
  "font-src": string[];
  "connect-src": string[];
  "frame-ancestors": string[];
  "base-uri": string[];
  "form-action": string[];
  "upgrade-insecure-requests"?: boolean;
}

type CspDirectiveInput = Partial<CspDirectives>;

export const DEFAULT_CSP_DIRECTIVES: CspDirectives = {
  "default-src": ["'self'"],
  "script-src": ["'self'"],
  "style-src": ["'self'", "'unsafe-inline'"], // Allow inline for minimal CSS
  "img-src": ["'self'", "data:", "https:"],
  "font-src": ["'self'", "data:", "https:"],
  "connect-src": ["'self'"],
  "frame-ancestors": ["'none'"], // Prevent clickjacking
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "upgrade-insecure-requests": false
};

export function buildCspHeader(directives: CspDirectiveInput, reportUri?: string): string {
  let header = "";

  for (const [key, values] of Object.entries(directives)) {
    if (key === "upgrade-insecure-requests" && values === true) {
      header += "upgrade-insecure-requests;";
    } else if (Array.isArray(values)) {
      header += `${key} ${(values as string[]).join(" ")};`;
    }
  }

  if (reportUri) {
    header += `report-uri ${reportUri};`;
  }

  return header;
}

export function createCspMiddleware(directives: CspDirectives = DEFAULT_CSP_DIRECTIVES, reportUri?: string) {
  const cspHeader = buildCspHeader(directives, reportUri);

  return (_req: Request, res: Response, next: NextFunction) => {
    res.set("Content-Security-Policy", cspHeader);
    // Also set report-only for monitoring without blocking
    res.set("Content-Security-Policy-Report-Only", cspHeader);
    next();
  };
}

// Moderate CSP for serving static assets
export const MODERATE_CSP_DIRECTIVES: CspDirectives = {
  "default-src": ["'self'"],
  "script-src": ["'self'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "https:"],
  "font-src": ["'self'", "data:"],
  "connect-src": ["'self'"],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"]
};
