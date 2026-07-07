/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Cormorant Garamond', 'Space Grotesk', 'system-ui', 'serif'],
      },
      colors: {
        // Rich, deep gold — premium accent (was flat amber before)
        primary: {
          50: '#fdf8ed',
          100: '#faedc9',
          200: '#f5d98d',
          300: '#f0c150',
          400: '#e6ab2e',
          500: '#c9971f',
          600: '#a87817',
          700: '#855c16',
          800: '#6d4a18',
          900: '#5c3f19',
          950: '#35220c',
        },
        // Deep navy-charcoal — hero/sidebar/dark surfaces
        navy: {
          50: '#f2f4f7',
          100: '#e2e6ec',
          200: '#c7cfdc',
          300: '#a1aec3',
          400: '#7789a5',
          500: '#5b6d8a',
          600: '#485771',
          700: '#3b475d',
          800: '#262f3f',
          900: '#141a26',
          950: '#0b0f17',
        },
        accent: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        // Warm cream page background, used in place of pure white for a
        // more premium storefront feel
        cream: {
          50: '#fdfbf7',
          100: '#faf6ee',
          200: '#f5eedd',
          DEFAULT: '#faf6ee',
        },
      },
      boxShadow: {
        premium: '0 4px 24px -4px rgba(20, 26, 38, 0.12)',
        'premium-lg': '0 12px 40px -8px rgba(20, 26, 38, 0.18)',
      },
    },
  },
  plugins: [],
};
