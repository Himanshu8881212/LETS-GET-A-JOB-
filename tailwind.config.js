/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: 'rgb(var(--brand-ink))',
          slate: 'rgb(var(--brand-slate))',
          steel: 'rgb(var(--brand-steel))',
          mist: 'rgb(var(--brand-mist))',
          accent: 'rgb(var(--brand-accent))',
          border: 'rgb(var(--brand-border))',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        soft: '0 20px 45px -35px rgba(15, 23, 42, 0.5)',
      },
      keyframes: {
        'spin-fast': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { opacity: '0.45' },
          '50%': { opacity: '0.85' },
          '100%': { opacity: '0.45' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(2px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'spin-fast': 'spin-fast 0.6s linear infinite',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
        'fade-in': 'fade-in 140ms ease-out',
      },
      transitionDuration: {
        150: '150ms',
      },
    },
  },
  plugins: [],
}
