import { timingSafeEqual } from "node:crypto";

import createHttpError from "http-errors";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { verifyAccessToken } from "./token.js";

function getBearerToken(request: Request): string {
  const value = request.header("authorization");

  if (!value) {
    throw createHttpError(401, "Missing Authorization header");
  }

  const [scheme, token] = value.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw createHttpError(401, "Authorization header must be a Bearer token");
  }

  return token;
}

function normalizeSharedSecret(value: string): string {
  const trimmed = value.trim();

  // Accept common .env formatting where values are wrapped in matching quotes.
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

export function assertExtensionSharedSecret(request: Request): void {
  const presented = request.header("x-extension-key");

  if (!presented) {
    throw createHttpError(401, "Missing extension key");
  }

  const providedNormalized = normalizeSharedSecret(presented);
  const providedBuffer = Buffer.from(providedNormalized);

  const expectedSecrets = [env.EXTENSION_SHARED_SECRET, env.VITE_EXTENSION_SHARED_SECRET]
    .filter((value): value is string => Boolean(value))
    .map(normalizeSharedSecret)
    .filter((value, index, values) => values.indexOf(value) === index);

  const hasMatch = expectedSecrets.some((secret) => {
    const expectedBuffer = Buffer.from(secret);

    return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
  });

  if (!hasMatch) {
    throw createHttpError(401, "Invalid extension key");
  }
}

export function requireAuth(request: Request, _response: Response, next: NextFunction): void {
  try {
    const token = getBearerToken(request);
    request.auth = verifyAccessToken(token);
    next();
  } catch (error) {
    if (createHttpError.isHttpError(error)) {
      next(error);
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      next(createHttpError(401, "Token expired"));
      return;
    }

    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.NotBeforeError) {
      next(createHttpError(401, "Invalid token"));
      return;
    }

    next(createHttpError(401, "Unauthorized"));
  }
}
