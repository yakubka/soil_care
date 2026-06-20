/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#000000", // black background
        sidebar: "#070A09",
        surface: "#0E1413", // card surface (alias of `card` for reused components)
        card: "#0E1413",
        card2: "#141B19",
        border: "#23302C",
        accent: "#34D399",
        "accent-soft": "#10B981",
        warning: "#FACC15",
        danger: "#F87171",
        info: "#38BDF8",
        nutrient: "#C084FC",
        "text-primary": "#E6F1EF",
        "text-secondary": "#88AAA6",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
