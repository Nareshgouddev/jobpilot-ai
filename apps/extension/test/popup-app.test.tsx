import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/storage", () => ({
  getOrCreateIdentity: vi.fn().mockResolvedValue({
    userId: "550e8400-e29b-41d4-a716-446655440000",
    email: "user@example.com"
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
  getProfile: vi.fn().mockResolvedValue({
    fullName: "Taylor Dev",
    email: "user@example.com",
    skills: ["React", "TypeScript"],
    experienceSummary: "A".repeat(120),
    education: []
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
      provider: "openrouter",
      model: "openrouter/auto"
    }
  })
}));

import { PopupApp } from "../src/entrypoints/popup/App";

describe("PopupApp", () => {
  it("renders headline and action buttons", async () => {
    render(<PopupApp />);

    expect(await screen.findByText("Step 1: Capture Job")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Capture Current Job/i })).toBeInTheDocument();
  });

  it("captures a job and shows generation results", async () => {
    render(<PopupApp />);

    fireEvent.click(await screen.findByRole("button", { name: /Capture Current Job/i }));

    await waitFor(() => {
      expect(screen.getByText("Step 2: Generate Draft")).toBeInTheDocument();
    });

    const generateButton = await screen.findByRole("button", { name: /Generate/i });
    await waitFor(() => {
      expect(generateButton).toBeEnabled();
    });

    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText("Step 3: Review & Copy")).toBeInTheDocument();
      expect(screen.getByText("Application: Frontend Engineer")).toBeInTheDocument();
    });
  });
});
