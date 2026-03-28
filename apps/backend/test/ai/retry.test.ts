import { describe, expect, it, vi } from "vitest";

import { withRetry } from "../../src/ai/retry.js";

describe("withRetry", () => {
  it("retries retryable failures and succeeds", async () => {
    const op = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce("ok");

    const result = await withRetry(op, {
      retries: 2,
      baseDelayMs: 1,
      maxDelayMs: 5,
      shouldRetry: () => true
    });

    expect(result).toBe("ok");
    expect(op).toHaveBeenCalledTimes(2);
  });

  it("fails immediately for non-retryable errors", async () => {
    const op = vi.fn<() => Promise<string>>().mockRejectedValue(new Error("fatal"));

    await expect(
      withRetry(op, {
        retries: 3,
        baseDelayMs: 1,
        maxDelayMs: 5,
        shouldRetry: () => false
      })
    ).rejects.toThrow("fatal");

    expect(op).toHaveBeenCalledTimes(1);
  });
});
