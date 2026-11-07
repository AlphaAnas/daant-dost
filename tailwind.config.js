/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0F1B3D", soft: "#4A5675", faint: "#8590AA" },
        bone: { DEFAULT: "#F3F6FA", deep: "#E8EEF6" },
        line: "#DCE3EE",
        brand: { DEFAULT: "#0A74DA", dark: "#075DB3", tint: "#E6F1FC" },
        sky: "#13BCFB",
        care: {
          self: "#12805C",
          "self-tint": "#E3F4EC",
          doctor: "#9A5B00",
          "doctor-tint": "#FDF1DC",
          urgent: "#C2410C",
          "urgent-tint": "#FDE9DD",
          emergency: "#C21E3A",
          "emergency-tint": "#FCE4E8",
        },
      },
      fontFamily: {
        display: ["ClashDisplay", "system-ui", "sans-serif"],
        sans: ["'Atkinson Hyperlegible'", "system-ui", "sans-serif"],
      },
      keyframes: {
        "hotspot-pulse": {
          "0%": { transform: "scale(1)", opacity: "0.55" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        "dot-bounce": {
          "0%, 80%, 100%": { transform: "translateY(0)", opacity: "0.35" },
          "40%": { transform: "translateY(-4px)", opacity: "1" },
        },
        "rise-in": {
          "0%": { transform: "translateY(6px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "word-in": {
          "0%": { opacity: "0", filter: "blur(4px)", transform: "translateY(2px)" },
          "100%": { opacity: "1", filter: "blur(0)", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "100% 0" },
          "100%": { backgroundPosition: "-100% 0" },
        },
        "caret-blink": {
          "0%, 45%": { opacity: "1" },
          "55%, 100%": { opacity: "0" },
        },
        "phrase-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "hotspot-pulse": "hotspot-pulse 1.6s ease-out infinite",
        "dot-bounce": "dot-bounce 1.2s ease-in-out infinite",
        "rise-in": "rise-in 0.35s ease-out both",
        "word-in": "word-in 0.4s ease-out both",
        shimmer: "shimmer 2.2s linear infinite",
        "caret-blink": "caret-blink 1s step-end infinite",
        "phrase-in": "phrase-in 0.4s ease-out both",
        orbit: "spin 1.4s linear infinite",
      },
    },
  },
  plugins: [],
};
