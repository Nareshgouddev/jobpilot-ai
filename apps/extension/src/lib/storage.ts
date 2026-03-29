export type DraftProfile = {
  email: string;
  fullName: string;
  skills: string[];
  experienceSummary: string;
};

export type ExtensionIdentity = {
  userId: string;
};

const PROFILE_KEY = "jobpilot.profile";
const IDENTITY_KEY = "jobpilot.identity";

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

export async function getOrCreateIdentity(): Promise<ExtensionIdentity> {
  if (!hasChromeStorage()) {
    return {
      userId: "550e8400-e29b-41d4-a716-446655440000"
    };
  }

  const result = await chrome.storage.local.get(IDENTITY_KEY);
  const existing = result[IDENTITY_KEY] as ExtensionIdentity | undefined;

  if (existing?.userId) {
    return existing;
  }

  const created: ExtensionIdentity = {
    userId: crypto.randomUUID()
  };

  await chrome.storage.local.set({
    [IDENTITY_KEY]: created
  });

  return created;
}
