import type { SupabaseClient } from "@supabase/supabase-js";

import { throwIfError, unwrapResult } from "../errors.js";
import type { ResumeInsert, ResumeRow } from "../types.js";

export class ResumeRepository {
  constructor(private readonly db: SupabaseClient) {}

  async create(input: ResumeInsert): Promise<ResumeRow> {
    const result = await this.db
      .from("resumebucket")
      .insert(input)
      .select("*")
      .single();

    return unwrapResult(result, "resumebucket.insert");
  }

  async findByUserAndHash(userId: string, fileHash: string): Promise<ResumeRow | null> {
    const result = await this.db
      .from("resumebucket")
      .select("*")
      .eq("user_id", userId)
      .eq("file_hash", fileHash)
      .maybeSingle();

    throwIfError(result.error, "resumebucket.findByUserAndHash");
    return result.data;
  }

  async findLatestByUser(userId: string): Promise<ResumeRow | null> {
    const result = await this.db
      .from("resumebucket")
      .select("*")
      .eq("user_id", userId)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    throwIfError(result.error, "resumebucket.findLatestByUser");
    return result.data;
  }

  async deleteByUser(userId: string): Promise<void> {
    const result = await this.db
      .from("resumebucket")
      .delete()
      .eq("user_id", userId);

    throwIfError(result.error, "resumebucket.deleteByUser");
  }

  async uploadToStorage(
    path: string,
    content: Buffer,
    mimeType: string
  ): Promise<{ data: unknown; error: unknown }> {
    return this.db.storage.from("resumes").upload(path, content, {
      contentType: mimeType,
      upsert: true
    });
  }

  async createSignedUrl(
    path: string,
    expiresIn: number
  ): Promise<{ data: { signedUrl: string } | null; error: unknown }> {
    return this.db.storage.from("resumes").createSignedUrl(path, expiresIn);
  }

  async deleteFromStorage(path: string): Promise<{ error: unknown }> {
    return this.db.storage.from("resumes").remove([path]);
  }
}
