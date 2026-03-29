import { describe, expect, it, vi } from "vitest";

import { OpenRouterApiError, OpenRouterClient } from "../../src/ai/openrouter-client.js";

describe("OpenRouterClient", () => {
  it("returns parsed text and usage from API payload", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: "openrouter/auto",
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: "{\"ok\":true}"
            }
          }
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20 }
      })
    } as Response);

    const client = new OpenRouterClient({
      apiKey: "x",
      model: "openrouter/auto",
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

    const client = new OpenRouterClient({
      apiKey: "x",
      model: "openrouter/auto",
      timeoutMs: 1000,
      fetchFn
    });

    await expect(client.generateJsonCompletion("hello")).rejects.toBeInstanceOf(OpenRouterApiError);

    await expect(client.generateJsonCompletion("hello")).rejects.toMatchObject({ retryable: true });
  });
});