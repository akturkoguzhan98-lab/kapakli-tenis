import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        clay: { 50: "#fdf4ee", 100: "#fbe4d4", 500: "#c8622f", 600: "#b04f20", 700: "#8f3f1a" },
        court: { 50: "#eef7f1", 100: "#d6ecdd", 500: "#2f7d4f", 600: "#24663f", 700: "#1c5032", 900: "#0f2d1c" },
      },
    },
  },
  plugins: [],
} satisfies Config;
