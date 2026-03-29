import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OptionsApp } from "../src/entrypoints/options/App";

vi.mock("../src/lib/storage", () => ({
  getDraftProfile: vi.fn().mockResolvedValue({
    email: "user@example.com",
    fullName: "Taylor Dev",
    skills: ["React", "TypeScript"],
    experienceSummary: "A".repeat(120)
  }),
  setDraftProfile: vi.fn()
}));

describe("OptionsApp", () => {
  it("loads stored profile and saves updates", async () => {
    const storage = await import("../src/lib/storage");

    render(<OptionsApp />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("user@example.com")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "new@example.com" }
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));

    await waitFor(() => {
      expect(storage.setDraftProfile).toHaveBeenCalled();
    });
  });
});
