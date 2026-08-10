/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Brand gold - matches the site's actual mustard/gold accent
        // (buttons, section headings, "TOPLINE" logo text)
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
        // Brand blue - matches the site's actual link/nav/contact-bar
        // blue and the ring around the logo. Named "navy" for
        // historical reasons but this is a real blue, not near-black.
        navy: {
          50: '#eaf3fc',
          100: '#cfe6f8',
          200: '#a3cdf0',
          300: '#71b0e6',
          400: '#4593da',
          500: '#2779c7',
          600: '#1e73be',
          700: '#195c9c',
          800: '#164d81',
          900: '#153f69',
          950: '#0d2740',
        },
        accent: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
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
