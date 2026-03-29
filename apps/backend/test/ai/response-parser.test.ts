import { describe, expect, it } from "vitest";

import { AiResponseParseError, parseGeneratedCoverLetter } from "../../src/ai/response-parser.js";

describe("parseGeneratedCoverLetter", () => {
  it("parses valid json from plain response", () => {
    const result = parseGeneratedCoverLetter(
      JSON.stringify({
        subjectLine: "Application for Frontend Engineer",
        keyHighlights: ["Built scalable React apps", "Improved performance by 40%"],
        coverLetter: "C".repeat(180)
      })
    );

    expect(result.subjectLine).toContain("Frontend Engineer");
  });

  it("extracts json when response contains extra text", () => {
    const result = parseGeneratedCoverLetter(
      [
        "Here is your draft:",
        JSON.stringify({
          subjectLine: "Application for Product Engineer",
          keyHighlights: ["Strong TS skills", "Shipped AI workflows"],
          coverLetter: "D".repeat(170)
        }),
        "End"
      ].join("\n")
    );

    expect(result.keyHighlights).toHaveLength(2);
  });

  it("throws on invalid schema", () => {
    expect(() =>
      parseGeneratedCoverLetter(
        JSON.stringify({
          subjectLine: "No",
          keyHighlights: ["Only one"],
          coverLetter: "tiny"
        })
      )
    ).toThrowError(AiResponseParseError);
  });
});
