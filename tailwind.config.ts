import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0A0A0A",
          elevated: "#141414",
          card: "#1A1A1A",
          inset: "#0F0F0F",
        },
        gold: {
          50: "#FBF5DD",
          100: "#F5E9B5",
          200: "#EFD986",
          300: "#E8C66E",
          400: "#E0BB55",
          500: "#D4AF37",
          600: "#B8941F",
          700: "#8B6F18",
          800: "#5C4910",
          900: "#2E2408",
        },
        bronze: {
          DEFAULT: "#8B6F2F",
          light: "#A8893E",
          dark: "#6B5524",
        },
        text: {
          primary: "#F5F5F5",
          secondary: "#C8C8C8",
          muted: "#8A8A8A",
          subtle: "#5A5A5A",
        },
        border: {
          subtle: "rgba(212,175,55,0.12)",
          gold: "rgba(212,175,55,0.30)",
          hairline: "rgba(255,255,255,0.05)",
        },
        success: "#3FB950",
        danger: "#F85149",
        info: "#58A6FF",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(212,175,55,0.20), 0 8px 32px -12px rgba(212,175,55,0.25)",
        "gold-soft": "0 0 0 1px rgba(212,175,55,0.10), 0 4px 24px -8px rgba(212,175,55,0.15)",
        elevated: "0 10px 40px -12px rgba(0,0,0,0.7)",
        "inner-gold": "inset 0 1px 0 rgba(255,236,180,0.20), inset 0 -1px 0 rgba(0,0,0,0.30)",
      },
      backgroundImage: {
        "gradient-gold": "linear-gradient(135deg, #E8C66E 0%, #D4AF37 50%, #8B6F2F 100%)",
        "gradient-gold-soft":
          "linear-gradient(135deg, rgba(232,198,110,0.15) 0%, rgba(212,175,55,0.08) 50%, rgba(139,111,47,0.04) 100%)",
        "gradient-card":
          "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.20) 100%)",
        "gradient-glow":
          "radial-gradient(circle at 50% 0%, rgba(212,175,55,0.10) 0%, transparent 60%)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(212,175,55,0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(212,175,55,0)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.5s linear infinite",
        "fade-in": "fade-in 0.4s ease-out",
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
