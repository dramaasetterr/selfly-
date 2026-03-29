import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: "#F8EDD1", light: "#F8EDD1" },
        navy: { DEFAULT: "#1C1C28", light: "#2D2D3D" },
        gold: {
          DEFAULT: "#C4A265",
          light: "#D4B87A",
          dark: "#A88B4A",
          muted: "#E8D5B0",
          bg: "#F9F3E8",
        },
        border: "#E5E0D8",
        success: "#2D7A4F",
        error: "#B03A3A",
        // Legacy aliases
        primary: "#C4A265",
        accent: "#C4A265",
      },
      fontFamily: {
        heading: ["var(--font-playfair)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
