import type { SupabaseClient } from "@supabase/supabase-js";
import { throwIfError, unwrapResult } from "../errors.js";
import type { Json } from "../types.js";

export type AtsScoreRow = {
  id: string;
  user_id: string;
  job_id: string;
  profile_snapshot: Json;
  overall_score: number;
  required_skills_score: number;
  preferred_skills_score: number;
  soft_skills_score: number;
  domain_terms_score: number;
  matched_required_skills: string[];
  unmatched_required_skills: string[];
  matched_preferred_skills: string[];
  unmatched_preferred_skills: string[];
  matched_soft_skills: string[];
  matched_domain_terms: string[];
  computed_at: string;
};

export type AtsScoreInsert = {
  user_id: string;
  job_id: string;
  profile_snapshot: Json;
  overall_score: number;
  required_skills_score: number;
  preferred_skills_score: number;
  soft_skills_score: number;
  domain_terms_score: number;
  matched_required_skills: string[];
  unmatched_required_skills: string[];
  matched_preferred_skills: string[];
  unmatched_preferred_skills: string[];
  matched_soft_skills: string[];
  matched_domain_terms: string[];
};

export class AtsScoreRepository {
  constructor(private readonly db: SupabaseClient) {}

  async create(input: AtsScoreInsert): Promise<AtsScoreRow> {
    const result = await this.db
      .from("ats_scores")
      .insert(input)
      .select("*")
      .single();

    return unwrapResult(result, "ats_scores.insert");
  }

  async listByUserId(userId: string, limit = 20): Promise<AtsScoreRow[]> {
    const result = await this.db
      .from("ats_scores")
      .select("*")
      .eq("user_id", userId)
      .order("computed_at", { ascending: false })
      .limit(limit);

    throwIfError(result.error, "ats_scores.listByUserId");
    return result.data ?? [];
  }

  async findByJobId(jobId: string, userId: string): Promise<AtsScoreRow | null> {
    const result = await this.db
      .from("ats_scores")
      .select("*")
      .eq("job_id", jobId)
      .eq("user_id", userId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    throwIfError(result.error, "ats_scores.findByJobId");
    return result.data;
  }

  async getLatestForJobs(userId: string, jobIds: string[]): Promise<Map<string, AtsScoreRow>> {
    if (jobIds.length === 0) return new Map();

    const result = await this.db
      .from("ats_scores")
      .select("*")
      .eq("user_id", userId)
      .in("job_id", jobIds);

    throwIfError(result.error, "ats_scores.getLatestForJobs");

    const map = new Map<string, AtsScoreRow>();
    for (const row of result.data ?? []) {
      const existing = map.get(row.job_id);
      if (!existing || new Date(row.computed_at) > new Date(existing.computed_at)) {
        map.set(row.job_id, row);
      }
    }
    return map;
  }
}
