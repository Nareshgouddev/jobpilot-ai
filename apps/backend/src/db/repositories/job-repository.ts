import type { SupabaseClient } from "@supabase/supabase-js";

import { throwIfError, unwrapResult } from "../errors.js";
import type { JobInsert, JobRow } from "../types.js";

export class JobRepository {
  constructor(private readonly db: SupabaseClient) {}

  async create(input: JobInsert): Promise<JobRow> {
    const result = await this.db.from("jobs").insert(input).select("*").single();

    return unwrapResult(result, "jobs.insert");
  }

  async findBySourceUrl(userId: string, sourceUrl: string): Promise<JobRow | null> {
    const result = await this.db
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .eq("source_url", sourceUrl)
      .maybeSingle();

    throwIfError(result.error, "jobs.findBySourceUrl");

    return result.data;
  }

  async listByUserId(userId: string, limit = 20): Promise<JobRow[]> {
    const boundedLimit = Math.max(1, Math.min(100, limit));
    const result = await this.db
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(boundedLimit);

    throwIfError(result.error, "jobs.listByUserId");

    return result.data ?? [];
  }
}
