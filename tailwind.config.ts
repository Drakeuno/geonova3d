import type { Config } from 'tailwindcss'
import { paleta } from './src/estilos/paleta'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: paleta,
      fontFamily: {
        display: ['Bitter', 'Georgia', 'serif'],
        sans: ['"Source Sans 3"', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(59, 42, 30, 0.10), 0 1px 2px rgba(59, 42, 30, 0.06)',
        pop: '0 10px 30px -10px rgba(58, 85, 48, 0.40)',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.35s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config
