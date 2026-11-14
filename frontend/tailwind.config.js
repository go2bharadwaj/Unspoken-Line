/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvasPaper: '#FAF6EE',
        turmericMist: '#F5E6C4',
        sunlitAmber: '#F2C97D',
        peachTerracotta: '#E8997A',
        blushClay: '#D97B66',
        espressoInk: '#2C221E',
        warmUmber: '#6E5D53',
        sageCalm: '#7A9A8B',
        borderHairline: '#E6DEC8',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      transitionTimingFunction: {
        sanctuary: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
