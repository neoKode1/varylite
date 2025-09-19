module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      // Modern browser support
      flexbox: 'no-2009',
      grid: 'autoplace',
    },
    // Add CSS nesting support for modern CSS features
    'postcss-nesting': {},
    // Add CSS custom properties support
    'postcss-custom-properties': {
      preserve: false,
    },
    // Add CSS import support
    'postcss-import': {},
  },
}
