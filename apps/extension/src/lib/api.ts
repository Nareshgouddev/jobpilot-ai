import {
  aiGenerationRequestSchema,
  authTokenResponseSchema,
  candidateProfileResponseSchema,
  candidateProfileSchema,
  resumeUploadResponseSchema,
  type AiGenerationRequest,
  type AuthTokenResponse,
  type CandidateProfile,
  type CandidateProfileResponse,
  type ResumeUploadResponse
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

export async function getProfile(accessToken: string): Promise<CandidateProfileResponse> {
  const env = getExtensionEnv();
  const response = await fetch(`${env.VITE_API_BASE_URL}/api/profile/me`, {
    method: "GET",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    }
  });

  return parseJsonResponse(response, candidateProfileResponseSchema, "Get profile");
}

export async function updateProfile(
  accessToken: string,
  payload: CandidateProfile
): Promise<CandidateProfileResponse> {
  const env = getExtensionEnv();
  const validated = candidateProfileSchema.parse(payload);

  const response = await fetch(`${env.VITE_API_BASE_URL}/api/profile/me`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(validated)
  });

  return parseJsonResponse(response, candidateProfileResponseSchema, "Update profile");
}

export async function uploadResume(
  accessToken: string,
  file: File
): Promise<ResumeUploadResponse> {
  const env = getExtensionEnv();

  const formData = new FormData();
  formData.append("resume", file, file.name);

  const response = await fetch(`${env.VITE_API_BASE_URL}/api/profile/resume-upload`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`
    },
    body: formData
  });

  return parseJsonResponse(response, resumeUploadResponseSchema, "Resume upload");
}

export async function getResumeDownloadUrl(
  accessToken: string
): Promise<{ downloadUrl: string }> {
  const env = getExtensionEnv();
  const response = await fetch(`${env.VITE_API_BASE_URL}/api/profile/resume`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Get resume URL failed (${response.status}): ${json?.error?.message ?? json}`);
  }
  return { downloadUrl: json.downloadUrl };
}

export async function deleteResume(accessToken: string): Promise<void> {
  const env = getExtensionEnv();
  const response = await fetch(`${env.VITE_API_BASE_URL}/api/profile/resume`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const fallback = await response.text();
    throw new Error(`Delete resume failed (${response.status}): ${fallback}`);
  }
}
