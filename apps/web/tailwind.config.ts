import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#090a0c",
        surface: "#111317",
        "surface-elevated": "#171a20",
        "surface-card": "#13161c",
        border: "#20242c",
        "border-subtle": "#1b1e25",
        "border-hover": "#313744",
        foreground: "#f3f4f6",
        "muted-foreground": "#9ca3af",
        accent: {
          DEFAULT: "#6366f1",
          hover: "#4f46e5",
          muted: "rgba(99, 102, 241, 0.12)",
        },
        figma: {
          DEFAULT: "#a259ff",
          hover: "#8b3fe8",
          muted: "rgba(162, 89, 255, 0.15)",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          '"SF Mono"',
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          '"Courier New"',
          "monospace",
        ],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
        card: "0 4px 20px -2px rgba(0, 0, 0, 0.5)",
        glow: "0 0 25px -5px rgba(99, 102, 241, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;

