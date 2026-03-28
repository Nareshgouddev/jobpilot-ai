import type { RuntimeMessage } from "./types/messages";

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

  return false;
});
