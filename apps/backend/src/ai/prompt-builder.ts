import type { AiGenerationRequest } from "@jobpilot/shared";

export function buildCoverLetterPrompt(input: AiGenerationRequest): string {
  const skills = input.applicantProfile.skills.join(", ");

  return [
    "You are an expert career writing assistant.",
    "Create a highly tailored cover letter for the job and candidate below.",
    "Return ONLY valid JSON with exactly these keys: subjectLine, keyHighlights, coverLetter.",
    "Do not include markdown or code fences.",
    "",
    "Output requirements:",
    "- subjectLine: concise email subject line",
    "- keyHighlights: 2-8 short bullets as array of strings",
    "- coverLetter: complete letter body in plain text",
    `- tone: ${input.tone}`,
    "",
    "Job:",
    `title: ${input.job.title}`,
    `company: ${input.job.company}`,
    `location: ${input.job.location}`,
    `employmentType: ${input.job.employmentType}`,
    `description: ${input.job.description}`,
    `sourceUrl: ${input.job.sourceUrl ?? "N/A"}`,
    "",
    "Candidate:",
    `fullName: ${input.applicantProfile.fullName}`,
    `skills: ${skills}`,
    `experienceSummary: ${input.applicantProfile.experienceSummary}`
  ].join("\n");
}
