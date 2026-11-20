/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        astro: {
          orange: '#FF7700',
          darkOrange: '#E06500',
          maroon: '#800020',
          gold: '#FFD700',
          blue: '#1A365D',
        }
      }
    },
  },
  plugins: [],
}
