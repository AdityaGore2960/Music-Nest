/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Spotify-inspired dark theme
        'spotify-green': '#1DB954',
        'spotify-green-dark': '#1aa34a',
        'spotify-black': '#121212',
        'spotify-dark': '#181818',
        'spotify-card': '#282828',
        'spotify-hover': '#3E3E3E',
        'spotify-light': '#B3B3B3',
        'spotify-white': '#FFFFFF',
        'spotify-accent': '#1ED760',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'bounce-gentle': 'bounceGentle 1s infinite',
        'spin-slow': 'spin 8s linear infinite',
        'equalizer': 'equalizer 1.2s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(-5%)' },
          '50%': { transform: 'translateY(0)' },
        },
        equalizer: {
          '0%, 100%': { height: '4px' },
          '50%': { height: '16px' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'linear-gradient(135deg, #1DB954 0%, #121212 50%)',
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(29, 185, 84, 0.3)',
        'glow-green-lg': '0 0 40px rgba(29, 185, 84, 0.4)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}
