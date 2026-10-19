import { COLORES_MIRA, geometriaMira } from './geometriaMira'

/**
 * Dibuja la franja [desdeM, hastaM] de la mira sobre un lienzo 2D. El borde superior del lienzo es
 * `hastaM`. Si se da `x0` y `anchoMira`, la mira ocupa solo esa franja horizontal (anteojo 2D).
 */
export function dibujarMira(
  ctx: CanvasRenderingContext2D,
  anchoPx: number,
  altoPx: number,
  desdeM: number,
  hastaM: number,
  x0 = 0,
  anchoMira = anchoPx,
) {
  const yPx = (v: number) => ((hastaM - v) / (hastaM - desdeM)) * altoPx
  const xPx = (u: number) => x0 + u * anchoMira
  const { rects, numeros } = geometriaMira(desdeM, hastaM)

  ctx.fillStyle = COLORES_MIRA.fondo
  ctx.fillRect(x0, 0, anchoMira, altoPx)

  for (const r of rects) {
    ctx.fillStyle = r.color
    const y0 = yPx(r.v1)
    ctx.fillRect(xPx(r.u0), y0, xPx(r.u1) - xPx(r.u0), yPx(r.v0) - y0)
  }

  for (const n of numeros) {
    const alto = yPx(n.v0) - yPx(n.v1)
    const ancho = xPx(n.u1) - xPx(n.u0)
    ctx.save()
    ctx.fillStyle = n.color
    ctx.font = `bold ${alto}px Arial, Helvetica, sans-serif`
    ctx.textBaseline = 'bottom'
    const medido = ctx.measureText(n.texto).width || 1
    // Números angostos, como en las miras reales: se comprimen para caber en la mitad libre.
    ctx.translate(xPx(n.u0), yPx(n.v0))
    ctx.scale(Math.min(1, ancho / medido), 1)
    ctx.fillText(n.texto, 0, 0)
    ctx.restore()
  }

  ctx.strokeStyle = COLORES_MIRA.borde
  ctx.lineWidth = Math.max(1, anchoMira * 0.02)
  ctx.strokeRect(x0, -1, anchoMira, altoPx + 2)
}
