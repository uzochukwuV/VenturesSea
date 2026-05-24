import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'warm-canvas': '#fbfaf9',
        'stone-surface': '#f2f0ed',
        'parchment-card': '#f8f7f4',
        graphite: '#474645',
        charcoal: '#343433',
        midnight: '#121212',
        'ember-orange': '#ff3e00',
        'meadow-green': '#00ca48',
        'sky-blue': '#0090ff',
        'sunburst-yellow': '#ffbb26',
      },
      fontFamily: {
        family: ['Fraunces', 'serif'],
        inter: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '10px',
        'cards': '10px',
        'buttons': '32px',
        'illustrations': '72px',
      },
    },
  },
  plugins: [],
};

export default config;
