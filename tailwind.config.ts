import type { Config } from 'tailwindcss';

/**
 * Design tokens follow a Linear/Raycast-inspired aesthetic: a calm dark surface
 * palette, a single vivid accent, restrained radii, and soft elevation shadows.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surfaces (dark-first)
        bg: {
          base: '#0b0c0f',
          subtle: '#111318',
          muted: '#15181f',
          raised: '#1a1d26',
          overlay: '#21242e',
        },
        border: {
          subtle: '#23262f',
          DEFAULT: '#2b2f3a',
          strong: '#3a3f4d',
        },
        content: {
          primary: '#e8eaf0',
          secondary: '#a4abb8',
          tertiary: '#6b7280',
          inverse: '#0b0c0f',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#7c7ff5',
          muted: '#312e81',
          subtle: 'rgba(99,102,241,0.12)',
        },
        success: '#34d399',
        warning: '#fbbf24',
        danger: '#f87171',
        star: '#fbbf24',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02)',
        raised: '0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
        overlay:
          '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        glow: '0 0 0 1px rgba(99,102,241,0.4), 0 4px 24px rgba(99,102,241,0.25)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97) translateY(4px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
