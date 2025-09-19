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
        // Semantic color mappings
        background: 'oklch(44.4% 0.011 73.639)',
        foreground: 'oklch(95% 0 0)',
        muted: {
          DEFAULT: 'oklch(60% 0 0)',
          foreground: 'oklch(35% 0 0)',
        },
        accent: {
          DEFAULT: 'oklch(70% 0 0)',
          foreground: 'oklch(18% 0 0)',
        },
        destructive: {
          DEFAULT: 'oklch(50% 0.2 0)',
          foreground: 'oklch(95% 0 0)',
        },
        border: 'oklch(60% 0 0)',
        input: 'oklch(60% 0 0)',
        ring: 'oklch(43.9% 0 0)',
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
        // OKLCH theme gradients
        'gradient-primary': 'linear-gradient(135deg, oklch(43.9% 0 0) 0%, oklch(35% 0 0) 100%)',
        'gradient-muted': 'linear-gradient(135deg, oklch(60% 0 0) 0%, oklch(43.9% 0 0) 100%)',
        'gradient-accent': 'linear-gradient(135deg, oklch(70% 0 0) 0%, oklch(60% 0 0) 100%)',
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

