import type { CapturedJob, RuntimeMessage } from "../types/messages";

function hasChromeRuntime(): boolean {
  return typeof chrome !== "undefined" && typeof chrome.runtime !== "undefined";
}

export async function sendMessage(message: RuntimeMessage): Promise<unknown> {
  if (!hasChromeRuntime()) {
    return null;
  }

  return chrome.runtime.sendMessage(message);
}

export async function requestCapturedJobFromActiveTab(): Promise<CapturedJob | null> {
  if (typeof chrome === "undefined" || !chrome.runtime) {
    return null;
  }

  const response = (await chrome.runtime.sendMessage({
    type: "JOBPILOT_REQUEST_ACTIVE_TAB_CAPTURE"
  } as RuntimeMessage)) as RuntimeMessage | undefined;

  if (!response || response.type !== "JOBPILOT_CAPTURE_RESULT") {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return response.payload;
}
