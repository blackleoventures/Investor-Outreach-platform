/** @type {import('tailwindcss').Config} */

const { fontFamily } = require("tailwindcss/defaultTheme");
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        // Override the default sans font with Poppins
        sans: ["var(--font-poppins)", ...fontFamily.sans],
        // Keep your other fonts as custom options
        inter: ["var(--font-inter)", ...fontFamily.sans],
        mono: ["var(--font-roboto-mono)", ...fontFamily.mono],
      },
    },
  },
  plugins: [],
};
