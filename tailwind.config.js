/** @type {import('tailwindcss').Config} */
// Tokens do padrão Junco (PADROES-JUNCO.md §3, referência: Captação de Tendências).
export default {
  content: ['./index.html', './*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { red: '#B91C1C', purple: '#6B21A8' },
        navy: '#1B2A4A',
        purple: { junco: '#5F4F9A' },
        yellow: { junco: '#FABF29' },
        orange: { junco: '#EE7C1F' },
        green: { junco: '#AECB28' },
        blue: { junco: '#1D8BD0', text: '#17699F' },
        pink: { junco: '#D60052' },
        paper: '#FBFAF7',
        line: '#E4E2DA',
        muted: '#59647A',
      },
      fontFamily: {
        sans: ['Barlow', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        condensed: ['"Barlow Semi Condensed"', 'Barlow', 'sans-serif'],
      },
      boxShadow: {
        modal: '0 20px 60px rgba(0,0,0,.25)',
      },
    },
  },
  plugins: [],
};
