import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OptionsApp } from "../src/entrypoints/options/App";

const { updateProfileMock } = vi.hoisted(() => ({
  updateProfileMock: vi.fn().mockResolvedValue({
    fullName: "Taylor Dev",
    email: "user@example.com",
    skills: ["React", "TypeScript"],
    experienceSummary: "A".repeat(120),
    education: []
  })
}));

vi.mock("../src/lib/storage", () => ({
  getOrCreateIdentity: vi.fn().mockResolvedValue({
    userId: "550e8400-e29b-41d4-a716-446655440000",
    email: "user@example.com"
  }),
  getDraftProfile: vi.fn().mockResolvedValue(null),
  setDraftProfile: vi.fn()
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
  updateProfile: updateProfileMock
}));

describe("OptionsApp", () => {
  it("renders authenticated options tabs", async () => {
    render(<OptionsApp />);

    expect(await screen.findByRole("tab", { name: /Profile/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Resume/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /ATS/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Applications/i })).toBeInTheDocument();
  });
});
