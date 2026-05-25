/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#006241',    // Starbucks Green
          accent: '#00754A',     // Green Accent
          house: '#1E3932',      // House Green
          uplift: '#2b5148',     // Green Uplift
          light: '#d4e9e2',      // Green Light
        },
        gold: {
          DEFAULT: '#cba258',
          light: '#dfc49d',
          lightest: '#faf6ee',
        },
        canvas: {
          DEFAULT: '#f2f0eb',    // Neutral Warm (Primary Background)
          ceramic: '#ffffff',    // White
          cool: '#f9f9f9',       // Neutral Cool
          dark: '#edebe9',       // Ceramic
        },
        text: {
          main: 'rgba(0, 0, 0, 0.87)',
          soft: 'rgba(0, 0, 0, 0.58)',
          white: '#ffffff',
          whiteSoft: 'rgba(255, 255, 255, 0.70)',
          rewards: '#33433d',
        },
        semantic: {
          destructive: '#c82014',
          warning: '#fbbc05',
          success: '#00754A',
        }
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'pill': '50px',
        'card': '12px',
        'card-sm': '12px',
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.14)',
        'nav': '0 -2px 10px rgba(0, 0, 0, 0.05)',
        'frap-base': '0 0 6px rgba(0,0,0,0.24)',
        'frap-ambient': '0 8px 12px rgba(0,0,0,0.14)',
        'glow': '0 0 0 3px rgba(0, 117, 74, 0.3)',
      },
      letterSpacing: {
        tight: '-0.16px',
      }
    },
  },
  plugins: [],
}
