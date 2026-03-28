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

export function assertExtensionSharedSecret(request: Request): void {
  const presented = request.header("x-extension-key");

  if (!presented) {
    throw createHttpError(401, "Missing extension key");
  }

  const expectedBuffer = Buffer.from(env.EXTENSION_SHARED_SECRET);
  const providedBuffer = Buffer.from(presented);

  if (expectedBuffer.length !== providedBuffer.length) {
    throw createHttpError(401, "Invalid extension key");
  }

  if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
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
