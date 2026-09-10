/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        dark: {
          bg: '#090d16',
          card: '#111827',
          border: '#1f293d',
          hover: '#1e293b',
        },
        pv: {
          primary: '#38bdf8',
          glow: 'rgba(56, 189, 248, 0.25)',
        },
        bat: {
          primary: '#10b981',
          glow: 'rgba(16, 185, 129, 0.25)',
        },
        solar: {
          yellow: '#f59e0b',
        }
      }
    },
  },
  plugins: [],
}
