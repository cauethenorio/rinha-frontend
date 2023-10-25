/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

export default {
  content: ['./index.html', './src/**/*.{js,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        key: '#4E9590',
        symbol: '#F2CAB8',
        indenting: '#BFBFBF',
      },
    },
  },
  plugins: [],
};
