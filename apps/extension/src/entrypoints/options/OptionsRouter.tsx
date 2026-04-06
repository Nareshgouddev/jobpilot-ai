import React, { useEffect, useState } from "react";
import { Tabs, Spin, Alert } from "antd";
import {
  UserOutlined,
  FileOutlined,
  CheckCircleOutlined,
  SettingOutlined
} from "@ant-design/icons";

import { useAuthStore } from "../../store/auth-store";
import { issueSessionToken } from "../../lib/api";
import { getOrCreateIdentity } from "../../lib/storage";
import { ProfileTab } from "./tabs/ProfileTab";
import { ResumeTab } from "./tabs/ResumeTab";
import { ApplicationsTab } from "./tabs/ApplicationsTab";

export function OptionsRouter() {
  const [activeKey, setActiveKey] = useState("profile");
  const [isInitializing, setIsInitializing] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const { accessToken, setAuth } = useAuthStore();

  useEffect(() => {
    async function initializeAuth() {
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

    void initializeAuth();
  }, []);

  if (isInitializing) {
    return <Spin size="large" />;
  }

  if (authError) {
    return (
      <Alert type="error" message="Authentication Error" description={authError} showIcon />
    );
  }

  return (
    <Tabs
      activeKey={activeKey}
      onChange={setActiveKey}
      items={[
        {
          key: "profile",
          label: "Profile",
          icon: <UserOutlined />,
          children: <ProfileTab />
        },
        {
          key: "resume",
          label: "Resume",
          icon: <FileOutlined />,
          children: <ResumeTab />
        },
        {
          key: "applications",
          label: "Applications",
          icon: <CheckCircleOutlined />,
          children: <ApplicationsTab />
        },
        {
          key: "settings",
          label: "Settings",
          icon: <SettingOutlined />,
          children: <div style={{ padding: "16px" }}>Settings coming soon</div>
        }
      ]}
    />
  );
}
