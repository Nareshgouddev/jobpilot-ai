import type { CaptureErrorCode, RuntimeMessage } from "../types/messages";

export function isCapturableUrl(rawUrl: string | undefined): boolean {
  if (!rawUrl) {
    return false;
  }

  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function toErrorResponse(error: CaptureErrorCode): RuntimeMessage {
  return {
    type: "JOBPILOT_CAPTURE_RESULT",
    ok: false,
    error
  };
}
