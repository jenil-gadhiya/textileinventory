/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        surface: {
          50: "rgb(var(--color-surface-50) / <alpha-value>)",
          100: "rgb(var(--color-surface-100) / <alpha-value>)",
          200: "rgb(var(--color-surface-200) / <alpha-value>)",
          300: "rgb(var(--color-surface-300) / <alpha-value>)"
        },
        body: "rgb(var(--color-text-body) / <alpha-value>)",
        muted: "rgb(var(--color-text-muted) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        neon: {
          cyan: "#22d3ee",
          purple: "#a855f7"
        }
      },
      boxShadow: {
        glass: "0 16px 80px rgba(15, 23, 42, 0.45)"
      },
      backdropBlur: {
        xs: "2px"
      }
    }
  },
  plugins: []
};
