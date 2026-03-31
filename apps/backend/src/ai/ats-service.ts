import { z } from "zod";

import { atsScoreSchema } from "@jobpilot/shared";
import type { AtsKeywordExtraction } from "./ats-output-schema.js";
import { OpenRouterApiError, OpenRouterClient, type OpenRouterMessageResult } from "./openrouter-client.js";
import { env } from "../config/env.js";
import { buildAtsKeywordExtractionPrompt, buildAtsScoringPrompt } from "./ats-prompt-builder.js";
import { parseKeywordExtraction, parseAtsScoreResponse } from "./ats-response-parser.js";
import { withRetry } from "./retry.js";

export type AtsCompletionClient = {
  generateJsonCompletion(prompt: string): Promise<OpenRouterMessageResult>;
};

const WEIGHTS = {
  required: 0.40,
  preferred: 0.25,
  soft: 0.20,
  domain: 0.15
} as const;

export type CandidateProfileForAts = {
  fullName: string;
  skills: string[];
  experienceSummary: string;
  certifications?: string[];
  education?: Array<{
    institution: string;
    degree: string;
    fieldOfStudy?: string;
    startYear?: string;
    endYear?: string;
    gpa?: string;
  }>;
  resumeText?: string;
};

export type AtsScoreResult = {
  overallScore: number;
  requiredSkillsScore: number;
  preferredSkillsScore: number;
  softSkillsScore: number;
  domainTermsScore: number;
  matchedRequiredSkills: string[];
  unmatchedRequiredSkills: string[];
  matchedPreferredSkills: string[];
  unmatchedPreferredSkills: string[];
  matchedSoftSkills: string[];
  matchedDomainTerms: string[];
  analyzedAt: string;
};

export class AtsService {
  constructor(
    private readonly client: AtsCompletionClient = new OpenRouterClient(),
    private readonly retryConfig = {
      retries: env.OPENROUTER_MAX_RETRIES,
      baseDelayMs: 250,
      maxDelayMs: 2000
    }
  ) {}

  private async aiCompletion(prompt: string): Promise<OpenRouterMessageResult> {
    return withRetry(
      () => this.client.generateJsonCompletion(prompt),
      {
        retries: this.retryConfig.retries,
        baseDelayMs: this.retryConfig.baseDelayMs,
        maxDelayMs: this.retryConfig.maxDelayMs,
        shouldRetry(error) {
          return error instanceof OpenRouterApiError && error.retryable;
        }
      }
    );
  }

  async extractKeywords(jobDescription: string): Promise<AtsKeywordExtraction> {
    const prompt = buildAtsKeywordExtractionPrompt(jobDescription);
    const response = await this.aiCompletion(prompt);
    return parseKeywordExtraction(response.text);
  }

  private computeKeywordMatchScore(
    keywords: string[],
    searchableText: string
  ): { matched: string[]; unmatched: string[]; score: number } {
    const lowerSearchable = searchableText.toLowerCase();
    const matched = keywords.filter((kw) => lowerSearchable.includes(kw.toLowerCase()));
    const unmatched = keywords.filter((kw) => !lowerSearchable.includes(kw.toLowerCase()));
    const score = keywords.length > 0 ? Math.round((matched.length / keywords.length) * 100) : 0;

    return { matched, unmatched, score };
  }

  computeScore(profile: CandidateProfileForAts, jobDescription: string): AtsScoreResult {
    // Build searchable text from profile
    const searchableText = [
      profile.skills.join(" "),
      profile.experienceSummary,
      profile.certifications?.join(" ") ?? "",
      profile.education?.map((e) => `${e.degree} ${e.fieldOfStudy ?? ""}`).join(" ") ?? "",
      profile.resumeText ?? ""
    ].join(" ").toLowerCase();

    // Extract keywords using fallback synchronous method
    const keywords = this.extractKeywordsSync(jobDescription);

    const requiredResult = this.computeKeywordMatchScore(keywords.requiredSkills, searchableText);
    const preferredResult = this.computeKeywordMatchScore(keywords.preferredSkills, searchableText);
    const softResult = this.computeKeywordMatchScore(keywords.softSkills, searchableText);
    const domainResult = this.computeKeywordMatchScore(keywords.domainTerms, searchableText);

    const overallScore = Math.round(
      requiredResult.score * WEIGHTS.required +
        preferredResult.score * WEIGHTS.preferred +
        softResult.score * WEIGHTS.soft +
        domainResult.score * WEIGHTS.domain
    );

    return atsScoreSchema.parse({
      overallScore,
      requiredSkillsScore: requiredResult.score,
      preferredSkillsScore: preferredResult.score,
      softSkillsScore: softResult.score,
      domainTermsScore: domainResult.score,
      matchedRequiredSkills: requiredResult.matched,
      unmatchedRequiredSkills: requiredResult.unmatched,
      matchedPreferredSkills: preferredResult.matched,
      unmatchedPreferredSkills: preferredResult.unmatched,
      matchedSoftSkills: softResult.matched,
      matchedDomainTerms: domainResult.matched,
      analyzedAt: new Date().toISOString()
    });
  }

