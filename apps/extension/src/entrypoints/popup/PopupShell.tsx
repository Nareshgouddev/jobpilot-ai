import React, { Suspense, useEffect } from "react";
import {
  QueryClient,
  QueryClientProvider
} from "@tanstack/react-query";
import { ConfigProvider, App as AntApp, Spin } from "antd";
import { antdTheme } from "../../theme/antd-theme";
import { PopupRouter } from "./PopupRouter";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { initializeSentry } from "../../lib/sentry";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
    mutations: { retry: 1 }
  }
});

function PopupShellContent() {
  useEffect(() => {
    initializeSentry();
  }, []);

  return (
    <ConfigProvider theme={antdTheme}>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <Suspense fallback={<Spin size="large" />}>
            <PopupRouter />
          </Suspense>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
}

export function PopupShell() {
  return (
    <ErrorBoundary>
      <PopupShellContent />
    </ErrorBoundary>
  );
}
