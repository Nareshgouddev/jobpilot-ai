import type { AiGenerationRequest } from "@jobpilot/shared";

import { env } from "../config/env.js";
import { ClaudeApiError, ClaudeClient, type ClaudeMessageResult } from "./claude-client.js";
import type { GeneratedCoverLetter } from "./output-schema.js";
import { buildCoverLetterPrompt } from "./prompt-builder.js";
import { parseGeneratedCoverLetter } from "./response-parser.js";
import { withRetry } from "./retry.js";

export type ClaudeCompletionClient = {
  generateJsonCompletion(prompt: string): Promise<ClaudeMessageResult>;
};

export type GenerationResult = {
  content: GeneratedCoverLetter;
  rawText: string;
  metadata: {
    provider: "anthropic";
    model: string;
    inputTokens: number | null;
    outputTokens: number | null;
    stopReason: string | null;
  };
};

export class CoverLetterGenerationService {
  constructor(
    private readonly client: ClaudeCompletionClient = new ClaudeClient(),
    private readonly retryConfig = {
      retries: env.CLAUDE_MAX_RETRIES,
      baseDelayMs: 250,
      maxDelayMs: 2000
    }
  ) {}

  async generate(input: AiGenerationRequest): Promise<GenerationResult> {
    const prompt = buildCoverLetterPrompt(input);

    const response = await withRetry(
      () => this.client.generateJsonCompletion(prompt),
      {
        retries: this.retryConfig.retries,
        baseDelayMs: this.retryConfig.baseDelayMs,
        maxDelayMs: this.retryConfig.maxDelayMs,
        shouldRetry(error) {
          return error instanceof ClaudeApiError && error.retryable;
        }
      }
    );

    const content = parseGeneratedCoverLetter(response.text);

    return {
      content,
      rawText: response.text,
      metadata: {
        provider: "anthropic",
        model: response.model,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        stopReason: response.stopReason
      }
    };
  }
}