  async computeScoreAsync(profile: CandidateProfileForAts, jobDescription: string): Promise<AtsScoreResult> {
    const keywords = await this.extractKeywords(jobDescription);
    const scoreResponse = await this.getAiScoreResponse(profile, jobDescription, keywords);

    const searchableText = [
      profile.skills.join(" "),
      profile.experienceSummary,
      profile.certifications?.join(" ") ?? "",
      profile.education?.map((e) => `${e.degree} ${e.fieldOfStudy ?? ""}`).join(" ") ?? "",
      profile.resumeText ?? ""
    ].join(" ").toLowerCase();

    const requiredResult = this.computeKeywordMatchScore(keywords.requiredSkills, searchableText);
    const preferredResult = this.computeKeywordMatchScore(keywords.preferredSkills, searchableText);
    const softResult = this.computeKeywordMatchScore(keywords.softSkills, searchableText);
    const domainResult = this.computeKeywordMatchScore(keywords.domainTerms, searchableText);

    const overallScore = Math.round(
      requiredResult.score * WEIGHTS.required +
        preferredResult.score * WEIGHTS.preferred +
        softResult.score * WEIGHTS.soft +
        domainResult.score * WEIGHTS.domain
    );

    return atsScoreSchema.parse({
      overallScore,
      requiredSkillsScore: scoreResponse.requiredMatchScore,
      preferredSkillsScore: scoreResponse.preferredMatchScore,
      softSkillsScore: softResult.score,
      domainTermsScore: domainResult.score,
      matchedRequiredSkills: requiredResult.matched,
      unmatchedRequiredSkills: requiredResult.unmatched,
      matchedPreferredSkills: preferredResult.matched,
      unmatchedPreferredSkills: preferredResult.unmatched,
      matchedSoftSkills: softResult.matched,
      matchedDomainTerms: domainResult.matched,
      analyzedAt: new Date().toISOString()
    });
  }

  private async getAiScoreResponse(
    profile: CandidateProfileForAts,
    jobDescription: string,
    keywords: AtsKeywordExtraction
  ): Promise<{ requiredMatchScore: number; preferredMatchScore: number }> {
    const prompt = buildAtsScoringPrompt(
      jobDescription,
      profile.skills,
      profile.resumeText ?? "",
      profile.experienceSummary,
      keywords
    );

    try {
      const response = await this.aiCompletion(prompt);
      return parseAtsScoreResponse(response.text);
    } catch {
      // Fallback to simple heuristic scoring if AI fails
      const searchableText = [
        profile.skills.join(" "),
        profile.experienceSummary
      ].join(" ").toLowerCase();

      const requiredMatch = keywords.requiredSkills.filter((kw) =>
        searchableText.includes(kw.toLowerCase())
      );
      const preferredMatch = keywords.preferredSkills.filter((kw) =>
        searchableText.includes(kw.toLowerCase())
      );

      return {
        requiredMatchScore:
          keywords.requiredSkills.length > 0
            ? Math.round((requiredMatch.length / keywords.requiredSkills.length) * 100)
            : 0,
        preferredMatchScore:
          keywords.preferredSkills.length > 0
            ? Math.round((preferredMatch.length / keywords.preferredSkills.length) * 100)
            : 0
      };
    }
  }

  // Fallback synchronous keyword extraction for when AI is unavailable
  private extractKeywordsSync(jobDescription: string): AtsKeywordExtraction {
    const normalized = jobDescription.toLowerCase();
    const words = normalized.split(/\W+/).filter((w) => w.length > 2);

    // Common soft skills list
    const softSkillsList = [
      "leadership",
      "communication",
      "teamwork",
      "problem-solving",
      "adaptability",
      "time management",
      "collaboration",
      "critical thinking",
      "creativity",
      "initiative"
    ];

    const foundSoftSkills = softSkillsList.filter((skill) => normalized.includes(skill));

    // Count word frequency
    const wordFreq = new Map<string, number>();
    for (const word of words) {
      if (word.length > 3) {
        wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
      }
    }

    // High frequency words might be important
    const highFreqWords = [...wordFreq.entries()]
      .filter(([_, count]) => count > 2 && count < 10)
      .map(([word]) => word)
      .slice(0, 20);

    // Extract camelCase/snake_case skills
    const skillPattern = /[a-z]+(?:[-_][a-z]+)+/g;
    const potentialSkills = [
      ...new Set(
        (jobDescription.match(skillPattern) ?? []).map((s) => s.toLowerCase())
      )
    ].slice(0, 15);

    return {
      requiredSkills: highFreqWords.slice(0, 10),
      preferredSkills: potentialSkills.slice(0, 15),
      softSkills: foundSoftSkills.slice(0, 10),
      domainTerms: words.filter((w) => w.length > 4 && /^[a-z]+$/.test(w)).slice(0, 20)
    };
  }
}
