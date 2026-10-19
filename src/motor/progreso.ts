// Estados de cada misión y avance del viaje (§14): bloqueada → disponible → en_curso →
// en_evaluación → aprobada | a_reintentar. Reintentos ilimitados y sin penalización.

export type EstadoMision = 'bloqueada' | 'disponible' | 'en_curso' | 'en_evaluacion' | 'aprobada' | 'a_reintentar'

export interface ProgresoMision {
  estado: EstadoMision
  /** Entregas fallidas acumuladas. Tras 2, el Cochayuyero ofrece una pista. */
  fallas: number
  /** Momento de la primera aprobación. Se conserva aunque se vuelva a jugar la misión. */
  aprobadaEn: number | null
}

export type Viaje = Record<string, ProgresoMision>

export class TransicionInvalida extends Error {}

/** Viaje nuevo: la primera misión disponible, el resto bloqueadas. */
export function viajeInicial(orden: string[]): Viaje {
  return Object.fromEntries(
    orden.map((id, i): [string, ProgresoMision] => [id, { estado: i === 0 ? 'disponible' : 'bloqueada', fallas: 0, aprobadaEn: null }]),
  )
}

function exigir(viaje: Viaje, id: string, desde: EstadoMision[], accion: string): ProgresoMision {
  const p = viaje[id]
  if (!p) throw new TransicionInvalida(`La misión ${id} no existe`)
  if (!desde.includes(p.estado)) throw new TransicionInvalida(`No se puede ${accion} la misión ${id} en estado ${p.estado}`)
  return p
}

/** Empezar o reintentar. Una misión aprobada se puede volver a jugar, sin nueva recompensa. */
export function iniciar(viaje: Viaje, id: string): Viaje {
  const p = exigir(viaje, id, ['disponible', 'a_reintentar', 'aprobada'], 'iniciar')
  return { ...viaje, [id]: { ...p, estado: 'en_curso' } }
}

export function entregar(viaje: Viaje, id: string): Viaje {
  const p = exigir(viaje, id, ['en_curso'], 'entregar')
  return { ...viaje, [id]: { ...p, estado: 'en_evaluacion' } }
}

/**
 * Resultado de la evaluación (automática, o del docente en 3.2 y 3.3). Al aprobar por primera vez
 * otorga la recompensa y desbloquea la misión siguiente.
 */
export function resolver(
  viaje: Viaje,
  orden: string[],
  id: string,
  aprobada: boolean,
  ahora: number,
): { viaje: Viaje; otorgaRecompensa: boolean } {
  const p = exigir(viaje, id, ['en_evaluacion'], 'resolver')
  if (!aprobada) return { viaje: { ...viaje, [id]: { ...p, estado: 'a_reintentar', fallas: p.fallas + 1 } }, otorgaRecompensa: false }

  const otorgaRecompensa = p.aprobadaEn === null
  const nuevo: Viaje = { ...viaje, [id]: { ...p, estado: 'aprobada', aprobadaEn: p.aprobadaEn ?? ahora } }
  const siguiente = orden[orden.indexOf(id) + 1]
  if (siguiente && nuevo[siguiente]?.estado === 'bloqueada') nuevo[siguiente] = { ...nuevo[siguiente], estado: 'disponible' }
  return { viaje: nuevo, otorgaRecompensa }
}

export const ofrecePista = (p: ProgresoMision, fallasAntesDePista = 2) => p.fallas >= fallasAntesDePista

export const estaAprobada = (p: ProgresoMision) => p.aprobadaEn !== null

/** Interruptor docente para demos: desbloquea todas las misiones. */
export function abrirTodas(viaje: Viaje): Viaje {
  return Object.fromEntries(
    Object.entries(viaje).map(([id, p]) => [id, p.estado === 'bloqueada' ? { ...p, estado: 'disponible' as const } : p]),
  )
}
