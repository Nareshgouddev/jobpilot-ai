import React, { Suspense, useEffect } from "react";
import {
  QueryClient,
  QueryClientProvider
} from "@tanstack/react-query";
import { ConfigProvider, App as AntApp, Spin, Layout } from "antd";
import { antdTheme } from "../../theme/antd-theme";
import { OptionsRouter } from "./OptionsRouter";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { initializeSentry } from "../../lib/sentry";

const { Content } = Layout;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1
    },
    mutations: {
      retry: 1
    }
  }
});

function OptionsShellContent() {
  useEffect(() => {
    initializeSentry();
  }, []);

  return (
    <ConfigProvider theme={antdTheme}>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <Layout style={{ minHeight: "100vh" }}>
            <Content style={{ padding: "24px" }}>
              <Suspense fallback={<Spin size="large" />}>
                <OptionsRouter />
              </Suspense>
            </Content>
          </Layout>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
}

export function OptionsShell() {
  return (
    <ErrorBoundary>
      <OptionsShellContent />
    </ErrorBoundary>
  );
}
