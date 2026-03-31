import type { AtsKeywordExtraction } from "./ats-output-schema.js";

export function buildAtsKeywordExtractionPrompt(jobDescription: string): string {
  return [
    "You are an expert ATS (Applicant Tracking System) analyst.",
    "Analyze the job description below and extract structured keyword data.",
    "Return ONLY valid JSON with exactly these keys: requiredSkills, preferredSkills, softSkills, domainTerms.",
    "Do not include markdown or code fences.",
    "",
    "Rules:",
    "- requiredSkills: hard technical skills that are explicitly required (e.g., Python, React, SQL). Max 15.",
    "- preferredSkills: nice-to-have skills that would be valued (e.g., AWS, GraphQL, Agile). Max 20.",
    "- softSkills: interpersonal/transferable skills (e.g., communication, leadership, teamwork). Max 15.",
    "- domainTerms: industry-specific terminology or buzzwords used in this field. Max 20.",
    "- Use lowercase for all keywords.",
    "- Do not duplicate keywords across categories.",
    "",
    `Job Description:\n${jobDescription}`
  ].join("\n");
}

export function buildAtsScoringPrompt(
  jobDescription: string,
  profileSkills: string[],
  resumeText: string,
  experienceSummary: string,
  keywords: AtsKeywordExtraction
): string {
  return [
    "You are an expert ATS scoring analyst.",
    "Score how well a candidate matches a job description based on keyword overlap.",
    "Return ONLY a JSON object with this exact structure:",
    '{"matchScore": <number 0-100>, "requiredMatchScore": <number 0-100>, "preferredMatchScore": <number 0-100>}',
    "Do not include markdown or code fences.",
    "",
    "Candidate Profile:",
    `Skills: ${profileSkills.join(", ")}`,
    `Experience: ${experienceSummary}`,
    resumeText ? `Resume Text: ${resumeText.slice(0, 3000)}` : "No resume text available.",
    "",
    "Target Job Keywords:",
    `Required Skills (must match): ${keywords.requiredSkills.join(", ")}`,
    `Preferred Skills (should match): ${keywords.preferredSkills.join(", ")}`,
    "",
    `Job Description:\n${jobDescription.slice(0, 4000)}`
  ].join("\n");
}
