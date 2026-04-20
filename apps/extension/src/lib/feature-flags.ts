type FeatureFlags = {
  uiVersion: "legacy" | "antd";
  enableAtsScoring: boolean;
  enableApplicationTracking: boolean;
};

const FEATURE_FLAG_KEY = "jobpilot.featureFlags";

async function getFeatureFlags(): Promise<FeatureFlags> {
  if (typeof chrome === "undefined" || !chrome.storage) {
    return {
      uiVersion: "antd",
      enableAtsScoring: true,
      enableApplicationTracking: true
    };
  }

  const result = await chrome.storage.local.get(FEATURE_FLAG_KEY);
  const stored = result[FEATURE_FLAG_KEY] as Partial<FeatureFlags> | undefined;

  return {
    uiVersion: stored?.uiVersion ?? "antd",
    enableAtsScoring: stored?.enableAtsScoring ?? true,
    enableApplicationTracking: stored?.enableApplicationTracking ?? true
  };
}

async function setFeatureFlags(flags: Partial<FeatureFlags>): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage) {
    return;
  }

  const current = await getFeatureFlags();
  const updated = { ...current, ...flags };
  await chrome.storage.local.set({ [FEATURE_FLAG_KEY]: updated });
}

export async function isAntdUiEnabled(): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags.uiVersion === "antd";
}
