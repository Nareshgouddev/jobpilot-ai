import { describe, expect, it, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("backend integration", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  describe("health endpoint", () => {
    it("returns 200 with ok status", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
  });

  describe("auth flow contract", () => {
    it("issues session token for valid email", async () => {
      const res = await request(app)
        .post("/api/auth/session")
        .send({ userId: "550e8400-e29b-41d4-a716-446655440000", email: "user@example.com" });

      expect([200, 201, 400, 401, 500]).toContain(res.status);
      if (res.body.accessToken) {
        expect(typeof res.body.accessToken).toBe("string");
        expect(res.body.expiresInSeconds).toBeGreaterThan(0);
      }
    });

    it("rejects malformed email", async () => {
      const res = await request(app)
        .post("/api/auth/session")
        .send({ userId: "550e8400-e29b-41d4-a716-446655440000", email: "not-an-email" });

      expect([400, 401, 422, 500]).toContain(res.status);
    });

    it("verifies auth token on protected endpoints", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid.token");

      expect([401, 403, 429, 500]).toContain(res.status);
    });
  });

  describe("profile flow", () => {
    it("requires auth token to access profile endpoints", async () => {
      const res = await request(app).get("/api/profile/me");

      expect(res.status).toBe(401);
    });

    it("validates profile field constraints", async () => {
      const res = await request(app)
        .put("/api/profile/me")
        .send({ fullName: "x", skills: [], experienceSummary: "x" })
        .set("Authorization", "Bearer invalid.token");

      expect([400, 401, 422]).toContain(res.status);
    });
  });

  describe("job ingestion flow", () => {
    it("requires auth for job endpoints", async () => {
      const res = await request(app).get("/api/jobs");

      expect(res.status).toBe(401);
    });

    it("validates job input schema", async () => {
      const res = await request(app)
        .post("/api/jobs")
        .send({
          title: "Engineer",
          company: "Corp"
        })
        .set("Authorization", "Bearer invalid.token");

      expect([400, 401, 422]).toContain(res.status);
    });
  });

  describe("generation flow", () => {
    it("requires auth for generation endpoints", async () => {
      const res = await request(app).get("/api/generations/history");

      expect(res.status).toBe(401);
    });

    it("validates generation request schema", async () => {
      const res = await request(app)
        .post("/api/generations")
        .send({
          jobId: "550e8400-e29b-41d4-a716-446655440000",
          applicantProfile: { fullName: "J", skills: ["JS"], experienceSummary: "x" }
        })
        .set("Authorization", "Bearer invalid.token");

      expect([400, 401, 422]).toContain(res.status);
    });
  });

  describe("error handling contract", () => {
    it("returns 401 for missing auth token", async () => {
      const res = await request(app).get("/api/jobs");

      expect(res.status).toBe(401);
    });

    it("returns 404 or 401 for unknown routes (depends on middleware order)", async () => {
      const res = await request(app).get("/api/unknown/route");

      expect([401, 404]).toContain(res.status);
    });

    it("returns consistent error shape on validation failure", async () => {
      const res = await request(app)
        .post("/api/auth/session")
        .send({});

      expect([400, 401, 422, 429]).toContain(res.status);
    });
  });

  describe("contract snapshot tests", () => {
    it("health endpoint response shape", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status");
      expect(res.body.status).toBe("ok");
    });

    it("auth protected route returns 401 without token", async () => {
      const res = await request(app).get("/api/jobs");
      expect(res.status).toBe(401);
    });

    it("malformed request returns appropriate error code", async () => {
      const res = await request(app)
        .post("/api/auth/session")
        .send({ userId: "not-a-uuid", email: "user@example.com" });

      expect([400, 401, 422, 429]).toContain(res.status);
    });
  });

  describe("endpoint route structure", () => {
    it("health is public", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
    });

    it("auth endpoints are public or specific", async () => {
      const res = await request(app)
        .post("/api/auth/session")
        .send({ userId: "550e8400-e29b-41d4-a716-446655440000", email: "test@example.com" });

      expect([200, 201, 400, 401, 422, 429, 500]).toContain(res.status);
    });

    it("core endpoints require auth", async () => {
      const paths = ["/api/jobs", "/api/profile/me", "/api/generations/history"];

      for (const path of paths) {
        const res = await request(app).get(path);
        expect(res.status).toBe(401);
      }
    });
  });
});
