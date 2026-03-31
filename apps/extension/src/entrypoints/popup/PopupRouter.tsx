import React, { useEffect, useState } from "react";
import { Spin, Alert } from "antd";
import { useAuthStore } from "../../store/auth-store";
import { issueSessionToken } from "../../lib/api";
import { getOrCreateIdentity } from "../../lib/storage";
import { CaptureStep } from "./steps/CaptureStep";
import { GenerateStep } from "./steps/GenerateStep";
import { ReviewStep } from "./steps/ReviewStep";

type PopupStep = "capture" | "generate" | "review";

export function PopupRouter() {
  const [step, setStep] = useState<PopupStep>("capture");
  const [isInitializing, setIsInitializing] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const { accessToken, setAuth } = useAuthStore();

  useEffect(() => {
    async function initialize() {
      if (accessToken && useAuthStore.getState().isTokenValid()) {
        setIsInitializing(false);
        return;
      }

      try {
        const identity = await getOrCreateIdentity();
        const token = await issueSessionToken({
          userId: identity.userId,
          email: identity.email
        });

        setAuth({
          userId: identity.userId,
          email: identity.email,
          accessToken: token.accessToken,
          expiresInSeconds: token.expiresInSeconds
        });
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : "Auth failed");
      } finally {
        setIsInitializing(false);
      }
    }

    void initialize();
  }, []);

  if (isInitializing) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
        <Spin size="large" tip="Initializing..." />
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{ padding: "16px" }}>
        <Alert
          type="error"
          message="Authentication Error"
          description={authError}
          showIcon
        />
      </div>
    );
  }

  if (step === "capture") {
    return <CaptureStep onNext={() => setStep("generate")} />;
  }
  if (step === "generate") {
    return (
      <GenerateStep
        onNext={() => setStep("review")}
        onBack={() => setStep("capture")}
      />
    );
  }
  return <ReviewStep onReset={() => setStep("capture")} />;
}
