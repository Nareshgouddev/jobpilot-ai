export type RuntimeMessage =
  | { type: "JOBPILOT_CAPTURE_JOB" }
  | { type: "JOBPILOT_CAPTURED_JOB"; payload: CapturedJob }
  | { type: "JOBPILOT_PING" };

export type CapturedJob = {
  title: string;
  company: string;
  location: string;
  description: string;
  sourceUrl: string;
};
