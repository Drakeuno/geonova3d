import { z } from 'zod'

// Parámetros configurables (§11 de la especificación). Viven en `public/datos/parametros.json`
// para que el co-diseño los ajuste sin recompilar; este esquema los valida al cargarlos.

export const PIELES_ACTO2 = ['red-del-agua', 'camino-pehuen', 'cero-cota'] as const
export type PielActo2 = (typeof PIELES_ACTO2)[number]

/** Modos de cálculo del desnivel en la libreta (§14). */
export const MODOS_DESNIVEL = ['automatico', 'asistido', 'manual'] as const
export type ModoDesnivel = (typeof MODOS_DESNIVEL)[number]

const positivo = z.number().positive()
const noNegativo = z.number().nonnegative()
const modo = z.enum(MODOS_DESNIVEL)

export const esquemaParametros = z
  .object({
    version: z.literal(1),
    /** T = coeficienteMm · √K mm, con K en km. */
    toleranciaCierre: z.object({ coeficienteMm: positivo }),
    /** Rango de lectura de la mira (m). Fija el desnivel máximo por estación: máxima − mínima. */
    lectura: z.object({
      minimaM: positivo,
      maximaM: positivo,
      largoMiraM: positivo,
      toleranciaExactaMm: noNegativo,
    }),
    comparacion: z.object({ toleranciaMm: noNegativo, compensacionMm: noNegativo }),
    /** Error máximo que introduce la burbuja descentrada (mm). */
    montaje: z.object({ errorMaximoMm: noNegativo }),
    perfil: z.object({ estacionamientoM: positivo, escalaHorizontal: positivo, escalaVertical: positivo }),
    acto2: z.object({
      piel: z.enum(PIELES_ACTO2),
      pendienteMinimaGravedadPct: positivo,
      pendienteMaximaTransitablePct: positivo,
      presionMinimaMca: positivo,
    }),
    modoDesnivel: z.object({ acto0: modo, acto2: modo, acto3: modo }),
    xp: z.object({
      lecturaExacta: noNegativo,
      porInsignia: z.object({ bronce: noNegativo, plata: noNegativo, oro: noNegativo, integrador: noNegativo }),
      bonusPrecision: z.object({ bajo5mm: noNegativo, bajo10mm: noNegativo }),
      bonusPrimeraSinErrores: noNegativo,
      bonusCooperativa: noNegativo,
      bonusAyuda: noNegativo,
      penalizacionTachadura: noNegativo,
    }),
    reintentos: z.object({ fallasAntesDePista: z.number().int().positive() }),
    evaluacionOral: z.object({
      aprobacionMinimaPct: z.number().min(0).max(100),
      evaluadores: z.number().int().min(2),
    }),
    /** Umbral de error grosero (mm): lecturas sembradas en 2.3 y 3.1. */
    errorGroseroMm: positivo,
  })
  .refine((p) => p.lectura.minimaM < p.lectura.maximaM && p.lectura.maximaM <= p.lectura.largoMiraM, {
    message: 'El rango de lectura debe cumplir mínima < máxima ≤ largo de la mira',
    path: ['lectura'],
  })

export type Parametros = z.infer<typeof esquemaParametros>

export async function cargarParametros(): Promise<Parametros> {
  const respuesta = await fetch(`${import.meta.env.BASE_URL}datos/parametros.json`)
  if (!respuesta.ok) throw new Error(`No se pudo leer parametros.json (HTTP ${respuesta.status})`)
  return esquemaParametros.parse(await respuesta.json())
}
