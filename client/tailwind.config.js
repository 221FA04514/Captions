/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Light neutral app background layers
        surface: {
          50: '#FFFFFF',
          100: '#F7F8FA', // App background
          150: '#F2F4F7',
          200: '#ECEEF2',
          300: '#DFE2E8',
        },
        // Borders
        border: {
          DEFAULT: '#E6E8ED',
          subtle: '#EEF0F4',
          strong: '#D0D4DC',
        },
        // Professional Typography Text Colors
        text: {
          primary: '#20242C',
          secondary: '#737B89',
          muted: '#9EA5B1',
          dim: '#C4C9D3',
        },
        // Primary brand accent: #6258D9
        accent: {
          DEFAULT: '#6258D9',
          hover: '#5248CA',
          active: '#453AB8',
          light: '#F0EFFB',
          subtle: '#E5E3F8',
          border: '#D2CFF4',
        },
        // Functional status colors
        status: {
          success: '#16A36A',
          'success-bg': '#EAF7F0',
          warning: '#D99A32',
          'warning-bg': '#FDF6E9',
          error: '#D94B4B',
          'error-bg': '#FDEEEE',
          info: '#3B82F6',
          'info-bg': '#EFF6FF',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(16, 24, 40, 0.05)',
        dropdown: '0 4px 16px -2px rgba(16, 24, 40, 0.08), 0 2px 6px -1px rgba(16, 24, 40, 0.04)',
        modal: '0 20px 40px -12px rgba(16, 24, 40, 0.16), 0 8px 16px -4px rgba(16, 24, 40, 0.06)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
};
