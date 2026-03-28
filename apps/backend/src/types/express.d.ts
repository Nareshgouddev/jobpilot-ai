import type { JwtAccessClaims } from "../auth/token.js";

declare global {
  namespace Express {
    interface Request {
      auth?: JwtAccessClaims;
    }
  }
}

export {};
