import { bloqueosLibreta } from './comunes'
import { evaluarM11, MOTIVOS_M11 } from './m11'
import { bloqueosCompensacion, evaluarM12, MOTIVOS_M12 } from './m12'
import { bloqueosPerfil, evaluarM13, MOTIVOS_M13 } from './m13'
import type { ContextoEntrega, DefinicionMision, Evaluacion, IdMisionJugable, ResultadoEntrega } from './tipos'

// Misiones jugables. Las demás del catálogo siguen "en construcción" hasta su fase (F5 y F6).

interface MisionJugable extends DefinicionMision {
  motivos: readonly string[]
  bloqueos: (ctx: ContextoEntrega) => string[]
  evaluar: (ctx: ContextoEntrega) => Evaluacion
}

const sinBloqueos = () => []

export const MISIONES_JUGABLES: Record<IdMisionJugable, MisionJugable> = {
  '1.1': { id: '1.1', escenario: 'campus-uct', recorrido: '1.1', etapa: 'ninguna', motivos: MOTIVOS_M11, bloqueos: sinBloqueos, evaluar: evaluarM11 },
  '1.2': { id: '1.2', escenario: 'campus-uct', recorrido: '1.2', etapa: 'compensacion', motivos: MOTIVOS_M12, bloqueos: bloqueosCompensacion, evaluar: evaluarM12 },
  '1.3': { id: '1.3', escenario: 'campus-uct', recorrido: '1.3', etapa: 'perfil', motivos: MOTIVOS_M13, bloqueos: bloqueosPerfil, evaluar: evaluarM13 },
}

export const esJugable = (id: string): id is IdMisionJugable => id in MISIONES_JUGABLES

/**
 * Entrega de una misión: primero lo que bloquea (libreta incompleta o fuera del recorrido, etapa
 * propia sin llenar), que no cuenta como falla; si no hay bloqueos, la evaluación automática.
 */
export function entregarMision(id: IdMisionJugable, ctx: ContextoEntrega): ResultadoEntrega {
  const mision = MISIONES_JUGABLES[id]
  const deLibreta = bloqueosLibreta(ctx.registro, ctx.modo, ctx.lecturas)
  const motivos = deLibreta.length ? deLibreta : mision.bloqueos(ctx)
  return motivos.length ? { tipo: 'bloqueada', motivos } : { tipo: 'evaluada', evaluacion: mision.evaluar(ctx) }
}
