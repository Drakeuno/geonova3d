import { z } from 'zod'
import { MISIONES } from './misiones'

// Cuadrillas del curso (§2, RF-06): 3 o 4 integrantes. Mientras no haya servidor, el resto del curso
// es simulado y vive en `public/datos/cuadrillas.json`, editable sin recompilar. Los nombres de las
// cuadrillas son provisorios hasta el Taller 2 (§13).

const IDS_MISION = MISIONES.map((m) => m.id) as [string, ...string[]]
const idMision = z.enum(IDS_MISION)
export const esGrupal = (misionId: string) => MISIONES.find((m) => m.id === misionId)?.insignia.grupal ?? false

/** Cómo aprobó una misión: define su XP con las mismas reglas que al jugador (§6.2). */
const esquemaDesempeno = z.object({
  lecturasExactas: z.number().int().nonnegative().default(0),
  errorCierreMm: z.number().int().optional(),
  toleranciaCierreMm: z.number().positive().optional(),
  sinErroresRegistro: z.boolean().default(false),
})

const esquemaIntegrante = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  /** Juega en este navegador (un usuario de la demo): su avance sale de su viaje, no del roster. */
  jugador: z.boolean().default(false),
  /**
   * Compañero simulado de la cuadrilla del jugador: aprueba lo mismo que el jugador, salvo desde la
   * misión en que se atasca, hasta que alguien lo ayude.
   */
  sigueAlJugador: z.boolean().default(false),
  /** Misiones individuales aprobadas (integrantes que no siguen al jugador). */
  aprobadas: z.array(idMision).default([]),
  /** Desempeño en cada misión que apruebe; si falta, aprueba sin lecturas exactas ni bonus. */
  desempeno: z.partialRecord(idMision, esquemaDesempeno).default({}),
  tachaduras: z.number().int().nonnegative().default(0),
  /** Misión en que se atascó y su pedido de ayuda. */
  atasco: z.object({ mision: idMision, pedido: z.string().min(10) }).optional(),
})

const esquemaCuadrilla = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  integrantes: z.array(esquemaIntegrante).min(3).max(4),
  /** Misiones grupales (2.3, 3.3) aprobadas por la cuadrilla, con su cierre. Solo cuadrillas simuladas. */
  grupales: z.partialRecord(idMision, esquemaDesempeno).default({}),
})

export const esquemaCuadrillas = z
  .object({
    version: z.literal(1),
    /** Segundos que tarda un compañero simulado en aceptar la ayuda y en aprobar la misión con ella. */
    simulacion: z.object({ aceptaTrasSegundos: z.number().nonnegative(), apruebaTrasSegundos: z.number().nonnegative() }),
    cuadrillas: z.array(esquemaCuadrilla).min(1),
  })
  .superRefine((datos, ctx) => {
    const problema = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message })
    const ids = datos.cuadrillas.flatMap((c) => c.integrantes.map((i) => i.id))
    const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i)
    if (repetidos.length) problema(`Integrantes repetidos: ${repetidos.join(', ')}`)

    for (const c of datos.cuadrillas) {
      const jugadores = c.integrantes.filter((i) => i.jugador)
      // Dos jugadores reales sumarían dos veces el XP de las misiones grupales.
      if (jugadores.length > 1) problema(`${c.nombre}: solo un jugador por cuadrilla en la demo`)
      if (jugadores.length && Object.keys(c.grupales).length) problema(`${c.nombre}: las grupales del jugador salen de su viaje`)
      for (const m of Object.keys(c.grupales)) if (!esGrupal(m)) problema(`${c.nombre}: la ${m} no es grupal`)
      for (const i of c.integrantes) {
        if (i.sigueAlJugador && (i.jugador || !jugadores.length)) problema(`${i.nombre}: solo sigue al jugador un compañero de su cuadrilla`)
        if (i.aprobadas.some(esGrupal)) problema(`${i.nombre}: las misiones grupales las aprueba la cuadrilla`)
        if (i.atasco && esGrupal(i.atasco.mision)) problema(`${i.nombre}: no se atasca en una misión grupal`)
        if (i.atasco && i.aprobadas.includes(i.atasco.mision)) problema(`${i.nombre}: ya aprobó la misión en que se atasca`)
      }
    }
  })

export type Roster = z.infer<typeof esquemaCuadrillas>
export type CuadrillaRoster = Roster['cuadrillas'][number]
export type IntegranteRoster = CuadrillaRoster['integrantes'][number]
export type DesempenoRoster = z.infer<typeof esquemaDesempeno>

export async function cargarCuadrillas(): Promise<Roster> {
  const respuesta = await fetch(`${import.meta.env.BASE_URL}datos/cuadrillas.json`)
  if (!respuesta.ok) throw new Error(`No se pudo leer cuadrillas.json (HTTP ${respuesta.status})`)
  return esquemaCuadrillas.parse(await respuesta.json())
}
