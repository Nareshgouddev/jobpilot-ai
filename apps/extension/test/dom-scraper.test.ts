import { describe, expect, it } from "vitest";

import { scrapeJobFromPage } from "../src/lib/dom-scraper";

describe("dom scraper", () => {
  it("extracts generic page fields", () => {
    document.body.innerHTML = `
      <main>
        <h1>Senior Frontend Engineer</h1>
        <div class="company">Acme Corp</div>
        <div class="location">Remote</div>
        <article>Build scalable UIs and collaborate across teams.</article>
      </main>
    `;

    const result = scrapeJobFromPage();

    expect(result.title).toContain("Senior Frontend Engineer");
    expect(result.company).toContain("Acme Corp");
    expect(result.location).toContain("Remote");
    expect(result.description).toContain("Build scalable UIs");
  });

  it("falls back to defaults when fields are absent", () => {
    document.body.innerHTML = "<div>No structured content</div>";

    const result = scrapeJobFromPage();

    expect(result.title).toBe("Untitled Role");
    expect(result.company).toBe("Unknown Company");
    expect(result.location).toBe("Unspecified");
  });
});
