import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { Router } from "express";
import { PDFParse } from "pdf-parse";

import { requireAuth } from "../auth/require-auth.js";
import { logger } from "../config/logger.js";
import { DataAccessError } from "../db/errors.js";
import { repositories } from "../db/index.js";
import { parseMultipart } from "../middleware/multipart.js";
import { createUploadRateLimiter } from "../middleware/rate-limiter.js";
import { resumeUploadResponseSchema } from "@jobpilot/shared";

function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void>
): (request: Request, response: Response, next: NextFunction) => void {
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}

// Magic bytes for PDF: %PDF- (bytes: 0x25 0x50 0x44 0x46 0x2d)
const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);

function validatePdfMagicBytes(filePath: string): boolean {
  const header = readFileSync(filePath, { encoding: null, flag: "r" });
  return PDF_MAGIC_BYTES.every((byte, i) => header[i] === byte);
}

function deriveNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? "User";
  const cleaned = localPart.replace(/[._-]+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : "User";
}

function normalizeUploadedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createHttpError(500, "Invalid uploaded timestamp from database");
  }

  return date.toISOString();
}

export function createResumeRouter(): Router {
  const router = Router();

  router.use(requireAuth);
  router.use(createUploadRateLimiter());

  // POST /api/profile/resume-upload
  router.post(
    "/resume-upload",
    parseMultipart,
    asyncHandler(async (request, response) => {
      const auth = request.auth;
      if (!auth) {
        throw createHttpError(401, "Unauthorized");
      }

      const file = request.parsedMultipart?.files["resume"];
      if (!file || Array.isArray(file)) {
        throw createHttpError(400, "Single 'resume' file field required");
      }

      if (file.mimetype !== "application/pdf") {
        throw createHttpError(415, "Only PDF files are accepted");
      }

      // Magic byte validation
      if (!validatePdfMagicBytes(file.filepath)) {
        throw createHttpError(422, "File does not appear to be a valid PDF");
      }

      if (file.size > 10 * 1024 * 1024) {
        throw createHttpError(413, "File exceeds 10MB limit");
      }

      // Compute hash for deduplication
      const fileContent = readFileSync(file.filepath);
      const fileHash = createHash("sha256").update(fileContent).digest("hex");

      // Check for duplicate by content hash
      const existing = await repositories.resumes.findByUserAndHash(auth.sub, fileHash);
      if (existing) {
        const payload = resumeUploadResponseSchema.parse({
          resumeId: existing.id,
          filename: existing.filename,
          mimeType: existing.mime_type,
          uploadedAt: normalizeUploadedAt(existing.uploaded_at),
          isDuplicate: true
        });
        response.status(200).json(payload);
        return;
      }

      // Upload to Supabase Storage
      const storagePath = `${auth.sub}/${fileHash}.pdf`;
      const { error: uploadError } = await repositories.resumes.uploadToStorage(
        storagePath,
        fileContent,
        file.mimetype
      );

      if (uploadError) {
        throw createHttpError(500, "Failed to upload file to storage");
      }

      // Ensure profile exists for resumebucket FK (resumebucket.user_id -> profiles.id).
      const existingProfile = await repositories.profiles.findById(auth.sub);
      if (!existingProfile) {
        await repositories.profiles.upsert({
          id: auth.sub,
          email: auth.email,
          full_name: deriveNameFromEmail(auth.email),
          skills: [],
          experience_summary: "Profile auto-created during resume upload."
        });
      }

      // Create resumebucket record
      let resumeRecord;
      try {
        resumeRecord = await repositories.resumes.create({
          user_id: auth.sub,
          storage_path: storagePath,
          filename: file.originalFilename,
          mime_type: file.mimetype,
          file_hash: fileHash,
          file_size_bytes: file.size
        });
      } catch (error) {
        await repositories.resumes.deleteFromStorage(storagePath);

        if (error instanceof DataAccessError) {
          logger.error(
            {
              userId: auth.sub,
              email: auth.email,
              storagePath,
              err: error
            },
            "Failed to persist resume metadata after storage upload"
          );
          throw createHttpError(500, "Failed to persist resume metadata");
        }

        throw error;
      }

      // Extract text from PDF for ATS scoring
      let resumeText: string | null = null;
      try {
        const pdfParser = new PDFParse({ data: fileContent });
        const textResult = await pdfParser.getText();
        resumeText = textResult.text?.slice(0, 50000) ?? null; // Cap at 50k chars
        await pdfParser.destroy();
      } catch {
        // Silently fail text extraction - resume still uploaded successfully
      }

      // Resume upload should still succeed even if profile metadata sync fails.
      try {
        await repositories.profiles.updateResumeMetadata(auth.sub, auth.email, {
          resume_storage_path: storagePath,
          resume_filename: file.originalFilename,
          resume_mime_type: file.mimetype,
          resume_uploaded_at: resumeRecord.uploaded_at,
          resume_text: resumeText
        });
      } catch (error) {
        logger.warn(
          {
            userId: auth.sub,
            email: auth.email,
            storagePath,
            resumeId: resumeRecord.id,
            err: error
          },
          "Failed to update profile resume metadata after upload"
        );
      }

      const payload = resumeUploadResponseSchema.parse({
        resumeId: resumeRecord.id,
        filename: resumeRecord.filename,
        mimeType: resumeRecord.mime_type,
        uploadedAt: normalizeUploadedAt(resumeRecord.uploaded_at),
        isDuplicate: false
      });

      response.status(201).json(payload);
    })
  );

  // GET /api/profile/resume — returns signed download URL
  router.get(
    "/resume",
    asyncHandler(async (request, response) => {
      const auth = request.auth;
      if (!auth) {
        throw createHttpError(401, "Unauthorized");
      }

      const profile = await repositories.profiles.findById(auth.sub);
      if (!profile?.resume_storage_path) {
        throw createHttpError(404, "No resume found");
      }

      const { data, error } = await repositories.resumes.createSignedUrl(
        profile.resume_storage_path,
        60 // 60-second TTL
      );

      if (error || !data) {
        throw createHttpError(500, "Failed to generate download URL");
      }

      response.status(200).json({ downloadUrl: data.signedUrl });
    })
  );

  // DELETE /api/profile/resume
  router.delete(
    "/resume",
    asyncHandler(async (request, response) => {
      const auth = request.auth;
      if (!auth) {
        throw createHttpError(401, "Unauthorized");
      }

      const profile = await repositories.profiles.findById(auth.sub);
      if (!profile?.resume_storage_path) {
        throw createHttpError(404, "No resume found");
      }

      // Remove from Supabase Storage
      await repositories.resumes.deleteFromStorage(profile.resume_storage_path);

      // Delete resumebucket record
      await repositories.resumes.deleteByUser(auth.sub);

      // Clear resume metadata from profile
      await repositories.profiles.clearResumeMetadata(auth.sub, auth.email);

      response.status(204).send();
    })
  );

  return router;
}
