import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          green: "#16A34A",
          navy: "#0F172A",
          accent: "#22C55E",
        },
        grade: {
          a: "#16A34A",
          b: "#3B82F6",
          c: "#D97706",
          d: "#DC2626",
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
        arabic: ["Cairo", "IBM Plex Sans Arabic", "sans-serif"]
      }
    },
  },
  plugins: [],
};
export default config;

