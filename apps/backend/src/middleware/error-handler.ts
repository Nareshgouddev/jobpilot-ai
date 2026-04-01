import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { ZodError } from "zod";

import { logger } from "../config/logger.js";
import { DataAccessError } from "../db/errors.js";

export type ApiErrorResponse = {
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
};

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(createHttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const base = {
    statusCode: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "Unexpected server error"
  };

  if (err instanceof ZodError) {
    const body: ApiErrorResponse = {
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: err.flatten()
      }
    };

    res.status(400).json(body);
    return;
  }

  if (err instanceof DataAccessError) {
    logger.error({ err }, "Data access error reached error middleware");

    const body: ApiErrorResponse = {
      error: {
        message: "Database operation failed",
        code: "INTERNAL_SERVER_ERROR"
      }
    };

    res.status(500).json(body);
    return;
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    typeof err.statusCode === "number" &&
    "message" in err &&
    typeof err.message === "string"
  ) {
    const httpError = err as { statusCode: number; message: string };

    const body: ApiErrorResponse = {
      error: {
        message: httpError.message,
        code: httpError.statusCode >= 500 ? base.code : "HTTP_ERROR"
      }
    };

    res.status(httpError.statusCode).json(body);
    return;
  }

  logger.error({ err }, "Unhandled error reached error middleware");

  const body: ApiErrorResponse = {
    error: {
      message: base.message,
      code: base.code
    }
  };

  res.status(base.statusCode).json(body);
}
