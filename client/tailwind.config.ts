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
        background: "rgb(var(--background-rgb))",
        foreground: "rgb(var(--foreground-rgb))",
        primary: {
          green: "rgb(var(--primary-green))",
        },
        accent: {
          blue: "rgb(var(--accent-blue))",
        },
        border: {
          green: "var(--border-green)",
        },
        text: {
          white: "var(--text-white)",
          "gray-200": "var(--text-gray-200)",
          "gray-400": "var(--text-gray-400)",
          "green-400": "var(--text-green-400)",
        },
        bg: {
            dark: "var(--bg-dark)",
          "green-600": "var(--bg-green-600)",
          "green-500": "var(--bg-green-500)",
          "blue-600": "var(--bg-blue-600)",
          "blue-500": "var(--bg-blue-500)",
          "gray-800": "var(--bg-gray-800)",
          "gray-700": "var(--bg-gray-700)",
        },
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
