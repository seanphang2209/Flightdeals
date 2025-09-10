import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/**/*.{ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        // Tripz brand tokens
        brand: {
          DEFAULT: "#3B82F6",  // primary (accessible on dark)
          fg: "#0B1220",       // high-contrast foreground on light
          bg: "#070A12",       // app background (dark-first)
          accent: "#22C55E",   // success/positive
          warn: "#F59E0B",     // notice
          danger: "#EF4444",   // error
          muted: "#94A3B8",    // subdued text
        },
        surface: {
          0: "#0B1220",
          1: "#111827",
          2: "#1F2937",
          3: "#273244",
        },
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0,0,0,0.12)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      spacing: {
        "4.5": "1.125rem",
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant("hocus", ["&:hover", "&:focus"]);
    }),
  ],
};
export default config; 