import type { ThemeConfig } from "antd";

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: "#1677ff",
    colorSuccess: "#16a34a",
    colorWarning: "#f59e0b",
    colorError: "#dc2626",
    colorBgLayout: "#f6f8fb",
    colorBgContainer: "#ffffff",
    colorText: "#111827",
    colorTextSecondary: "#4b5563",
    colorBorder: "#dbe2ea",
    borderRadius: 10,
    fontSize: 14,
    controlHeight: 36,
    fontFamily:
      '"Inter", "Segoe UI", "-apple-system", "BlinkMacSystemFont", "system-ui", sans-serif'
  },
  components: {
    Form: {
      itemMarginBottom: 24,
      labelFontSize: 14,
      labelColor: "#111827"
    },
    Input: {
      borderRadius: 10,
      controlHeight: 36,
      fontSize: 14
    },
    Button: {
      borderRadius: 10,
      controlHeight: 36,
      fontSize: 14,
      fontWeight: 500
    },
    Card: {
      borderRadiusLG: 10,
      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
    }
  }
};
