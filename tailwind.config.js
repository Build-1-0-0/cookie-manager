/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1f2937', // Dark gray for headers
        accent: '#3b82f6',  // Blue for buttons
      },
    },
  },
  plugins: [],
}
