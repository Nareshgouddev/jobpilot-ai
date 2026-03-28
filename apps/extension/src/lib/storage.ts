export type DraftProfile = {
  fullName: string;
  skills: string[];
  experienceSummary: string;
};

const PROFILE_KEY = "jobpilot.profile";

function hasChromeStorage(): boolean {
  return typeof chrome !== "undefined" && typeof chrome.storage !== "undefined";
}

export async function getDraftProfile(): Promise<DraftProfile | null> {
  if (!hasChromeStorage()) {
    return null;
  }

  const result = await chrome.storage.local.get(PROFILE_KEY);
  const value = result[PROFILE_KEY] as DraftProfile | undefined;

  return value ?? null;
}

export async function setDraftProfile(profile: DraftProfile): Promise<void> {
  if (!hasChromeStorage()) {
    return;
  }

  await chrome.storage.local.set({
    [PROFILE_KEY]: profile
  });
}
