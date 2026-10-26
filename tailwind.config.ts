import type { Config } from "tailwindcss";

// Los colores institucionales se exponen como variables CSS (ver src/app/layout.tsx)
// para que cada institución configure los suyos sin recompilar.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: v("brand"), dark: v("brand-dark"), soft: v("brand-soft") },
        sun: { DEFAULT: v("sun"), dark: v("sun-dark") },
        ink: { DEFAULT: "#1B2925", muted: "#55665F", faint: "#5E6C67" },
        leaf: "#EDF3EE",
        line: "#D9E3DC",
        risk: { DEFAULT: "#B93A26", soft: "#FBE9E5" },
        warn: { DEFAULT: "#8C5300", soft: "#FDF1DC" },
        ok: { DEFAULT: "#256B41", soft: "#E3F2E8" },
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible"', "system-ui", "sans-serif"],
        display: ['"Bricolage Grotesque Variable"', '"Atkinson Hyperlegible"', "system-ui", "sans-serif"],
      },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
} satisfies Config;
