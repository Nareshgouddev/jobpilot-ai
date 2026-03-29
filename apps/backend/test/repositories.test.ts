import { describe, expect, it, vi } from "vitest";

import { DataAccessError } from "../src/db/errors.js";
import { GenerationRepository } from "../src/db/repositories/generation-repository.js";
import { JobRepository } from "../src/db/repositories/job-repository.js";
import { ProfileRepository } from "../src/db/repositories/profile-repository.js";
import type { GenerationRow, JobRow, ProfileRow } from "../src/db/types.js";

function createDbMock(builder: Record<string, unknown>) {
  return {
    from: vi.fn().mockReturnValue(builder)
  };
}

describe("repositories", () => {
  it("creates jobs successfully", async () => {
    const row: JobRow = {
      id: "job-1",
      user_id: "user-1",
      title: "Engineer",
      company: "Acme",
      location: "Remote",
      description: "Long description",
      employment_type: "full-time",
      source_url: "https://example.com",
      contact_email: "jobs@example.com",
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const builder = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: row, error: null })
    };

    const repo = new JobRepository(createDbMock(builder) as never);

    const result = await repo.create({
      user_id: "user-1",
      title: "Engineer",
      company: "Acme",
      location: "Remote",
      description: "Long description",
      employment_type: "full-time"
    });

    expect(result.id).toBe("job-1");
  });

  it("bounds job list limit and returns empty list when no data", async () => {
    const limitMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: limitMock
    };

    const repo = new JobRepository(createDbMock(builder) as never);

    const result = await repo.listByUserId("user-1", 500);

    expect(result).toEqual([]);
    expect(limitMock).toHaveBeenCalledWith(100);
  });

  it("throws DataAccessError when profile read fails", async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: "db down" } })
    };

    const repo = new ProfileRepository(createDbMock(builder) as never);

    await expect(repo.findByEmail("test@example.com")).rejects.toBeInstanceOf(DataAccessError);
  });

  it("lists generations for a job", async () => {
    const rows: GenerationRow[] = [
      {
        id: "gen-1",
        job_id: "job-1",
        user_id: "user-1",
        tone: "formal",
        prompt: "prompt",
        output_text: "output",
        provider: "openrouter",
        model: "openrouter/auto",
        tokens_input: 100,
        tokens_output: 200,
        created_at: new Date().toISOString()
      }
    ];

    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: rows, error: null })
    };

    const repo = new GenerationRepository(createDbMock(builder) as never);

    const result = await repo.listForJob("job-1", 10);

    expect(result).toHaveLength(1);
    expect(result[0]).toBeDefined();
    expect(result[0]?.id).toBe("gen-1");
  });

  it("upserts profile successfully", async () => {
    const row: ProfileRow = {
      id: "user-1",
      email: "user@example.com",
      full_name: "User One",
      skills: ["react"],
      experience_summary: "Experienced engineer",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const builder = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: row, error: null })
    };

    const repo = new ProfileRepository(createDbMock(builder) as never);

    const result = await repo.upsert({
      email: "user@example.com",
      full_name: "User One",
      experience_summary: "Experienced engineer"
    });

    expect(result.email).toBe("user@example.com");
  });
});
