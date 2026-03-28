import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PopupApp } from "../src/entrypoints/popup/App";

describe("PopupApp", () => {
  it("renders headline and action buttons", () => {
    render(<PopupApp />);

    expect(screen.getByText("Application Copilot")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Capture Job" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Draft" })).toBeInTheDocument();
  });
});
