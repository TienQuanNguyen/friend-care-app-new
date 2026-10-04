/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  future: {
    // Enable v4 compat for better mobile support
  },
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3B99BC',    // Ocean blue chủ đạo
          accent: '#2882A4',     // Đại dương sâu hơn chút
          house: '#155F7A',      // Deep coastal blue
          uplift: '#4EAEC8',     // Sky-ocean giao thoa
          light: '#CBE9F4',      // Sea mist nhạt
          pale: '#E8F5FB',       // Bọt biển siêu nhạt
        },
        cactus: {
          DEFAULT: '#6DB49A',    // Xanh xương rồng sage
          light: '#A8D5C0',      // Xương rồng nhạt
          pale: '#E0F4EC',       // Rất nhạt, gần trắng
          dark: '#4A8E78',       // Xương rồng đậm
        },
        sand: {
          DEFAULT: '#C9A97A',    // Cát biển vàng nhẹ
          light: '#EDD9B8',      // Cát nhạt
          pale: '#FBF4E8',       // Trắng cát
        },
        coral: {
          DEFAULT: '#E8937A',    // San hô nhẹ
          soft: '#F7DDD5',       // San hô siêu nhạt
        },
        canvas: {
          DEFAULT: '#EFF8FC',    // Background chính: trắng biển nhạt
          ceramic: '#FFFFFF',    // Trắng tinh
          cool: '#F5FAFD',       // Rất nhạt
          dark: '#D4EBF5',       // Viền nhạt
        },
        text: {
          main: '#0D3547',       // Chữ chính: xanh đêm biển
          soft: '#3D6979',       // Chữ phụ: muted teal
          muted: '#6A8E9B',      // Chữ mờ
          white: '#ffffff',
          whiteSoft: 'rgba(255, 255, 255, 0.75)',
          rewards: '#155F7A',
        },
        semantic: {
          destructive: '#C8455A',
          warning: '#D9913A',
          success: '#4A9E82',
        }
      },
      fontFamily: {
        sans: ['"Nunito"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Lora"', 'Georgia', 'serif'],
      },
      borderRadius: {
        'pill': '50px',
        'card': '20px',
        'card-sm': '14px',
      },
      boxShadow: {
        'card': '0 4px 24px -6px rgba(13, 53, 71, 0.10), 0 1px 4px rgba(59, 153, 188, 0.06)',
        'card-hover': '0 8px 32px -8px rgba(13, 53, 71, 0.16), 0 2px 8px rgba(59, 153, 188, 0.10)',
        'nav': '0 4px 24px -8px rgba(13, 53, 71, 0.16), 0 1px 0 rgba(255,255,255,0.9) inset',
        'frap-base': '0 4px 16px rgba(59, 153, 188, 0.28)',
        'frap-ambient': '0 8px 28px -10px rgba(13, 53, 71, 0.40)',
        'glow': '0 0 0 3px rgba(59, 153, 188, 0.20)',
        'cactus': '0 4px 16px rgba(109, 180, 154, 0.24)',
      },
      letterSpacing: {
        tight: '-0.01em',
      },
      // iOS safe area spacing
      spacing: {
        'safe-top':    'env(safe-area-inset-top,    0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-left':   'env(safe-area-inset-left,   0px)',
        'safe-right':  'env(safe-area-inset-right,  0px)',
      },
      height: {
        'dvh': '100dvh',
        'svh': '100svh',
        'lvh': '100lvh',
        // MobileNav top bar height + iOS safe area top
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
      },
      minHeight: {
        'dvh': '100dvh',
      },
      width: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
      },
    },
  },
  plugins: [],
}
