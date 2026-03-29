export type RuntimeMessage =
  | { type: "JOBPILOT_CAPTURE_JOB" }
  | { type: "JOBPILOT_CAPTURED_JOB"; payload: CapturedJob }
  | { type: "JOBPILOT_REQUEST_ACTIVE_TAB_CAPTURE" }
  | { type: "JOBPILOT_CAPTURE_RESULT"; ok: true; payload: CapturedJob }
  | { type: "JOBPILOT_CAPTURE_RESULT"; ok: false; error: CaptureErrorCode }
  | { type: "JOBPILOT_PING" };

export type CaptureErrorCode =
  | "NO_ACTIVE_TAB"
  | "UNSUPPORTED_TAB_URL"
  | "CONTENT_SCRIPT_UNAVAILABLE"
  | "CAPTURE_TIMEOUT"
  | "UNKNOWN_CAPTURE_ERROR";

export type CapturedJob = {
  title: string;
  company: string;
  location: string;
  description: string;
  sourceUrl: string;
};
