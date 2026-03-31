import { z } from "zod";

import { atsKeywordExtractionSchema, type AtsKeywordExtraction } from "./ats-output-schema.js";

export class AtsResponseParseError extends Error {
  public readonly causeData?: unknown;

  constructor(message: string, causeData?: unknown) {
    super(message);
    this.name = "AtsResponseParseError";
    this.causeData = causeData;
  }
}

function extractFirstJsonObject(text: string): string {
  const start = text.indexOf("{");

  if (start === -1) {
    throw new AtsResponseParseError("AI response did not contain a JSON object");
  }

  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  throw new AtsResponseParseError("AI response contained incomplete JSON");
}

export function parseKeywordExtraction(rawText: string): AtsKeywordExtraction {
  const jsonText = extractFirstJsonObject(rawText.trim());

  try {
    const json = JSON.parse(jsonText) as unknown;
    return atsKeywordExtractionSchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AtsResponseParseError("AI JSON did not match required schema", error.flatten());
    }

    throw new AtsResponseParseError("AI response JSON parsing failed", error);
  }
}

const atsScoreResponseSchema = z.object({
  matchScore: z.number().min(0).max(100),
  requiredMatchScore: z.number().min(0).max(100),
  preferredMatchScore: z.number().min(0).max(100)
});

export type AtsScoreResponse = z.infer<typeof atsScoreResponseSchema>;

export function parseAtsScoreResponse(rawText: string): AtsScoreResponse {
  const jsonText = extractFirstJsonObject(rawText.trim());

  try {
    const json = JSON.parse(jsonText) as unknown;
    return atsScoreResponseSchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AtsResponseParseError("AI JSON did not match required schema", error.flatten());
    }

    throw new AtsResponseParseError("AI response JSON parsing failed", error);
  }
}
