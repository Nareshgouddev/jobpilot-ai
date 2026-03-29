import { describe, expect, it } from "vitest";

import { isCapturableUrl, toErrorResponse } from "../src/lib/capture-guards";

describe("capture guards", () => {
  it("allows only http and https URLs", () => {
    expect(isCapturableUrl("https://example.com/jobs/1")).toBe(true);
    expect(isCapturableUrl("http://localhost:3000/job")).toBe(true);
    expect(isCapturableUrl("chrome://extensions")).toBe(false);
    expect(isCapturableUrl("about:blank")).toBe(false);
    expect(isCapturableUrl(undefined)).toBe(false);
  });

  it("returns structured error runtime message", () => {
    const message = toErrorResponse("NO_ACTIVE_TAB");

    expect(message.type).toBe("JOBPILOT_CAPTURE_RESULT");
    if (message.type === "JOBPILOT_CAPTURE_RESULT") {
      expect(message.ok).toBe(false);
      if (!message.ok) {
        expect(message.error).toBe("NO_ACTIVE_TAB");
      }
    }
  });
});
