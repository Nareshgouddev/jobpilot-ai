import {
  aiGenerationRequestSchema,
  authTokenResponseSchema,
  candidateProfileResponseSchema,
  candidateProfileSchema,
  resumeUploadResponseSchema,
  atsScoreSchema,
  atsScoreRequestSchema,
  applicationSchema,
  enrichedApplicationSchema,
  applicationStatusSchema,
  type AiGenerationRequest,
  type AuthTokenResponse,
  type CandidateProfile,
  type CandidateProfileResponse,
  type ResumeUploadResponse,
  type AtsScore,
  type AtsScoreRequest,
  type EnrichedApplication,
  type ApplicationStatus
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
export type { ApplicationStatus };
export type {
  AiGenerationRequest,
  AtsScoreRequest,
  CandidateProfileResponse
};

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

// =============================================================================
// ATS Scoring
// =============================================================================

export async function computeAtsScore(
  accessToken: string,
  request: AtsScoreRequest
): Promise<AtsScore> {
  const env = getExtensionEnv();
  const validated = atsScoreRequestSchema.parse(request);

  const response = await fetch(`${env.VITE_API_BASE_URL}/api/ats/score`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(validated)
  });

  return parseJsonResponse(response, atsScoreSchema, "ATS score computation");
}

export async function getAtsHistory(
  accessToken: string,
  limit = 20
): Promise<{ scores: Array<Omit<AtsScore, "matchedRequiredSkills" | "unmatchedRequiredSkills" | "matchedPreferredSkills" | "unmatchedPreferredSkills" | "matchedSoftSkills" | "matchedDomainTerms">> }> {
  const env = getExtensionEnv();
  const response = await fetch(`${env.VITE_API_BASE_URL}/api/ats/history?limit=${limit}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Get ATS history failed (${response.status}): ${json?.error?.message ?? json}`);
  }
  return json;
}

// =============================================================================
// Applications
// =============================================================================

export async function getApplications(
  accessToken: string,
  limit = 20
): Promise<{ applications: EnrichedApplication[]; total: number }> {
  const env = getExtensionEnv();
  const response = await fetch(`${env.VITE_API_BASE_URL}/api/applications?limit=${limit}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Get applications failed (${response.status}): ${json?.error?.message ?? json}`);
  }

  // Validate each application against schema
  return {
    applications: (json.applications as unknown[]).map((app) =>
      enrichedApplicationSchema.parse(app)
    ),
    total: json.total
  };
}

export async function createApplication(
  accessToken: string,
  jobId: string,
  status?: ApplicationStatus
): Promise<EnrichedApplication> {
  const env = getExtensionEnv();
  const body: { jobId: string; status?: ApplicationStatus } = { jobId };
  if (status) body.status = status;

  const response = await fetch(`${env.VITE_API_BASE_URL}/api/applications`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(body)
  });

  return parseJsonResponse(response, enrichedApplicationSchema, "Create application");
}

export async function updateApplication(
  accessToken: string,
  applicationId: string,
  update: { status?: ApplicationStatus; notes?: string }
): Promise<EnrichedApplication> {
  const env = getExtensionEnv();
  const response = await fetch(`${env.VITE_API_BASE_URL}/api/applications/${applicationId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(update)
  });

  return parseJsonResponse(response, enrichedApplicationSchema, "Update application");
}

export async function deleteApplication(accessToken: string, applicationId: string): Promise<void> {
  const env = getExtensionEnv();
  const response = await fetch(`${env.VITE_API_BASE_URL}/api/applications/${applicationId}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const fallback = await response.text();
    throw new Error(`Delete application failed (${response.status}): ${fallback}`);
  }
}
