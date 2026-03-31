import { z } from "zod";

export const atsKeywordExtractionSchema = z.object({
  requiredSkills: z.array(z.string().trim().min(1)).max(15),
  preferredSkills: z.array(z.string().trim().min(1)).max(20),
  softSkills: z.array(z.string().trim().min(1)).max(15),
  domainTerms: z.array(z.string().trim().min(1)).max(20)
});

export type AtsKeywordExtraction = z.infer<typeof atsKeywordExtractionSchema>;
