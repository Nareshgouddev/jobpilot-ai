import type { CapturedJob } from "../types/messages";

type ExtractedJob = {
  title: string | undefined;
  company: string | undefined;
  location: string | undefined;
  description: string | undefined;
};

function textFromSelector(selector: string): string | null {
  const node = document.querySelector(selector);
  const text = node?.textContent?.trim();

  return text && text.length > 0 ? text : null;
}

function textFromSelectors(selectors: string[]): string | null {
  for (const selector of selectors) {
    const value = textFromSelector(selector);
    if (value) {
      return value;
    }
  }

  return null;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function trimLength(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function extractLinkedInJob(): ExtractedJob {
  return {
    title: textFromSelectors([".job-details-jobs-unified-top-card__job-title h1", ".top-card-layout__title"]) ?? undefined,
    company:
      textFromSelectors([".job-details-jobs-unified-top-card__company-name a", ".topcard__org-name-link"]) ??
      undefined,
    location: textFromSelectors([".job-details-jobs-unified-top-card__bullet", ".topcard__flavor--bullet"]) ?? undefined,
    description: textFromSelectors([".jobs-description__content", ".description__text"]) ?? undefined
  };
}

function extractGreenhouseJob(): ExtractedJob {
  return {
    title: textFromSelectors(["h1.app-title", "h1"]) ?? undefined,
    company: textFromSelectors(["#logo span", ".company-name"]) ?? undefined,
    location: textFromSelectors([".location", ".opening .location"]) ?? undefined,
    description: textFromSelectors(["#content", "#job", "main"]) ?? undefined
  };
}

function extractLeverJob(): ExtractedJob {
  return {
    title: textFromSelectors([".posting-headline h2", ".posting-headline h1", "h1"]) ?? undefined,
    company: textFromSelectors([".posting-categories .sort-by-team", ".main-header-logo"]) ?? undefined,
    location: textFromSelectors([".posting-categories .sort-by-location", ".location"]) ?? undefined,
    description: textFromSelectors([".posting-description", ".content", "main"]) ?? undefined
  };
}

function extractGenericJob(): ExtractedJob {
  return {
    title: textFromSelectors(["h1", "[data-testid='job-title']"]) ?? undefined,
    company: textFromSelectors(["[data-testid='company-name']", "[class*='company']"]) ?? undefined,
    location: textFromSelectors(["[data-testid='job-location']", "[class*='location']"]) ?? undefined,
    description: textFromSelectors(["[data-testid='job-description']", "main", "article"]) ?? undefined
  };
}

export function scrapeJobFromPage(): CapturedJob {
  const hostname = window.location.hostname;
  const source = hostname.includes("linkedin.com")
    ? extractLinkedInJob()
    : hostname.includes("greenhouse.io")
      ? extractGreenhouseJob()
      : hostname.includes("lever.co")
        ? extractLeverJob()
        : extractGenericJob();

  const rawTitle = source.title && source.title.length > 0 ? source.title : document.title;
  const title = trimLength(normalizeWhitespace(rawTitle && rawTitle.length > 0 ? rawTitle : "Untitled Role"), 120);
  const company = trimLength(normalizeWhitespace(source.company ?? "Unknown Company"), 120);
  const location = trimLength(normalizeWhitespace(source.location ?? "Unspecified"), 120);
  const description = trimLength(
    normalizeWhitespace(source.description ?? "No job description available from this page."),
    12000
  );

  return {
    title,
    company,
    location,
    description,
    sourceUrl: window.location.href
  };
}
