import {
  aiGenerationRequestSchema,
  authTokenResponseSchema,
  type AiGenerationRequest,
  type AuthTokenResponse
} from "@jobpilot/shared";
import { z } from "zod";

import { getExtensionEnv } from "./config";

const generationResponseSchema = z.object({
  generation: z.object({
    id: z.string(),
    createdAt: z.string()
  }),
  output: z.object({
    subjectLine: z.string(),
    keyHighlights: z.array(z.string()),
    coverLetter: z.string()
  }),
  metadata: z.object({
    provider: z.string(),
    model: z.string()
  })
});

export type GenerationResponse = z.infer<typeof generationResponseSchema>;

async function parseJsonResponse<T>(response: Response, schema: z.ZodSchema<T>, context: string): Promise<T> {
  if (!response.ok) {
    const fallback = await response.text();
    throw new Error(`${context} failed (${response.status}): ${fallback}`);
  }

  const json = (await response.json()) as unknown;
  return schema.parse(json);
}

export async function issueSessionToken(identity: { userId: string; email: string }): Promise<AuthTokenResponse> {
  const env = getExtensionEnv();

  const response = await fetch(`${env.VITE_API_BASE_URL}/api/auth/session`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-extension-key": env.VITE_EXTENSION_SHARED_SECRET
    },
    body: JSON.stringify({
      userId: identity.userId,
      email: identity.email
    })
  });

  return parseJsonResponse(response, authTokenResponseSchema, "Session creation");
}

export async function generateDraft(accessToken: string, payload: AiGenerationRequest): Promise<GenerationResponse> {
  const env = getExtensionEnv();
  const validatedPayload = aiGenerationRequestSchema.parse(payload);

  const response = await fetch(`${env.VITE_API_BASE_URL}/api/generations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(validatedPayload)
  });

  return parseJsonResponse(response, generationResponseSchema, "Draft generation");
}
