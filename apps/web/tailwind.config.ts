import type { Config } from "tailwindcss";

// ryot design tokens, mirrored as css vars in globals.css. see DESIGN.md.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0b",
        ink: "#0a0a0b", // text/icon on light fills
        surface: "#100f12",
        surface2: "#17161a",
        line: "#26242b",
        lineSoft: "#1a181d",
        bone: "#f4f1e8", // primary text, warm off-white
        muted: "#a39d92",
        faint: "#857f74", // WCAG AA (4.5:1) for small text on the near-black bg
        // channel-based so a subtree can retint all gold accents at once
        gold: "rgb(var(--gold-rgb) / <alpha-value>)",
        gold2: "rgb(var(--gold-2-rgb) / <alpha-value>)",
        // immutable brand gold for the wordmark, never retinted by a champion theme
        brand: "#c8aa6e",
        win: "#4d8df0",
        loss: "#ff4d4d",
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
        riseIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.2" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        marquee: "marquee 56s linear infinite",
        riseIn: "riseIn 0.5s cubic-bezier(0.16,1,0.3,1) both",
        blink: "blink 1.4s steps(2, start) infinite",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
