/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#4361ee',
          'blue-dark': '#3450d2',
          navy: '#000a28',
        },
        indigo: {
          50: '#eef1ff',
          100: '#dce3ff',
          200: '#bac8ff',
          300: '#95aaff',
          400: '#7189ff',
          500: '#536ff5',
          600: '#4361ee',
          700: '#3450d2',
          800: '#17265b',
          900: '#000a28',
          950: '#000619',
        },
        slate: {
          900: '#000a28',
        },
      },
    },
  },
  plugins: [],
};
