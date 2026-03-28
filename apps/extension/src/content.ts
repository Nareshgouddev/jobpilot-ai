import { scrapeJobFromPage } from "./lib/dom-scraper";
import type { RuntimeMessage } from "./types/messages";

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message.type === "JOBPILOT_CAPTURE_JOB") {
    const payload = scrapeJobFromPage();
    sendResponse({
      type: "JOBPILOT_CAPTURED_JOB",
      payload
    } as RuntimeMessage);

    return true;
  }

  return false;
});
