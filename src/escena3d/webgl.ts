let soporta: boolean | null = null

/** El equipo puede dibujar en 3D. Si no, se usan las vistas 2D equivalentes. */
export function soportaWebGL(): boolean {
  if (soporta === null) {
    try {
      const lienzo = document.createElement('canvas')
      soporta = Boolean(lienzo.getContext('webgl2') ?? lienzo.getContext('webgl'))
    } catch {
      soporta = false
    }
  }
  return soporta
}
