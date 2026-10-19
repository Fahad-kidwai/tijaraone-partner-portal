/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#2114BF",
          royal: "#004DD9",
          sky: "#1F83F5",
          cyan: "#5FE7FD",
          lime: "#CEF75B",
          dark: "#0A1128",
        }
      },
    },
  },
  plugins: [],
};
