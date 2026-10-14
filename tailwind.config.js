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
        // Shared warm-neutral surfaces and accessible slate text used by legacy gray-* classes.
        // This centralizes existing utility usage without editing dozens of page files.
        gray: {
          50: '#faf6ee',
          100: '#f4efe6',
          200: '#e7e0d4',
          300: '#d2c8b8',
          400: '#64748b',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1f2937',
          900: '#0f172a',
          950: '#020617',
        },
        // Authoritative brand primary: TOPLINE deep blue. Runtime theme settings may
        // generate a governed ramp over these defaults without requiring a rebuild.
        primary: {
          50: '#eef4fa',
          100: '#dce8f4',
          200: '#bfd5e9',
          300: '#91b7d7',
          400: '#5d91bf',
          500: '#153f69',
          600: '#12365a',
          700: '#102d4b',
          800: '#0d243b',
          900: '#0a1c2f',
          950: '#06111d',
        },
        // Restrained TOPLINE gold is an accent, not a semantic status color.
        gold: {
          50: '#fdf8ed',
          100: '#faedc9',
          200: '#f5d98d',
          300: '#f0c150',
          400: '#e6ab2e',
          500: '#c9971f',
          600: '#855c16',
          700: '#6d4a18',
          800: '#5c3f19',
          900: '#493014',
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
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0369a1',
          600: '#075985',
          700: '#0c4a6e',
          800: '#083344',
          900: '#082f49',
          950: '#061f32',
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
