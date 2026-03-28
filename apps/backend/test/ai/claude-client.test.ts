import { describe, expect, it, vi } from "vitest";

import { ClaudeApiError, ClaudeClient } from "../../src/ai/claude-client.js";

describe("ClaudeClient", () => {
  it("returns parsed text and usage from API payload", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: "claude-test",
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 20 },
        content: [{ type: "text", text: "{\"ok\":true}" }]
      })
    } as Response);

    const client = new ClaudeClient({
      apiKey: "x",
      model: "claude-test",
      timeoutMs: 1000,
      fetchFn
    });

    const result = await client.generateJsonCompletion("hello");

    expect(result.text).toContain("ok");
    expect(result.usage.inputTokens).toBe(10);
  });

  it("throws retryable error on 429", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "rate limited"
    } as Response);

    const client = new ClaudeClient({
      apiKey: "x",
      model: "claude-test",
      timeoutMs: 1000,
      fetchFn
    });

    await expect(client.generateJsonCompletion("hello")).rejects.toBeInstanceOf(ClaudeApiError);

    await expect(client.generateJsonCompletion("hello")).rejects.toMatchObject({ retryable: true });
  });
});
