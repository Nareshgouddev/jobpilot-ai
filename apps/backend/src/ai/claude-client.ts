import { env } from "../config/env.js";

export type ClaudeMessageResult = {
  text: string;
  model: string;
  stopReason: string | null;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
  };
};

export class ClaudeApiError extends Error {
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly causeData?: unknown;

  constructor(message: string, statusCode: number, retryable: boolean, causeData?: unknown) {
    super(message);
    this.name = "ClaudeApiError";
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.causeData = causeData;
  }
}

export type ClaudeClientOptions = {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
};

function isRetryableStatus(statusCode: number): boolean {
  return statusCode === 408 || statusCode === 409 || statusCode === 425 || statusCode === 429 || statusCode >= 500;
}

export class ClaudeClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(options: ClaudeClientOptions = {}) {
    this.apiKey = options.apiKey ?? env.CLAUDE_API_KEY;
    this.model = options.model ?? env.CLAUDE_MODEL;
    this.timeoutMs = options.timeoutMs ?? env.CLAUDE_TIMEOUT_MS;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async generateJsonCompletion(prompt: string): Promise<ClaudeMessageResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1200,
          temperature: 0.2,
          messages: [{ role: "user", content: prompt }]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new ClaudeApiError(
          `Claude API request failed with status ${response.status}`,
          response.status,
          isRetryableStatus(response.status),
          bodyText
        );
      }

      const payload = (await response.json()) as {
        model?: string;
        stop_reason?: string | null;
        usage?: { input_tokens?: number; output_tokens?: number };
        content?: Array<{ type?: string; text?: string }>;
      };

      const text = (payload.content ?? [])
        .filter((item) => item.type === "text" && typeof item.text === "string")
        .map((item) => item.text)
        .join("\n")
        .trim();

      if (!text) {
        throw new ClaudeApiError("Claude API returned an empty text response", 502, true, payload);
      }

      return {
        text,
        model: payload.model ?? this.model,
        stopReason: payload.stop_reason ?? null,
        usage: {
          inputTokens: payload.usage?.input_tokens ?? null,
          outputTokens: payload.usage?.output_tokens ?? null
        }
      };
    } catch (error) {
      if (error instanceof ClaudeApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ClaudeApiError("Claude API request timed out", 408, true);
      }

      throw new ClaudeApiError("Claude API request failed", 500, true, error);
    } finally {
      clearTimeout(timeout);
    }
  }
}
