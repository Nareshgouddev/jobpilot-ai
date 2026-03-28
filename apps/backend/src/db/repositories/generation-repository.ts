import type { SupabaseClient } from "@supabase/supabase-js";

import { throwIfError, unwrapResult } from "../errors.js";
import type { GenerationInsert, GenerationRow } from "../types.js";

export class GenerationRepository {
  constructor(private readonly db: SupabaseClient) {}

  async create(input: GenerationInsert): Promise<GenerationRow> {
    const result = await this.db.from("generations").insert(input).select("*").single();

    return unwrapResult(result, "generations.insert");
  }

  async listForJob(jobId: string, limit = 10): Promise<GenerationRow[]> {
    const boundedLimit = Math.max(1, Math.min(50, limit));
    const result = await this.db
      .from("generations")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(boundedLimit);

    throwIfError(result.error, "generations.listForJob");

    return result.data ?? [];
  }
}
