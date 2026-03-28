import { z } from "zod";

export const generatedCoverLetterSchema = z.object({
  subjectLine: z.string().trim().min(3).max(120),
  keyHighlights: z.array(z.string().trim().min(3).max(220)).min(2).max(8),
  coverLetter: z.string().trim().min(120).max(12000)
});

export type GeneratedCoverLetter = z.infer<typeof generatedCoverLetterSchema>;
