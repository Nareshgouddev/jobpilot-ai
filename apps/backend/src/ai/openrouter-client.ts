import { env } from "../config/env.js";

export type OpenRouterMessageResult = {
  text: string;
  model: string;
  stopReason: string | null;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
  };
};

export class OpenRouterApiError extends Error {
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly causeData?: unknown;

  constructor(message: string, statusCode: number, retryable: boolean, causeData?: unknown) {
    super(message);
    this.name = "OpenRouterApiError";
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.causeData = causeData;
  }
}

export type OpenRouterClientOptions = {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
};

function isRetryableStatus(statusCode: number): boolean {
  return statusCode === 408 || statusCode === 409 || statusCode === 425 || statusCode === 429 || statusCode >= 500;
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (
          typeof item === "object" &&
          item !== null &&
          "type" in item &&
          (item as { type?: unknown }).type === "text" &&
          "text" in item &&
          typeof (item as { text?: unknown }).text === "string"
        ) {
          return (item as { text: string }).text;
        }

        return "";
      })
      .join("\n");
  }

  return "";
}

export class OpenRouterClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(options: OpenRouterClientOptions = {}) {
    this.apiKey = options.apiKey ?? env.OPENROUTER_API_KEY;
    this.model = options.model ?? env.OPENROUTER_MODEL;
    this.timeoutMs = options.timeoutMs ?? env.OPENROUTER_TIMEOUT_MS;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async generateJsonCompletion(prompt: string): Promise<OpenRouterMessageResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          max_tokens: 1200,
          messages: [{ role: "user", content: prompt }]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new OpenRouterApiError(
          `OpenRouter API request failed with status ${response.status}`,
          response.status,
          isRetryableStatus(response.status),
          bodyText
        );
      }

      const payload = (await response.json()) as {
        model?: string;
        choices?: Array<{
          finish_reason?: string | null;
          message?: {
            content?: unknown;
          };
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
        };
      };

      const choice = payload.choices?.[0];
      const text = extractTextContent(choice?.message?.content).trim();

      if (!text) {
        throw new OpenRouterApiError("OpenRouter API returned an empty text response", 502, true, payload);
      }

      return {
        text,
        model: payload.model ?? this.model,
        stopReason: choice?.finish_reason ?? null,
        usage: {
          inputTokens: payload.usage?.prompt_tokens ?? null,
          outputTokens: payload.usage?.completion_tokens ?? null
        }
      };
    } catch (error) {
      if (error instanceof OpenRouterApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new OpenRouterApiError("OpenRouter API request timed out", 408, true);
      }

      throw new OpenRouterApiError("OpenRouter API request failed", 500, true, error);
    } finally {
      clearTimeout(timeout);
    }
  }
}