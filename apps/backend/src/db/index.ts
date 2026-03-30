import { createSupabaseAdminClient } from "./supabase-client.js";
import { GenerationRepository } from "./repositories/generation-repository.js";
import { JobRepository } from "./repositories/job-repository.js";
import { ProfileRepository } from "./repositories/profile-repository.js";
import { ResumeRepository } from "./repositories/resume-repository.js";

const supabase = createSupabaseAdminClient();

export const repositories = {
  jobs: new JobRepository(supabase),
  profiles: new ProfileRepository(supabase),
  generations: new GenerationRepository(supabase),
  resumes: new ResumeRepository(supabase)
};

export type Repositories = typeof repositories;
