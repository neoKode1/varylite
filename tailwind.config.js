/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // New jet black and gray theme
        'jet-black': '#0a0a0a',
        'charcoal': '#1a1a1a',
        'dark-gray': '#2a2a2a',
        'medium-gray': '#3a3a3a',
        'light-gray': '#4a4a4a',
        'border-gray': '#333333',
        'accent-gray': '#666666',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        // New theme gradients
        'gradient-jet': 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        'gradient-charcoal': 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
      },
    },
  },
  plugins: [],
}

