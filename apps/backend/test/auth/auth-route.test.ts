import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";

describe("auth route", () => {
  it("issues a session token with valid extension secret", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/auth/session")
      .set("x-extension-key", process.env.EXTENSION_SHARED_SECRET ?? "")
      .send({
        userId: "550e8400-e29b-41d4-a716-446655440000",
        email: "user@example.com"
      });

    expect(response.status).toBe(201);
    expect(response.body.tokenType).toBe("Bearer");
    expect(typeof response.body.accessToken).toBe("string");
  });

  it("rejects session issue with invalid extension key", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/auth/session")
      .set("x-extension-key", "invalid")
      .send({
        userId: "550e8400-e29b-41d4-a716-446655440000",
        email: "user@example.com"
      });

    expect(response.status).toBe(401);
  });

  it("returns auth identity for bearer token", async () => {
    const app = createApp();

    const session = await request(app)
      .post("/api/auth/session")
      .set("x-extension-key", process.env.EXTENSION_SHARED_SECRET ?? "")
      .send({
        userId: "550e8400-e29b-41d4-a716-446655440000",
        email: "user@example.com"
      });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${session.body.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.userId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(response.body.email).toBe("user@example.com");
  });

  it("rejects protected endpoint without bearer token", async () => {
    const app = createApp();

    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
  });
});
