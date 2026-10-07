/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0A2540", 800: "#0A2540", 900: "#071A2E" },
        ocean: { DEFAULT: "#00B4D8", dark: "#0096B7", light: "#90E0EF" }
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] }
    }
  },
  plugins: []
};
