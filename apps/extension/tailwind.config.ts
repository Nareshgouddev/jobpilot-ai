import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./popup.html", "./options.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"]
      },
      colors: {
        ink: "#0f172a",
        aqua: "#00b9ae",
        coral: "#ff5b45",
        paper: "#fff9f1"
      },
      boxShadow: {
        glow: "0 12px 40px rgba(0, 185, 174, 0.25)"
      }
    }
  },
  plugins: []
};

export default config;
