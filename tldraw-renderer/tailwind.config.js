/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.tsx"],
  theme: {
    darkMode: 'class',
    extend: {
      zIndex: {
        '100': '100',
        '200': '200'
      }
    },
  },
  plugins: [],
}

