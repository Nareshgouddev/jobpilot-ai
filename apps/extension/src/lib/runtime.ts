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
  if (typeof chrome === "undefined" || !chrome.tabs) {
    return null;
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (!activeTab?.id) {
    return null;
  }

  const response = (await chrome.tabs.sendMessage(activeTab.id, {
    type: "JOBPILOT_CAPTURE_JOB"
  } as RuntimeMessage)) as RuntimeMessage | undefined;

  if (!response || response.type !== "JOBPILOT_CAPTURED_JOB") {
    return null;
  }

  return response.payload;
}
