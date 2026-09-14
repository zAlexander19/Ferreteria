/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Colores tomados del logo: el aro negro, el naranja del centro, el
      // amarillo del cintillo y la crema del gorro. `tostado` es el naranja
      // oscurecido hasta que contrasta bien como color de texto sobre fondo
      // claro; el naranja puro no llega.
      colors: {
        masa: {
          carbon: '#2A1A12',
          naranja: '#F5821F',
          amarillo: '#FFC61A',
          tostado: '#9A4E09',
          crema: '#FFF6E8',
        },
      },
      boxShadow: {
        // El `inset` de arriba es lo que hace que la superficie se lea como
        // vidrio y no como una tarjeta blanca despintada: simula el canto
        // iluminado del borde superior.
        vidrio: '0 16px 48px -12px rgba(42, 26, 18, 0.28), 0 4px 12px -4px rgba(42, 26, 18, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
        'vidrio-alto': '0 32px 80px -16px rgba(42, 26, 18, 0.40), 0 8px 20px -6px rgba(42, 26, 18, 0.14), inset 0 1px 0 rgba(255, 255, 255, 1)',
      },
    },
  },
  plugins: [],
}
