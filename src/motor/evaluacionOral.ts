// Evaluación oral de 3.2 y 3.3 (§14): rúbrica de 4 criterios con escala 1–4; cada evaluador aprueba
// si su promedio alcanza el 60 %; la comisión decide por mayoría. Si son 2 y empatan, resuelve el docente.

export const CRITERIOS = ['claridad', 'justificacion', 'preguntas', 'terminologia'] as const
export type Criterio = (typeof CRITERIOS)[number]

export const NOMBRES_CRITERIO: Record<Criterio, string> = {
  claridad: 'Claridad de procedimientos',
  justificacion: 'Justificación técnica',
  preguntas: 'Manejo de preguntas',
  terminologia: 'Terminología',
}

export interface EvaluacionEvaluador {
  evaluadorId: string
  esDocente: boolean
  puntajes: Record<Criterio, number>
}

/** Promedio del evaluador como porcentaje del máximo (4). */
export function porcentajeEvaluador(e: EvaluacionEvaluador): number {
  for (const c of CRITERIOS) {
    const p = e.puntajes[c]
    if (!Number.isInteger(p) || p < 1 || p > 4) throw new RangeError(`Puntaje fuera de escala en ${c}: ${p}`)
  }
  const promedio = CRITERIOS.reduce((s, c) => s + e.puntajes[c], 0) / CRITERIOS.length
  return (promedio / 4) * 100
}

export interface Veredicto {
  aprobada: boolean
  votosFavor: number
  votosContra: number
  /** El docente resolvió un empate. */
  desempateDocente: boolean
}

export function veredictoComision(evaluaciones: EvaluacionEvaluador[], aprobacionMinimaPct = 60): Veredicto {
  if (evaluaciones.length < 2) throw new RangeError('La comisión necesita al menos 2 evaluadores')
  const votos = evaluaciones.map((e) => ({ e, aprueba: porcentajeEvaluador(e) >= aprobacionMinimaPct }))
  const votosFavor = votos.filter((v) => v.aprueba).length
  const votosContra = votos.length - votosFavor
  if (votosFavor !== votosContra) return { aprobada: votosFavor > votosContra, votosFavor, votosContra, desempateDocente: false }

  const docente = votos.find((v) => v.e.esDocente)
  if (!docente) throw new Error('Hay empate y no hay docente en la comisión para resolverlo')
  return { aprobada: docente.aprueba, votosFavor, votosContra, desempateDocente: true }
}
