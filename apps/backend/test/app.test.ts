import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createApp } from "../src/app.js";
import { errorHandler } from "../src/middleware/error-handler.js";

describe("createApp", () => {
  it("returns health payload", async () => {
    const app = createApp();

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.service).toBe("jobpilot-backend");
    expect(typeof response.body.timestamp).toBe("string");
  });

  it("returns 404 payload for unknown routes", async () => {
    const app = createApp();

    const response = await request(app).get("/api/not-real");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("HTTP_ERROR");
  });

  it("maps zod errors to validation responses", async () => {
    const app = express();

    app.get("/zod-error", () => {
      z.object({ name: z.string().min(3) }).parse({ name: "x" });
    });

    app.use(errorHandler);

    const response = await request(app).get("/zod-error");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
