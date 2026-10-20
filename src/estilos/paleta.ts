// Paleta de GeoNova3D, tomada de las dos imágenes del Cochayuyero (Puerto Saavedra y Ñielol).
// Es la única fuente de los colores: la usan Tailwind (`tailwind.config.ts`), las escenas 3D y la
// prueba de contraste AA (`paleta.test.ts`).

export const paleta = {
  /** Follaje del Ñielol. Color primario. */
  bosque: {
    50: '#F1F5EC',
    100: '#E0EAD3',
    200: '#C3D6AE',
    300: '#9DB97F',
    400: '#7A9A5C',
    500: '#5E7F45',
    600: '#4A6A36',
    700: '#3A5530',
    800: '#2C4127',
    900: '#1F2E1C',
  },
  /** Azul marino del poncho. Color secundario. */
  poncho: {
    50: '#EEF0F5',
    100: '#DDE1EA',
    200: '#BCC3D3',
    300: '#8E99B3',
    400: '#66739A',
    500: '#4A5878',
    600: '#3A4663',
    700: '#2C3550',
    800: '#222A40',
    900: '#1A2033',
  },
  /** Franjas del poncho. Errores y énfasis. */
  granate: {
    50: '#FAEEEF',
    100: '#F3DADC',
    200: '#E6B3B7',
    300: '#D3858B',
    400: '#BE5A61',
    500: '#A63A3F',
    600: '#8F3239',
    700: '#7A2E3A',
    800: '#5E2430',
    900: '#431A23',
  },
  /** Pelaje de los bueyes. Acento, XP y logros. */
  buey: {
    50: '#FBF2EA',
    100: '#F6E3D2',
    200: '#EDC6A5',
    300: '#E0A06A',
    400: '#CD8048',
    500: '#B8642E',
    600: '#A05424',
    700: '#8A4520',
    800: '#6B361B',
    900: '#4E2815',
  },
  /** Camino, sombrero y cochayuyo. Neutros cálidos: el 50 es el papel de la libreta. */
  tierra: {
    50: '#FAF6EE',
    100: '#F0E7D6',
    200: '#E2D3B8',
    300: '#CDB894',
    400: '#AE906C',
    500: '#8A6A4A',
    600: '#73573C',
    700: '#5C4330',
    800: '#4A3526',
    900: '#3B2A1E',
  },
  /** Cielo nublado y mar de Puerto Saavedra. Neutros fríos. */
  costa: {
    50: '#F3F5F5',
    100: '#E7EAEA',
    200: '#CFD5D6',
    300: '#AEB6B9',
    400: '#8D989C',
    500: '#6E8A8C',
    600: '#5A7576',
    700: '#4A6263',
    800: '#3B4E4F',
    900: '#2C3B3C',
  },
  /** Metales de las insignias. */
  insignia: {
    bronce: '#A8683A',
    plata: '#8E979F',
    oro: '#C79A2B',
    platino: '#7FA7B5',
    /** Insignia especial (todas + 3 ayudas): el granate de las franjas del poncho. */
    especial: '#A63A3F',
  },
} as const
