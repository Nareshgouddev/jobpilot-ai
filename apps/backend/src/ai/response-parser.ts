import { ZodError } from "zod";

import { generatedCoverLetterSchema, type GeneratedCoverLetter } from "./output-schema.js";

export class AiResponseParseError extends Error {
  public readonly causeData?: unknown;

  constructor(message: string, causeData?: unknown) {
    super(message);
    this.name = "AiResponseParseError";
    this.causeData = causeData;
  }
}

function extractFirstJsonObject(text: string): string {
  const start = text.indexOf("{");

  if (start === -1) {
    throw new AiResponseParseError("AI response did not contain a JSON object");
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

  throw new AiResponseParseError("AI response contained incomplete JSON");
}

export function parseGeneratedCoverLetter(rawText: string): GeneratedCoverLetter {
  const jsonText = extractFirstJsonObject(rawText.trim());

  try {
    const json = JSON.parse(jsonText) as unknown;
    return generatedCoverLetterSchema.parse(json);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AiResponseParseError("AI JSON did not match required schema", error.flatten());
    }

    throw new AiResponseParseError("AI response JSON parsing failed", error);
  }
}
