/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        purple: {
          50: '#EEEDFE',
          100: '#CECBF6',
          200: '#AFA9EC',
          400: '#7F77DD',
          500: '#6B62D4',
          600: '#534AB7',
          800: '#3C3489',
          900: '#26215C',
        },
        status: {
          safe: '#3B6D11',
          'safe-bg': '#EAF3DE',
          warn: '#854F0B',
          'warn-bg': '#FAEEDA',
          danger: '#A32D2D',
          'danger-bg': '#FCEBEB',
        },
        sos: '#E24B4A',
        dark: {
          text: '#1A1A28',
        },
        gray: {
          text: '#888899',
          bg: '#F0F0F4',
          border: '#E0E0E8',
        },
      },
      fontFamily: {
        sans: ['Inter_400Regular', 'System'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '20px',
        pill: '50px',
      },
    },
  },
  plugins: [],
};
