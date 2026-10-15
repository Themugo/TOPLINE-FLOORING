/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope Variable', 'Manrope', 'system-ui', 'sans-serif'],
        display: ['Sora Variable', 'Sora', 'Manrope Variable', 'system-ui', 'sans-serif'],
      },
      colors: {
        // TOPLINE palette: ocean navy (brand anchor), signal lime (one action colour per screen), petrol (links, waterproofing),
        // warm concrete neutrals. Service tones: flooring #3f5e8a, waterproofing #0e8a93, roofing #8f5b3e (see src/lib/service-tone.ts).
        gray: {
          50: '#f7f6f3',
          100: '#f1efeb',
          200: '#e3dfd8',
          300: '#cfcac1',
          400: '#7b8591',
          500: '#5f6b78',
          600: '#475360',
          700: '#343f4b',
          800: '#232c36',
          900: '#17212b',
          950: '#0e151c'
        },
        // Cool 'slate' utilities used by the services, contact, tracking and account pages follow the same warm concrete
        // neutrals as 'gray', so every page shares one neutral family.
        slate: {
          50: '#f7f6f3', 100: '#f1efeb', 200: '#e3dfd8', 300: '#cfcac1', 400: '#7b8591', 500: '#5f6b78',
          600: '#475360', 700: '#343f4b', 800: '#232c36', 900: '#17212b', 950: '#0e151c'
        },
        primary: {
          50: '#eef3fa',
          100: '#dbe6f4',
          200: '#b8cce8',
          300: '#86a9d3',
          400: '#4f7db3',
          500: '#0c2d57',
          600: '#0a2548',
          700: '#081d3a',
          800: '#06172d',
          900: '#041020',
          950: '#030a15'
        },
        navy: {
          50: '#eff5fc',
          100: '#dce9f8',
          200: '#bad4f0',
          300: '#8db7e5',
          400: '#5b96d6',
          500: '#2f77c4',
          600: '#1f5fa8',
          700: '#184a8a',
          800: '#12396d',
          900: '#0c2d57',
          950: '#0a2447'
        },
        lime: {
          50: '#f6fde6',
          100: '#eefbcf',
          200: '#ddf79f',
          300: '#c8f26a',
          400: '#b4e33d',
          500: '#9bcb23',
          600: '#6a8c10',
          700: '#566f0d',
          800: '#42560b',
          900: '#2f3d09',
          950: '#1b2305'
        },
        // 'gold' is kept as an alias of the lime ramp so older class names follow the new palette.
        gold: {
          50: '#f6fde6',
          100: '#eefbcf',
          200: '#ddf79f',
          300: '#c8f26a',
          400: '#b4e33d',
          500: '#9bcb23',
          600: '#6a8c10',
          700: '#566f0d',
          800: '#42560b',
          900: '#2f3d09',
          950: '#1b2305'
        },
        accent: {
          50: '#e6f5f7',
          100: '#c7e8ec',
          200: '#9ad5dc',
          300: '#66bdc8',
          400: '#2fa0af',
          500: '#0e6b78',
          600: '#0b5864',
          700: '#0a4650',
          800: '#08373f',
          900: '#062a31',
          950: '#041d22'
        },
        cream: {
          50: '#f8f7f4',
          100: '#f1efeb',
          200: '#e7e3dc',
          DEFAULT: '#f1efeb'
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
