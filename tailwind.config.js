/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'flash-gold': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '40%':      { backgroundColor: 'rgb(251 191 36 / 0.35)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.25s ease-out both',
        'flash-gold': 'flash-gold 0.6s ease-in-out',
      },
    },
  },
  plugins: [],
}
