import { z } from 'zod'

// Guiones del Cochayuyero por misión (§6.4 y RF-11): encargo, pistas, logro y rechazo por motivo.
// Viven en `public/datos/dialogos/cochayuyero.json` para ajustarlos en co-diseño sin recompilar.

const lineas = z.array(z.string().min(1)).min(1)

export const esquemaDialogoMision = z.object({
  encargo: lineas,
  /** Se ofrecen tras las entregas fallidas que fije el docente; una más por cada nueva falla. */
  pistas: lineas,
  logro: lineas,
  /** Retroalimentación al rechazar, según el primer criterio que falló. */
  rechazo: z.record(z.string(), z.string().min(1)),
})

export const esquemaDialogos = z.object({
  version: z.literal(1),
  personaje: z.string().min(1),
  misiones: z.record(z.string(), esquemaDialogoMision),
})

export type DialogoMision = z.infer<typeof esquemaDialogoMision>
export type Dialogos = z.infer<typeof esquemaDialogos>

/** Marcas que se pueden usar en los guiones; se rellenan con los datos de la misión y los parámetros. */
export const MARCAS_DIALOGO = ['pr', 'cotaPr', 'tolerancia', 'longitud', 'estacionamiento', 'escalaH', 'escalaV'] as const

export async function cargarDialogos(): Promise<Dialogos> {
  const respuesta = await fetch(`${import.meta.env.BASE_URL}datos/dialogos/cochayuyero.json`)
  if (!respuesta.ok) throw new Error(`No se pudo leer cochayuyero.json (HTTP ${respuesta.status})`)
  return esquemaDialogos.parse(await respuesta.json())
}

/** Pista que corresponde tras `fallas` entregas fallidas, o null si todavía no toca. */
export function pistaVigente(d: DialogoMision, fallas: number, fallasAntesDePista: number): string | null {
  if (fallas < fallasAntesDePista) return null
  return d.pistas[Math.min(fallas - fallasAntesDePista, d.pistas.length - 1)]
}
