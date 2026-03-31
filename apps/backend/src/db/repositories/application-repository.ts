import type { SupabaseClient } from "@supabase/supabase-js";
import { throwIfError, unwrapResult } from "../errors.js";

export type ApplicationRow = {
  id: string;
  user_id: string;
  job_id: string;
  status: string;
  applied_at: string;
  updated_at: string;
  notes: string | null;
};

export type ApplicationInsert = {
  user_id: string;
  job_id: string;
  status?: string;
  notes?: string | null;
};

export class ApplicationRepository {
  constructor(private readonly db: SupabaseClient) {}

  async create(input: ApplicationInsert): Promise<ApplicationRow> {
    const result = await this.db
      .from("applications")
      .insert({
        user_id: input.user_id,
        job_id: input.job_id,
        status: input.status ?? "not_applied",
        notes: input.notes ?? null
      })
      .select("*")
      .single();

    return unwrapResult(result, "applications.insert");
  }

  async findByUserAndJob(userId: string, jobId: string): Promise<ApplicationRow | null> {
    const result = await this.db
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .eq("job_id", jobId)
      .maybeSingle();

    throwIfError(result.error, "applications.findByUserAndJob");
    return result.data;
  }

  async getById(userId: string, applicationId: string): Promise<ApplicationRow | null> {
    const result = await this.db
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .eq("id", applicationId)
      .maybeSingle();

    throwIfError(result.error, "applications.getById");
    return result.data;
  }

  async listByUserId(userId: string, limit = 20, offset = 0): Promise<ApplicationRow[]> {
    const boundedLimit = Math.max(1, Math.min(100, limit));
    const result = await this.db
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .order("applied_at", { ascending: false })
      .range(offset, offset + boundedLimit - 1);

    throwIfError(result.error, "applications.listByUserId");
    return result.data ?? [];
  }

  async updateStatus(id: string, userId: string, status: string): Promise<ApplicationRow> {
    const result = await this.db
      .from("applications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    return unwrapResult(result, "applications.updateStatus");
  }

  async updateNotes(id: string, userId: string, notes: string): Promise<ApplicationRow> {
    const result = await this.db
      .from("applications")
      .update({ notes, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    return unwrapResult(result, "applications.updateNotes");
  }

  async delete(id: string, userId: string): Promise<void> {
    const result = await this.db
      .from("applications")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    throwIfError(result.error, "applications.delete");
  }

  async getEnrichedList(
    userId: string,
    limit = 20
  ): Promise<Array<ApplicationRow & { job: { id: string; title: string; company: string; location: string } | null }>> {
    const result = await this.db
      .from("applications")
      .select("*, job:jobs(id, title, company, location)")
      .eq("user_id", userId)
      .order("applied_at", { ascending: false })
      .limit(limit);

    throwIfError(result.error, "applications.getEnrichedList");
    return result.data ?? [];
  }

  async getWithAtsScore(
    userId: string,
    applicationId: string
  ): Promise<{ application: ApplicationRow; atsScore: { overall_score: number } | null } | null> {
    const appResult = await this.db
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .eq("id", applicationId)
      .maybeSingle();

    throwIfError(appResult.error, "applications.getWithAtsScore");
    if (!appResult.data) return null;

    const scoreResult = await this.db
      .from("ats_scores")
      .select("overall_score")
      .eq("user_id", userId)
      .eq("job_id", appResult.data.job_id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    throwIfError(scoreResult.error, "applications.getWithAtsScore.atsScore");

    return {
      application: appResult.data,
      atsScore: scoreResult.data
    };
  }
}
