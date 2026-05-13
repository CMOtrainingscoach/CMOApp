import { z } from "zod";

export const jobScanMatchJobSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(500),
  /** ISO-ish date string, textual date from snippets, Unknown, or null if not inferable */
  posted_date: z.union([z.string().max(48), z.null()]),
  resume_quote: z.string().max(400),
  stars: z.number().int().min(1).max(5),
  feedback: z.string().max(800),
});

export const jobScanMatchResponseSchema = z.object({
  overview: z.string().max(2400),
  jobs: z.array(jobScanMatchJobSchema).max(18),
});

export type JobScanMatchJob = z.infer<typeof jobScanMatchJobSchema>;
export type JobScanMatchResponse = z.infer<typeof jobScanMatchResponseSchema>;
