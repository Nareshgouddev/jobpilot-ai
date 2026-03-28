import type { CapturedJob } from "../types/messages";

function textFromSelector(selector: string): string | null {
  const node = document.querySelector(selector);
  const text = node?.textContent?.trim();

  return text && text.length > 0 ? text : null;
}

export function scrapeJobFromPage(): CapturedJob {
  const title =
    textFromSelector("h1") ?? textFromSelector("[data-testid='job-title']") ?? document.title ?? "Untitled Role";

  const company =
    textFromSelector("[data-testid='company-name']") ??
    textFromSelector("[class*='company']") ??
    "Unknown Company";

  const location =
    textFromSelector("[data-testid='job-location']") ?? textFromSelector("[class*='location']") ?? "Unspecified";

  const description =
    textFromSelector("[data-testid='job-description']") ??
    textFromSelector("main") ??
    "No job description available from this page.";

  return {
    title,
    company,
    location,
    description,
    sourceUrl: window.location.href
  };
}
