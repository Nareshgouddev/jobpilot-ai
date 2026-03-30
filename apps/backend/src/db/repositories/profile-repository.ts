import type { SupabaseClient } from "@supabase/supabase-js";

import { throwIfError, unwrapResult } from "../errors.js";
import type { ProfileInsert, ProfileRow } from "../types.js";

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
    const result = await this.db
      .from("profiles")
      .update({
        resume_storage_path: null,
        resume_filename: null,
        resume_mime_type: null,
        resume_uploaded_at: null
      })
      .eq("id", id)
      .select("*")
      .single();

    return unwrapResult(result, "profiles.clearResumeMetadata");
  }
}
