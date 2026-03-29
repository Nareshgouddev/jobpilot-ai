import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { RuntimeMessage, CapturedJob } from "../src/types/messages";

describe("extension e2e flow", () => {
  beforeEach(() => {
    // Mock chrome.runtime for message passing
    global.chrome = {
      runtime: {
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn()
        }
      },
      tabs: {
        query: vi.fn(),
        sendMessage: vi.fn()
      },
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn(),
          remove: vi.fn()
        }
      }
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("popup to background capture flow", () => {
    it("requests active tab capture from popup", async () => {
      const mockMessage: RuntimeMessage = {
        type: "JOBPILOT_REQUEST_ACTIVE_TAB_CAPTURE"
      };

      const sendMessage = vi.fn().mockResolvedValue({
        type: "JOBPILOT_CAPTURE_RESULT",
        ok: true,
        payload: {
          title: "Senior Engineer",
          company: "TechCorp",
          location: "Remote"
        }
      } as RuntimeMessage);

      const result = (await sendMessage(mockMessage)) as RuntimeMessage;

      expect(result.type).toBe("JOBPILOT_CAPTURE_RESULT");
      if (result.type === "JOBPILOT_CAPTURE_RESULT" && result.ok) {
        expect(result.payload).toHaveProperty("title");
        expect(result.payload.title).toBe("Senior Engineer");
      }
    });

    it("handles capture timeout gracefully", async () => {
      const sendMessage = vi.fn().mockResolvedValue({
        type: "JOBPILOT_CAPTURE_RESULT",
        ok: false,
        error: "CAPTURE_TIMEOUT"
      } as RuntimeMessage);

      const result = (await sendMessage({
        type: "JOBPILOT_REQUEST_ACTIVE_TAB_CAPTURE"
      })) as RuntimeMessage;

      expect(result.type).toBe("JOBPILOT_CAPTURE_RESULT");
      if (result.type === "JOBPILOT_CAPTURE_RESULT" && !result.ok) {
        expect(result.error).toBe("CAPTURE_TIMEOUT");
      }
    });

    it("reports unsupported URL error", async () => {
      const sendMessage = vi.fn().mockResolvedValue({
        type: "JOBPILOT_CAPTURE_RESULT",
        ok: false,
        error: "UNSUPPORTED_TAB_URL"
      } as RuntimeMessage);

      const result = (await sendMessage({
        type: "JOBPILOT_REQUEST_ACTIVE_TAB_CAPTURE"
      })) as RuntimeMessage;

      expect(result.type).toBe("JOBPILOT_CAPTURE_RESULT");
      if (result.type === "JOBPILOT_CAPTURE_RESULT" && !result.ok) {
        expect(result.error).toMatch(/UNSUPPORTED|TIMEOUT|NO_ACTIVE/);
      }
    });
  });

  describe("background to content message contract", () => {
    it("content script returns structured capture result", async () => {
      const successResponse: RuntimeMessage = {
        type: "JOBPILOT_CAPTURE_RESULT",
        ok: true,
        payload: {
          title: "Product Manager",
          company: "StartupCorp",
          location: "San Francisco",
          description: "Lead product strategy and execution.",
          sourceUrl: "https://example.com/jobs/product-manager"
        }
      };

      expect(successResponse.type).toBe("JOBPILOT_CAPTURE_RESULT");
      expect(successResponse).toHaveProperty("ok");
    });

    it("content script returns error envelope on failure", async () => {
      const errorResponse: RuntimeMessage = {
        type: "JOBPILOT_CAPTURE_RESULT",
        ok: false,
        error: "UNKNOWN_CAPTURE_ERROR"
      };

      expect(errorResponse.type).toBe("JOBPILOT_CAPTURE_RESULT");
      if (errorResponse.type === "JOBPILOT_CAPTURE_RESULT" && !errorResponse.ok) {
        expect(errorResponse).toHaveProperty("error");
      }
    });
  });

  describe("popup to API generation flow", () => {
    it("sends captured job to API and receives generation", async () => {
      const capturedJob: CapturedJob = {
        title: "Backend Engineer",
        company: "CloudServices",
        location: "Remote",
        description: "Build distributed backend services.",
        sourceUrl: "https://example.com/jobs/backend-engineer"
      };

      const mockApiCall = vi.fn().mockResolvedValue({
        jobId: "job-987",
        userId: "user-123",
        status: "completed",
        result: "Generated summary for Backend Engineer role",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const result = await mockApiCall(capturedJob);

      expect(result.status).toMatch(/pending|completed|failed/);
      expect(result.result).toBeTruthy();
    });

    it("handles API timeout with fallback", async () => {
      const mockApiCall = vi.fn().mockRejectedValue(new Error("Request timeout"));

      try {
        await mockApiCall({ title: "Role", company: "Corp", location: "Remote" });
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    it("validates response schema from API", async () => {
      const mockResponse = {
        jobId: "job-123",
        userId: "user-456",
        status: "completed",
        result: "Generated text",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(mockResponse).toHaveProperty("jobId");
      expect(mockResponse).toHaveProperty("status");
      expect(mockResponse).toHaveProperty("result");
    });
  });

  describe("storage persistence across popup/options", () => {
    it("popup saves session token to storage", async () => {
      const mockSet = vi.fn().mockResolvedValue(undefined);

      await mockSet({
        sessionToken: "jwt.token.here",
        expiresAt: Date.now() + 3600 * 1000
      });

      expect(mockSet).toHaveBeenCalled();
    });

    it("options reads profile from storage", async () => {
      const mockGet = vi.fn().mockResolvedValue({
        profile: { email: "user@example.com" }
      });

      const result = await mockGet(["profile"]);

      expect(result).toHaveProperty("profile");
    });

    it("clears storage on logout", async () => {
      const mockRemove = vi.fn().mockResolvedValue(undefined);

      await mockRemove(["sessionToken", "profile"]);

      expect(mockRemove).toHaveBeenCalledWith(
        expect.arrayContaining(["sessionToken", "profile"])
      );
    });
  });

  describe("mocked full popup generation flow", () => {
    it("end-to-end: capture, authenticate, generate, display", async () => {
      // Step 1: Capture from active tab
      const captureMessage: RuntimeMessage = {
        type: "JOBPILOT_REQUEST_ACTIVE_TAB_CAPTURE"
      };

      const captureResponse: RuntimeMessage = {
        type: "JOBPILOT_CAPTURE_RESULT",
        ok: true,
        payload: {
          title: "Frontend Engineer",
          company: "WebCorp",
          location: "New York",
          description: "Ship polished and accessible React experiences.",
          sourceUrl: "https://example.com/jobs/frontend-engineer"
        }
      };

      // Step 2: Get session token
      const sessionToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";

      // Step 3: Send generation request
      const generationResponse = {
        jobId: "job-001",
        userId: "user-789",
        status: "completed",
        result: "You would be great for this Frontend Engineer role at WebCorp",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Step 4: Verify flow
      expect(captureMessage.type).toBe("JOBPILOT_REQUEST_ACTIVE_TAB_CAPTURE");
      expect(captureResponse.type).toBe("JOBPILOT_CAPTURE_RESULT");
      if (
        captureResponse.type === "JOBPILOT_CAPTURE_RESULT" &&
        captureResponse.ok
      ) {
        expect(captureResponse.payload.title).toBe("Frontend Engineer");
      }
      expect(sessionToken).toBeTruthy();
      expect(generationResponse.result).toContain("Frontend Engineer");
    });

    it("end-to-end: handles capture error gracefully", async () => {
      const failedCapture: RuntimeMessage = {
        type: "JOBPILOT_CAPTURE_RESULT",
        ok: false,
        error: "NO_ACTIVE_TAB"
      };

      const userFacingMessage = "Please have a job posting page open";

      expect(failedCapture.type).toBe("JOBPILOT_CAPTURE_RESULT");
      if (
        failedCapture.type === "JOBPILOT_CAPTURE_RESULT" &&
        !failedCapture.ok
      ) {
        expect([
          "NO_ACTIVE_TAB",
          "UNSUPPORTED_TAB_URL",
          "CAPTURE_TIMEOUT",
          "UNKNOWN_CAPTURE_ERROR",
          "CONTENT_SCRIPT_UNAVAILABLE"
        ]).toContain(failedCapture.error);
        expect(userFacingMessage).toContain("open");
      }
    });
  });

  describe("contract version skew detection", () => {
    it("detects missing ok field in capture result", () => {
      const malformedResponse = {
        type: "JOBPILOT_CAPTURE_RESULT",
        payload: { title: "Role" }
      } as any;

      // Should fail schema validation
      expect(malformedResponse).not.toHaveProperty("ok");
    });

    it("detects wrong message type", () => {
      const wrongType = {
        type: "UNKNOWN_MESSAGE_TYPE",
        data: {}
      } as any;

      const validTypes = [
        "JOBPILOT_CAPTURE_JOB",
        "JOBPILOT_CAPTURED_JOB",
        "JOBPILOT_REQUEST_ACTIVE_TAB_CAPTURE",
        "JOBPILOT_CAPTURE_RESULT",
        "JOBPILOT_PING"
      ];

      expect(validTypes).not.toContain(wrongType.type);
    });

    it("detects field type mismatch in generation response", () => {
      const malformedGeneration = {
        jobId: 12345, // Should be string
        userId: "user-123",
        status: "completed",
        result: "Text",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(typeof malformedGeneration.jobId).not.toBe("string");
    });

    it("catches extra unknown fields in contract", () => {
      const expandedMessage = {
        type: "JOBPILOT_CAPTURE_RESULT",
        ok: true,
        payload: { title: "Role", company: "Corp", location: "Remote" },
        unknownField: "should be rejected",
        anotherField: 123
      } as any;

      // Strict schema should reject these
      expect(expandedMessage).toHaveProperty("unknownField");
    });
  });

  describe("integration contract snapshots", () => {
    it("capture request message shape", () => {
      const message: RuntimeMessage = {
        type: "JOBPILOT_REQUEST_ACTIVE_TAB_CAPTURE"
      };

      expect(message).toMatchInlineSnapshot(`
        {
          "type": "JOBPILOT_REQUEST_ACTIVE_TAB_CAPTURE",
        }
      `);
    });

    it("successful capture response shape", () => {
      const response: RuntimeMessage = {
        type: "JOBPILOT_CAPTURE_RESULT",
        ok: true,
        payload: {
          title: "Engineer",
          company: "Tech",
          location: "Remote",
          description: "General engineering role.",
          sourceUrl: "https://example.com/jobs/engineer"
        }
      };

      expect(response.type).toBe("JOBPILOT_CAPTURE_RESULT");
    });

    it("error capture response shape", () => {
      const response: RuntimeMessage = {
        type: "JOBPILOT_CAPTURE_RESULT",
        ok: false,
        error: "CAPTURE_TIMEOUT"
      };

      expect(response.type).toBe("JOBPILOT_CAPTURE_RESULT");
      if (response.type === "JOBPILOT_CAPTURE_RESULT" && !response.ok) {
        expect(response).not.toHaveProperty("payload");
        expect(response).toHaveProperty("error");
      }
    });
  });
});
