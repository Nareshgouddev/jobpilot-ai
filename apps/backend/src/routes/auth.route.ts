import { authSessionRequestSchema, authTokenResponseSchema } from "@jobpilot/shared";
import { Router } from "express";

import { issueAccessToken } from "../auth/token.js";
import { assertExtensionSharedSecret, requireAuth } from "../auth/require-auth.js";

export const authRouter = Router();

authRouter.post("/auth/session", (request, response) => {
  assertExtensionSharedSecret(request);

  const input = authSessionRequestSchema.parse(request.body);
  const token = issueAccessToken({
    userId: input.userId,
    email: input.email
  });

  const payload = authTokenResponseSchema.parse({
    accessToken: token.accessToken,
    tokenType: "Bearer",
    expiresInSeconds: token.expiresInSeconds,
    issuedAt: token.issuedAt
  });

  response.status(201).json(payload);
});

authRouter.get("/auth/me", requireAuth, (request, response) => {
  response.status(200).json({
    userId: request.auth?.sub,
    email: request.auth?.email,
    role: request.auth?.role,
    sessionType: request.auth?.sessionType
  });
});
