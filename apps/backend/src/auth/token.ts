import { randomUUID } from "node:crypto";

import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export type JwtAccessClaims = {
  sub: string;
  email: string;
  role: "user";
  sessionType: "extension";
  jti: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
};

export type TokenIssueInput = {
  userId: string;
  email: string;
};

export type TokenIssueResult = {
  accessToken: string;
  expiresInSeconds: number;
  issuedAt: string;
};

export function issueAccessToken(input: TokenIssueInput): TokenIssueResult {
  const issuedAtSeconds = Math.floor(Date.now() / 1000);
  const expiresInSeconds = env.JWT_ACCESS_TTL_SECONDS;

  const accessToken = jwt.sign(
    {
      email: input.email,
      role: "user",
      sessionType: "extension"
    },
    env.JWT_SECRET,
    {
      algorithm: "HS256",
      subject: input.userId,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      jwtid: randomUUID(),
      expiresIn: expiresInSeconds
    }
  );

  return {
    accessToken,
    expiresInSeconds,
    issuedAt: new Date(issuedAtSeconds * 1000).toISOString()
  };
}

export function verifyAccessToken(token: string): JwtAccessClaims {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE
  });

  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token payload");
  }

  const claims = decoded as Partial<JwtAccessClaims>;

  if (
    typeof claims.sub !== "string" ||
    typeof claims.email !== "string" ||
    claims.role !== "user" ||
    claims.sessionType !== "extension" ||
    typeof claims.jti !== "string" ||
    typeof claims.iat !== "number" ||
    typeof claims.exp !== "number" ||
    typeof claims.iss !== "string" ||
    typeof claims.aud !== "string"
  ) {
    throw new Error("Token payload schema mismatch");
  }

  return claims as JwtAccessClaims;
}
