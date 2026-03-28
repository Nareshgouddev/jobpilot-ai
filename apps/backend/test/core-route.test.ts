import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import { issueAccessToken } from "../src/auth/token.js";
import { createCoreRouter } from "../src/routes/core.route.js";

function authHeader() {
  const token = issueAccessToken({
    userId: "550e8400-e29b-41d4-a716-446655440000",
    email: "user@example.com"
  });

  return `Bearer ${token.accessToken}`;
}

function createAppWithCoreRouter(router: express.Router): express.Express {
  const app = express();
  app.use(express.json());
  app.use("/api", router);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "validation" });
      return;
    }

    if (typeof err === "object" && err && "statusCode" in err) {
      const error = err as { statusCode: number; message: string };
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "internal" });
  });

  return app;
}

describe("core route", () => {
  it("upserts and returns profile", async () => {
    const repos = {
      profiles: {
        upsert: vi.fn().mockResolvedValue({
          id: "550e8400-e29b-41d4-a716-446655440000",
          email: "user@example.com",
          full_name: "Taylor Dev",
          skills: ["React"],
          experience_summary: "A".repeat(40),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }),
        findByEmail: vi.fn().mockResolvedValue({
          id: "550e8400-e29b-41d4-a716-446655440000",
          email: "user@example.com",
          full_name: "Taylor Dev",
          skills: ["React"],
          experience_summary: "A".repeat(40),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      },
      jobs: {
        findBySourceUrl: vi.fn(),
        create: vi.fn(),
        listByUserId: vi.fn()
      },
      generations: {
        create: vi.fn(),
        listForJob: vi.fn(),
        listByUserId: vi.fn().mockResolvedValue([]),
        listByJobAndUserId: vi.fn().mockResolvedValue([])
      }
    };

    const app = createAppWithCoreRouter(
      createCoreRouter({
        repositories: repos as never,
        generationService: { generate: vi.fn() } as never
      })
    );

    const putResponse = await request(app)
      .put("/api/profile/me")
      .set("Authorization", authHeader())
      .send({
        fullName: "Taylor Dev",
        skills: ["React"],
        experienceSummary: "A".repeat(40)
      });

    expect(putResponse.status).toBe(200);
    expect(putResponse.body.fullName).toBe("Taylor Dev");

    const getResponse = await request(app).get("/api/profile/me").set("Authorization", authHeader());

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.email).toBe("user@example.com");
  });

  it("ingests jobs and deduplicates by sourceUrl", async () => {
    const repos = {
      profiles: {
        upsert: vi.fn(),
        findByEmail: vi.fn()
      },
      jobs: {
        findBySourceUrl: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: "job-1",
            user_id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Engineer",
            company: "Acme",
            location: "Remote",
            description: "A".repeat(40),
            employment_type: "full-time",
            source_url: "https://example.com/job",
            contact_email: null,
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }),
        create: vi.fn().mockResolvedValue({
          id: "job-1",
          user_id: "550e8400-e29b-41d4-a716-446655440000",
          title: "Engineer",
          company: "Acme",
          location: "Remote",
          description: "A".repeat(40),
          employment_type: "full-time",
          source_url: "https://example.com/job",
          contact_email: null,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }),
        listByUserId: vi.fn().mockResolvedValue([])
      },
      generations: {
        create: vi.fn(),
        listForJob: vi.fn(),
        listByUserId: vi.fn().mockResolvedValue([]),
        listByJobAndUserId: vi.fn().mockResolvedValue([])
      }
    };

    const app = createAppWithCoreRouter(
      createCoreRouter({
        repositories: repos as never,
        generationService: { generate: vi.fn() } as never
      })
    );

    const first = await request(app)
      .post("/api/jobs")
      .set("Authorization", authHeader())
      .send({
        title: "Engineer",
        company: "Acme",
        location: "Remote",
        description: "A".repeat(120),
        employmentType: "full-time",
        sourceUrl: "https://example.com/job"
      });

    expect(first.status).toBe(201);
    expect(first.body.deduplicated).toBe(false);

    const second = await request(app)
      .post("/api/jobs")
      .set("Authorization", authHeader())
      .send({
        title: "Engineer",
        company: "Acme",
        location: "Remote",
        description: "A".repeat(120),
        employmentType: "full-time",
        sourceUrl: "https://example.com/job"
      });

    expect(second.status).toBe(200);
    expect(second.body.deduplicated).toBe(true);
  });

  it("executes generation and stores history", async () => {
    const repos = {
      profiles: {
        upsert: vi.fn().mockResolvedValue({
          id: "550e8400-e29b-41d4-a716-446655440000",
          email: "user@example.com",
          full_name: "Taylor Dev",
          skills: ["React"],
          experience_summary: "A".repeat(100),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }),
        findByEmail: vi.fn().mockResolvedValue(null)
      },
      jobs: {
        findBySourceUrl: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: "job-1",
          user_id: "550e8400-e29b-41d4-a716-446655440000",
          title: "Engineer",
          company: "Acme",
          location: "Remote",
          description: "A".repeat(120),
          employment_type: "full-time",
          source_url: "https://example.com/job",
          contact_email: null,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }),
        listByUserId: vi.fn().mockResolvedValue([])
      },
      generations: {
        create: vi.fn().mockResolvedValue({
          id: "gen-1",
          job_id: "job-1",
          user_id: "550e8400-e29b-41d4-a716-446655440000",
          tone: "formal",
          prompt: "cover-letter-prompt",
          output_text: "B".repeat(180),
          provider: "anthropic",
          model: "claude-test",
          tokens_input: 120,
          tokens_output: 220,
          created_at: new Date().toISOString()
        }),
        listForJob: vi.fn(),
        listByUserId: vi.fn().mockResolvedValue([
          {
            id: "gen-1",
            job_id: "job-1",
            user_id: "550e8400-e29b-41d4-a716-446655440000",
            tone: "formal",
            prompt: "cover-letter-prompt",
            output_text: "B".repeat(180),
            provider: "anthropic",
            model: "claude-test",
            tokens_input: 120,
            tokens_output: 220,
            created_at: new Date().toISOString()
          }
        ]),
        listByJobAndUserId: vi.fn().mockResolvedValue([])
      }
    };

    const generationService = {
      generate: vi.fn().mockResolvedValue({
        content: {
          subjectLine: "Application: Engineer",
          keyHighlights: ["React", "TypeScript"],
          coverLetter: "B".repeat(180)
        },
        rawText: "{}",
        metadata: {
          provider: "anthropic",
          model: "claude-test",
          inputTokens: 120,
          outputTokens: 220,
          stopReason: "end_turn"
        }
      })
    };

    const app = createAppWithCoreRouter(
      createCoreRouter({
        repositories: repos as never,
        generationService: generationService as never
      })
    );

    const generationResponse = await request(app)
      .post("/api/generations")
      .set("Authorization", authHeader())
      .send({
        tone: "formal",
        job: {
          title: "Engineer",
          company: "Acme",
          location: "Remote",
          description: "A".repeat(220),
          employmentType: "full-time",
          sourceUrl: "https://example.com/job"
        },
        applicantProfile: {
          fullName: "Taylor Dev",
          skills: ["React"],
          experienceSummary: "A".repeat(120)
        }
      });

    expect(generationResponse.status).toBe(201);
    expect(generationResponse.body.generation.id).toBe("gen-1");

    const historyResponse = await request(app)
      .get("/api/generations/history?limit=10")
      .set("Authorization", authHeader());

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.generations).toHaveLength(1);
  });

  it("returns 400 for invalid generation request", async () => {
    const repos = {
      profiles: {
        upsert: vi.fn(),
        findByEmail: vi.fn()
      },
      jobs: {
        findBySourceUrl: vi.fn(),
        create: vi.fn(),
        listByUserId: vi.fn()
      },
      generations: {
        create: vi.fn(),
        listForJob: vi.fn(),
        listByUserId: vi.fn().mockResolvedValue([]),
        listByJobAndUserId: vi.fn().mockResolvedValue([])
      }
    };

    const app = createAppWithCoreRouter(
      createCoreRouter({
        repositories: repos as never,
        generationService: { generate: vi.fn() } as never
      })
    );

    const response = await request(app)
      .post("/api/generations")
      .set("Authorization", authHeader())
      .send({
        tone: "formal",
        job: {
          title: "x"
        }
      });

    expect(response.status).toBe(400);
  });
});
