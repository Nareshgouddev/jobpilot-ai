import type { SupabaseClient } from "@supabase/supabase-js";

import { DataAccessError, throwIfError, unwrapResult } from "../errors.js";
import type { ProfileInsert, ProfileRow } from "../types.js";

function isMissingResumeTextColumnError(error: unknown): boolean {
  if (!(error instanceof DataAccessError)) {
    return false;
  }

  const cause = error.causeData;
  if (!cause || typeof cause !== "object") {
    return false;
  }

  const message = "message" in cause && typeof cause.message === "string" ? cause.message : "";
  const details = "details" in cause && typeof cause.details === "string" ? cause.details : "";
  const combined = `${message} ${details}`.toLowerCase();

  return combined.includes("resume_text") && combined.includes("column");
}

export class ProfileRepository {
  constructor(private readonly db: SupabaseClient) {}

  async upsert(input: ProfileInsert): Promise<ProfileRow> {
    const result = await this.db
      .from("profiles")
      .upsert(input, { onConflict: "email" })
      .select("*")
      .single();

    return unwrapResult(result, "profiles.upsert");
  }

  async upsertFull(
    input: ProfileInsert & {
      phone?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      postal_code?: string | null;
      linkedin_url?: string | null;
      portfolio_url?: string | null;
      education?: unknown;
      certifications?: unknown;
      resume_storage_path?: string | null;
      resume_filename?: string | null;
      resume_mime_type?: string | null;
      resume_uploaded_at?: string | null;
      resume_text?: string | null;
    }
  ): Promise<ProfileRow> {
    const result = await this.db
      .from("profiles")
      .upsert(input, { onConflict: "email" })
      .select("*")
      .single();

    return unwrapResult(result, "profiles.upsertFull");
  }

  async findById(id: string): Promise<ProfileRow | null> {
    const result = await this.db
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    throwIfError(result.error, "profiles.findById");
    return result.data;
  }

  async findByEmail(email: string): Promise<ProfileRow | null> {
    const result = await this.db
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    throwIfError(result.error, "profiles.findByEmail");
    return result.data;
  }

  async clearResumeMetadata(id: string, email: string): Promise<ProfileRow> {
    const baseUpdate = {
      resume_storage_path: null,
      resume_filename: null,
      resume_mime_type: null,
      resume_uploaded_at: null
    };

    const result = await this.db
      .from("profiles")
      .update({
        ...baseUpdate,
        resume_text: null
      })
      .eq("id", id)
      .select("*")
      .single();

    try {
      return unwrapResult(result, "profiles.clearResumeMetadata");
    } catch (error) {
      if (!isMissingResumeTextColumnError(error)) {
        throw error;
      }

      const fallbackResult = await this.db
        .from("profiles")
        .update(baseUpdate)
        .eq("id", id)
        .select("*")
        .single();

      return unwrapResult(fallbackResult, "profiles.clearResumeMetadata.fallback");
    }
  }

  async updateResumeMetadata(
    id: string,
    email: string,
    metadata: {
      resume_storage_path: string;
      resume_filename: string;
      resume_mime_type: string;
      resume_uploaded_at: string;
      resume_text: string | null;
    }
  ): Promise<ProfileRow> {
    const baseUpdate = {
      resume_storage_path: metadata.resume_storage_path,
      resume_filename: metadata.resume_filename,
      resume_mime_type: metadata.resume_mime_type,
      resume_uploaded_at: metadata.resume_uploaded_at
    };

    const result = await this.db
      .from("profiles")
      .update({
        ...baseUpdate,
        resume_text: metadata.resume_text
      })
      .eq("id", id)
      .select("*")
      .single();

    try {
      return unwrapResult(result, "profiles.updateResumeMetadata");
    } catch (error) {
      if (!isMissingResumeTextColumnError(error)) {
        throw error;
      }

      const fallbackResult = await this.db
        .from("profiles")
        .update(baseUpdate)
        .eq("id", id)
        .select("*")
        .single();

      return unwrapResult(fallbackResult, "profiles.updateResumeMetadata.fallback");
    }
  }
}
