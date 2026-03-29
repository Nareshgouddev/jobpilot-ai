import { scrapeJobFromPage } from "./lib/dom-scraper";
import type { RuntimeMessage } from "./types/messages";

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message.type === "JOBPILOT_CAPTURE_JOB") {
    try {
      const payload = scrapeJobFromPage();
      sendResponse({
        type: "JOBPILOT_CAPTURE_RESULT",
        ok: true,
        payload
      } as RuntimeMessage);
    } catch {
      sendResponse({
        type: "JOBPILOT_CAPTURE_RESULT",
        ok: false,
        error: "UNKNOWN_CAPTURE_ERROR"
      } as RuntimeMessage);
    }

    return true;
  }

  return false;
});
