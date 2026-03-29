import type { RuntimeMessage } from "./types/messages";
import { isCapturableUrl, toErrorResponse } from "./lib/capture-guards";

const CAPTURE_TIMEOUT_MS = 2500;

async function captureFromActiveTab(): Promise<RuntimeMessage> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (!activeTab?.id) {
    return toErrorResponse("NO_ACTIVE_TAB");
  }

  if (!isCapturableUrl(activeTab.url)) {
    return toErrorResponse("UNSUPPORTED_TAB_URL");
  }

  const capturePromise = chrome.tabs.sendMessage(activeTab.id, {
    type: "JOBPILOT_CAPTURE_JOB"
  } as RuntimeMessage) as Promise<RuntimeMessage>;

  const timeoutPromise = new Promise<RuntimeMessage>((resolve) => {
    setTimeout(() => {
      resolve(toErrorResponse("CAPTURE_TIMEOUT"));
    }, CAPTURE_TIMEOUT_MS);
  });

  try {
    const response = await Promise.race([capturePromise, timeoutPromise]);

    if (!response || response.type !== "JOBPILOT_CAPTURE_RESULT") {
      return toErrorResponse("UNKNOWN_CAPTURE_ERROR");
    }

    return response;
  } catch {
    return toErrorResponse("CONTENT_SCRIPT_UNAVAILABLE");
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    "jobpilot.installTimestamp": new Date().toISOString()
  });
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message.type === "JOBPILOT_PING") {
    sendResponse({ ok: true, source: "background" });
    return true;
  }

  if (message.type === "JOBPILOT_REQUEST_ACTIVE_TAB_CAPTURE") {
    void captureFromActiveTab().then((result) => {
      sendResponse(result);
    });

    return true;
  }

  return false;
});
