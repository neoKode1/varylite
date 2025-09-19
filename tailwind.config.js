/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        // OKLCH Theme based on oklch(43.9% 0 0)
        primary: {
          50: 'oklch(95% 0 0)',
          100: 'oklch(90% 0 0)',
          200: 'oklch(80% 0 0)',
          300: 'oklch(70% 0 0)',
          400: 'oklch(60% 0 0)',
          500: 'oklch(43.9% 0 0)', // Base color
          600: 'oklch(35% 0 0)',
          700: 'oklch(28% 0 0)',
          800: 'oklch(22% 0 0)',
          900: 'oklch(18% 0 0)',
          950: 'oklch(12% 0 0)',
        },
        // Semantic color mappings - minimal and subtle theme (20% darker)
        background: {
          DEFAULT: '#dee2e6', // Much darker background
          dark: '#1a1a1a', // Dark mode background
        },
        foreground: {
          DEFAULT: '#212529', // Much darker text
          dark: '#ffffff', // Dark mode text
        },
        secondary: {
          DEFAULT: '#e9ecef', // Darker cards/panels
          dark: '#2a2a2a', // Dark mode cards/panels
        },
        muted: {
          DEFAULT: '#ced4da', // Much darker muted
          foreground: '#343a40', // Much darker muted text
          dark: '#404040', // Dark mode muted
          'foreground-dark': '#a0a0a0', // Dark mode muted text
        },
        accent: {
          DEFAULT: '#adb5bd', // Much darker accent
          foreground: '#212529', // Much darker text on accent
          dark: '#4a4a4a', // Dark mode accent
          'foreground-dark': '#ffffff', // Dark mode text on accent
        },
        destructive: {
          DEFAULT: '#dc3545', // Keep red for errors
          foreground: '#ffffff',
        },
        border: {
          DEFAULT: '#6c757d', // Much darker borders
          dark: '#404040', // Dark mode borders
        },
        input: {
          DEFAULT: '#e9ecef', // Much darker inputs
          dark: '#2a2a2a', // Dark mode inputs
        },
        ring: {
          DEFAULT: '#495057', // Much darker focus rings
          dark: '#666666', // Dark mode focus rings
        },
        // Legacy colors for backward compatibility
        'jet-black': 'oklch(12% 0 0)',
        'charcoal': 'oklch(22% 0 0)',
        'dark-gray': 'oklch(28% 0 0)',
        'medium-gray': 'oklch(35% 0 0)',
        'light-gray': 'oklch(60% 0 0)',
        'border-gray': 'oklch(60% 0 0)',
        'accent-gray': 'oklch(70% 0 0)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        // Minimal theme gradients - 20% darker and subtle
        'gradient-primary': 'linear-gradient(135deg, #dee2e6 0%, #e9ecef 100%)',
        'gradient-muted': 'linear-gradient(135deg, #ced4da 0%, #dee2e6 100%)',
        'gradient-accent': 'linear-gradient(135deg, #adb5bd 0%, #ced4da 100%)',
        // Legacy gradients
        'gradient-jet': 'linear-gradient(135deg, oklch(12% 0 0) 0%, oklch(22% 0 0) 100%)',
        'gradient-charcoal': 'linear-gradient(135deg, oklch(22% 0 0) 0%, oklch(28% 0 0) 100%)',
      },
      // Modern Tailwind features
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      // Modern spacing and sizing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      // Enhanced typography
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      // Modern backdrop effects
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    // Add modern plugins if needed
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}

