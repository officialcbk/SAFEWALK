/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Trayl rebrand tokens (see design handoff). Old purple/status/sos/
        // dark/gray tokens below are kept until every screen using them has
        // been migrated â remove once the rebrand covers the whole app.
        ink: '#0A0A0A',
        alert: '#E5342A',
        fill: '#F1F0ED',
        chip: '#EFEEEB',
        map: {
          base: '#E9E7E2',
          road: '#FFFFFF',
          block: '#DEDBD4',
        },
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
        // React Native has no font-weight synthesis for custom fonts â each
        // weight is its own named face, so weights are separate font-family
        // utilities rather than Tailwind's font-bold/font-semibold (those
        // only ever apply to System and would no-op here).
        sans: ['Archivo_400Regular', 'System'],
        'sans-medium': ['Archivo_500Medium', 'System'],
        'sans-semibold': ['Archivo_600SemiBold', 'System'],
        'sans-bold': ['Archivo_700Bold', 'System'],
        'sans-extrabold': ['Archivo_800ExtraBold', 'System'],
        mono: ['IBMPlexMono_400Regular', 'System'],
        'mono-medium': ['IBMPlexMono_500Medium', 'System'],
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
