import type { MisionCatalogo } from '@/datos/misiones'
import type { CuadrillaCurso, Curso, IntegranteCurso } from './cuadrillas'
import type { Viaje } from './progreso'

// Seguimiento por cuadrilla para el panel docente (RF-08): en qué está cada integrante en cada
// misión y qué requiere atención (atascos, pistas ya ofrecidas, defensas por evaluar).

export type EstadoCelda = 'aprobada' | 'en_evaluacion' | 'a_reintentar' | 'atascado' | 'en_curso' | 'disponible' | 'pendiente'

export interface Celda {
  estado: EstadoCelda
  /** Entregas fallidas (solo se conocen las de quien juega). */
  fallas: number
}

/**
 * Estado de un integrante en una misión. Del jugador sale de su viaje, con las fallas; de un
 * compañero simulado, de lo que aprobó y de dónde va. Las grupales las aprueba la cuadrilla.
 */
export function celda(integrante: IntegranteCurso, cuadrilla: CuadrillaCurso, mision: MisionCatalogo, viaje: Viaje | undefined): Celda {
  const aprobada = mision.insignia.grupal ? cuadrilla.grupales.includes(mision.id) : integrante.aprobadas.includes(mision.id)
  if (integrante.jugador) {
    const p = viaje?.[mision.id]
    const fallas = p?.fallas ?? 0
    if (aprobada || p?.aprobadaEn != null) return { estado: 'aprobada', fallas }
    if (!p || p.estado === 'bloqueada') return { estado: 'pendiente', fallas }
    return { estado: p.estado === 'aprobada' ? 'aprobada' : p.estado, fallas }
  }
  if (aprobada) return { estado: 'aprobada', fallas: 0 }
  const s = integrante.situacion
  if (s.tipo !== 'completo' && s.mision === mision.id) return { estado: s.tipo === 'atascado' ? 'atascado' : 'en_curso', fallas: 0 }
  return { estado: 'pendiente', fallas: 0 }
}

export type MotivoAlerta = 'atascado' | 'pista' | 'defensa'

export interface Alerta {
  cuadrilla: string
  integrante: IntegranteCurso
  misionId: string
  motivo: MotivoAlerta
  fallas: number
}

/**
 * Lo que requiere atención del docente: quien pide ayuda, quien ya recibió pistas del Cochayuyero
 * por fallar varias veces, y las defensas que esperan a la comisión.
 */
export function alertas(curso: Curso, misiones: MisionCatalogo[], viajes: Record<string, Viaje>, fallasAntesDePista: number): Alerta[] {
  const orden: Record<MotivoAlerta, number> = { defensa: 0, pista: 1, atascado: 2 }
  return curso.cuadrillas
    .flatMap((c) =>
      c.integrantes.flatMap((i) =>
        misiones.flatMap((m): Alerta[] => {
          const { estado, fallas } = celda(i, c, m, viajes[i.id])
          const base = { cuadrilla: c.nombre, integrante: i, misionId: m.id, fallas }
          if (estado === 'en_evaluacion' && m.evidenciaExterna) return [{ ...base, motivo: 'defensa' }]
          if (estado === 'a_reintentar' && fallas >= fallasAntesDePista) return [{ ...base, motivo: 'pista' }]
          if (estado === 'atascado') return [{ ...base, motivo: 'atascado' }]
          return []
        }),
      ),
    )
    .sort((a, b) => orden[a.motivo] - orden[b.motivo])
}
