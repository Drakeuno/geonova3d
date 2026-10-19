import type { Mm } from '@/motor/numeros'

// Óptica simplificada del anteojo. La cámara del anteojo se ubica a la altura de la línea de
// colimación y mira la mira; si el instrumento está mal nivelado, la visual se inclina y la cruz
// cae `desplazamientoMm` más arriba o más abajo (§14).

/** Alto de mira que se ve dentro del círculo del anteojo (m). */
export const VENTANA_ANTEOJO_M = 0.16

/** Campo visual vertical (grados) para ver `ventanaM` de mira a `distanciaM`. */
export const campoVisualGrados = (distanciaM: number, ventanaM = VENTANA_ANTEOJO_M) =>
  (2 * Math.atan(ventanaM / 2 / distanciaM) * 180) / Math.PI

/** Lectura de la mira donde cae la cruz: la verdadera más el error del montaje. */
export const lecturaEnLaCruzMm = (colimacionMm: Mm, cotaPuntoMm: Mm, desplazamientoMm: Mm): Mm =>
  colimacionMm - cotaPuntoMm + desplazamientoMm

/** Separación de los hilos estadimétricos respecto del central (m de mira): D / 200 con K = 100. */
export const semiIntervaloEstadimetricoM = (distanciaM: number) => distanciaM / 200
