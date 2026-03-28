import { describe, expect, it } from "vitest";

import { issueAccessToken, verifyAccessToken } from "../../src/auth/token.js";

describe("token auth", () => {
  it("issues and verifies an access token", () => {
    const issued = issueAccessToken({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      email: "user@example.com"
    });

    const claims = verifyAccessToken(issued.accessToken);

    expect(claims.sub).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(claims.email).toBe("user@example.com");
    expect(claims.role).toBe("user");
  });

  it("fails when token is invalid", () => {
    expect(() => verifyAccessToken("not-a-token")).toThrowError();
  });
});
