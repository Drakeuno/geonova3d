// Cara de una mira nivelante de 3 m con graduación tipo "E", la más común en las miras de aluminio
// que se usan en Chile: cada 5 cm hay una E de tres barras de 1 cm (alternando lado), los números
// marcan decímetros (12 = 1,2 m) y el color cambia por metro (negro, rojo, negro).
// La imagen del anteojo es derecha (decisión del 19-oct-2026): los números se leen normales.

export const LARGO_MIRA_M = 3
export const ANCHO_MIRA_M = 0.045

export const COLORES_MIRA = {
  fondo: '#FBFBF5',
  negro: '#1B1B1B',
  rojo: '#C62828',
  borde: '#B5B5AC',
}

export interface RectMira {
  /** Horizontal, en fracción del ancho (0 = borde izquierdo). */
  u0: number
  u1: number
  /** Vertical, en metros desde el pie de la mira. */
  v0: number
  v1: number
  color: string
}

export interface NumeroMira extends RectMira {
  texto: string
}

const colorDelMetro = (v: number) => (Math.floor(v + 1e-9) % 2 === 0 ? COLORES_MIRA.negro : COLORES_MIRA.rojo)

/** Geometría de la franja [desdeM, hastaM] de la mira. */
export function geometriaMira(desdeM: number, hastaM: number): { rects: RectMira[]; numeros: NumeroMira[] } {
  const rects: RectMira[] = []
  const numeros: NumeroMira[] = []
  const primero = Math.max(0, Math.floor(desdeM / 0.05) - 1)
  const ultimo = Math.min(Math.round(LARGO_MIRA_M / 0.05) - 1, Math.ceil(hastaM / 0.05) + 1)

  for (let j = primero; j <= ultimo; j++) {
    const base = Math.round(j * 50) / 1000
    const color = colorDelMetro(base)
    const izquierda = j % 2 === 0
    // Tres barras de 1 cm separadas por 1 cm, y el lomo de la E por el lado exterior.
    for (const k of [0, 2, 4]) {
      const v0 = Math.round((base + k / 100) * 1000) / 1000
      rects.push({ u0: izquierda ? 0.06 : 0.5, u1: izquierda ? 0.5 : 0.94, v0, v1: Math.round((v0 + 0.01) * 1000) / 1000, color })
    }
    rects.push({ u0: izquierda ? 0.06 : 0.83, u1: izquierda ? 0.17 : 0.94, v0: base, v1: Math.round((base + 0.05) * 1000) / 1000, color })

    // Número del decímetro, en la mitad libre junto a la E de abajo.
    if (izquierda && j > 0) {
      const dm = j / 2
      numeros.push({ texto: String(dm), u0: 0.53, u1: 0.93, v0: base + 0.004, v1: base + 0.046, color })
    }
  }
  return { rects, numeros }
}
