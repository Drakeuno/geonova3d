import type { Parametros, PielActo2 } from '@/datos/parametros'
import type { Tramo } from '@/motor/cooperativa'
import { bloqueosLibreta } from './comunes'
import { evaluarM11, MOTIVOS_M11 } from './m11'
import { bloqueosCompensacion, evaluarM12, MOTIVOS_M12 } from './m12'
import { bloqueosPerfil, evaluarM13, MOTIVOS_M13 } from './m13'
import {
  bloqueosAgua,
  bloqueosCeroCota,
  bloqueosPehuen,
  evaluarAgua,
  evaluarCeroCota,
  evaluarPehuen,
  MOTIVOS_AGUA,
  MOTIVOS_CERO_COTA,
  MOTIVOS_PEHUEN,
} from './m21'
import { bloqueosM22, evaluarM22, MOTIVOS_M22 } from './m22'
import { bloqueosM23, evaluarM23, MOTIVOS_M23, recorridoDeTramo } from './m23'
import type { ContextoEntrega, Etapa, Evaluacion, IdMisionJugable, ResultadoEntrega } from './tipos'

// Misiones jugables. Las demás del catálogo siguen "en construcción" hasta su fase (F6).

export interface ConfigMision {
  escenario: string
  /** Recorrido del escenario que se nivela. Su primera visada es el PR de partida. */
  recorrido: string
  etapa: Etapa
  /** Clave de los guiones del Cochayuyero en `cochayuyero.json`. */
  dialogo: string
  motivos: readonly string[]
  bloqueos: (ctx: ContextoEntrega) => string[]
  evaluar: (ctx: ContextoEntrega) => Evaluacion
}

const sinBloqueos = () => []

/** La 2.1 cambia de terreno y de pregunta según la piel del Acto 2 que fije el docente (RF-12). */
const PIELES_2_1: Record<PielActo2, Omit<ConfigMision, 'recorrido'>> = {
  'red-del-agua': { escenario: 'rural-red-del-agua', etapa: 'decision-agua', dialogo: '2.1@red-del-agua', motivos: MOTIVOS_AGUA, bloqueos: bloqueosAgua, evaluar: evaluarAgua },
  'camino-pehuen': { escenario: 'rural-pehuen', etapa: 'decision-pehuen', dialogo: '2.1@camino-pehuen', motivos: MOTIVOS_PEHUEN, bloqueos: bloqueosPehuen, evaluar: evaluarPehuen },
  'cero-cota': { escenario: 'rural-cero-cota', etapa: 'decision-cero-cota', dialogo: '2.1@cero-cota', motivos: MOTIVOS_CERO_COTA, bloqueos: bloqueosCeroCota, evaluar: evaluarCeroCota },
}

export interface OpcionesMision {
  piel: PielActo2
  /** Tramo de quien juega la 2.3. */
  tramo?: Tramo
}

export function configMision(id: IdMisionJugable, { piel, tramo = 'A' }: OpcionesMision): ConfigMision {
  switch (id) {
    case '1.1':
      return { escenario: 'campus-uct', recorrido: '1.1', etapa: 'ninguna', dialogo: '1.1', motivos: MOTIVOS_M11, bloqueos: sinBloqueos, evaluar: evaluarM11 }
    case '1.2':
      return { escenario: 'campus-uct', recorrido: '1.2', etapa: 'compensacion', dialogo: '1.2', motivos: MOTIVOS_M12, bloqueos: bloqueosCompensacion, evaluar: evaluarM12 }
    case '1.3':
      return { escenario: 'campus-uct', recorrido: '1.3', etapa: 'perfil', dialogo: '1.3', motivos: MOTIVOS_M13, bloqueos: bloqueosPerfil, evaluar: evaluarM13 }
    case '2.1':
      return { ...PIELES_2_1[piel], recorrido: '2.1' }
    case '2.2':
      return { escenario: 'rural-estanque', recorrido: '2.2', etapa: 'detective', dialogo: '2.2', motivos: MOTIVOS_M22, bloqueos: bloqueosM22, evaluar: evaluarM22 }
    case '2.3':
      return { escenario: 'rural-conduccion', recorrido: recorridoDeTramo(tramo), etapa: 'cooperativa', dialogo: '2.3', motivos: MOTIVOS_M23, bloqueos: bloqueosM23, evaluar: evaluarM23 }
  }
}

export const MISIONES_JUGABLES: readonly IdMisionJugable[] = ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3']

export const esJugable = (id: string): id is IdMisionJugable => (MISIONES_JUGABLES as readonly string[]).includes(id)

/** Todas las configuraciones posibles (cada piel de la 2.1), para revisar datos y guiones. */
export const todasLasConfiguraciones = (): ConfigMision[] =>
  MISIONES_JUGABLES.flatMap((id) =>
    id === '2.1' ? (Object.keys(PIELES_2_1) as PielActo2[]).map((piel) => configMision(id, { piel })) : [configMision(id, { piel: 'red-del-agua' })],
  )

export const opcionesDesdeParametros = (p: Parametros, tramo?: Tramo): OpcionesMision => ({ piel: p.acto2.piel, tramo })

/**
 * Entrega de una misión: primero lo que bloquea (libreta incompleta o fuera del recorrido, etapa
 * propia sin llenar), que no cuenta como falla; si no hay bloqueos, la evaluación automática.
 */
export function entregarMision(config: ConfigMision, ctx: ContextoEntrega): ResultadoEntrega {
  const deLibreta = bloqueosLibreta(ctx.registro, ctx.modo, ctx.lecturas)
  const motivos = deLibreta.length ? deLibreta : config.bloqueos(ctx)
  return motivos.length ? { tipo: 'bloqueada', motivos } : { tipo: 'evaluada', evaluacion: config.evaluar(ctx) }
}
