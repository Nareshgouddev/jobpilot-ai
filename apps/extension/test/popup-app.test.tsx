import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/storage", () => ({
  getDraftProfile: vi.fn().mockResolvedValue({
    email: "user@example.com",
    fullName: "Taylor Dev",
    skills: ["React", "TypeScript"],
    experienceSummary: "A".repeat(100)
  }),
  getOrCreateIdentity: vi.fn().mockResolvedValue({
    userId: "550e8400-e29b-41d4-a716-446655440000"
  })
}));

vi.mock("../src/lib/runtime", () => ({
  requestCapturedJobFromActiveTab: vi.fn().mockResolvedValue({
    title: "Frontend Engineer",
    company: "Acme",
    location: "Remote",
    description: "B".repeat(220),
    sourceUrl: "https://example.com/job"
  })
}));

vi.mock("../src/lib/api", () => ({
  issueSessionToken: vi.fn().mockResolvedValue({
    accessToken: "token-value-1234567890",
    tokenType: "Bearer",
    expiresInSeconds: 900,
    issuedAt: new Date().toISOString()
  }),
  generateDraft: vi.fn().mockResolvedValue({
    generation: {
      id: "gen-1",
      createdAt: new Date().toISOString()
    },
    output: {
      subjectLine: "Application: Frontend Engineer",
      keyHighlights: ["React leadership", "Performance focus"],
      coverLetter: "C".repeat(160)
    },
    metadata: {
      provider: "anthropic",
      model: "claude-test"
    }
  })
}));

import { PopupApp } from "../src/entrypoints/popup/App";

describe("PopupApp", () => {
  it("renders headline and action buttons", () => {
    render(<PopupApp />);

    expect(screen.getByText("Application Copilot")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Capture Job" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Draft" })).toBeInTheDocument();
  });

  it("captures a job and shows generation results", async () => {
    render(<PopupApp />);

    fireEvent.click(screen.getByRole("button", { name: "Capture Job" }));

    await waitFor(() => {
      expect(screen.getByText(/Frontend Engineer at Acme/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Generated Draft")).toBeInTheDocument();
      expect(screen.getByText("Application: Frontend Engineer")).toBeInTheDocument();
    });
  });
});
