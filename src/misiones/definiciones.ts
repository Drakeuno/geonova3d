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
import { bloqueosM31, evaluarM31, MOTIVOS_M31 } from './m31'
import { bloqueosM32, evaluarM32, MOTIVOS_M32 } from './m32'
import { bloqueosM33, evaluarM33, MOTIVOS_M33, PARTE_CIRCUITO, PARTE_PERFIL } from './m33'
import textos from '@/textos/es-CL.json'
import type { ContextoEntrega, Etapa, Evaluacion, IdMisionJugable, ResultadoEntrega } from './tipos'

// Las nueve misiones jugables de la Parte 1.

/** Una parte de terreno: un recorrido del escenario, con su libreta. Su primera visada es el PR. */
export interface ParteTerreno {
  id: string
  recorrido: string
}

/** Parte única de las misiones con un solo recorrido. */
export const PARTE_UNICA = '_'

export interface ConfigMision {
  /** Terreno del acto. La 3.1 y la 3.2 no tienen trabajo de terreno, pero ocurren en el Ñielol. */
  escenario: string
  /** Partes de terreno, en orden. Vacío: sin terreno. La 3.3 tiene dos: circuito y perfil. */
  partes: ParteTerreno[]
  etapa: Etapa
  /** Clave de los guiones del Cochayuyero en `cochayuyero.json`. */
  dialogo: string
  motivos: readonly string[]
  bloqueos: (ctx: ContextoEntrega) => string[]
  evaluar: (ctx: ContextoEntrega) => Evaluacion
  /**
   * 3.2 y 3.3: aprobada la parte automática, la misión queda "en evaluación" hasta el veredicto de
   * la comisión, que registra el docente (§5 y §14).
   */
  evaluacionDocente?: boolean
}

const sinBloqueos = () => []
const unica = (recorrido: string): ParteTerreno[] => [{ id: PARTE_UNICA, recorrido }]

/** La 2.1 cambia de terreno y de pregunta según la piel del Acto 2 que fije el docente (RF-12). */
const PIELES_2_1: Record<PielActo2, Omit<ConfigMision, 'partes'>> = {
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
      return { escenario: 'campus-uct', partes: unica('1.1'), etapa: 'ninguna', dialogo: '1.1', motivos: MOTIVOS_M11, bloqueos: sinBloqueos, evaluar: evaluarM11 }
    case '1.2':
      return { escenario: 'campus-uct', partes: unica('1.2'), etapa: 'compensacion', dialogo: '1.2', motivos: MOTIVOS_M12, bloqueos: bloqueosCompensacion, evaluar: evaluarM12 }
    case '1.3':
      return { escenario: 'campus-uct', partes: unica('1.3'), etapa: 'perfil', dialogo: '1.3', motivos: MOTIVOS_M13, bloqueos: bloqueosPerfil, evaluar: evaluarM13 }
    case '2.1':
      return { ...PIELES_2_1[piel], partes: unica('2.1') }
    case '2.2':
      return { escenario: 'rural-estanque', partes: unica('2.2'), etapa: 'detective', dialogo: '2.2', motivos: MOTIVOS_M22, bloqueos: bloqueosM22, evaluar: evaluarM22 }
    case '2.3':
      return { escenario: 'rural-conduccion', partes: unica(recorridoDeTramo(tramo)), etapa: 'cooperativa', dialogo: '2.3', motivos: MOTIVOS_M23, bloqueos: bloqueosM23, evaluar: evaluarM23 }
    case '3.1':
      return { escenario: 'nielol', partes: [], etapa: 'auditoria', dialogo: '3.1', motivos: MOTIVOS_M31, bloqueos: bloqueosM31, evaluar: evaluarM31 }
    case '3.2':
      return { escenario: 'nielol', partes: [], etapa: 'asamblea', dialogo: '3.2', motivos: MOTIVOS_M32, bloqueos: bloqueosM32, evaluar: evaluarM32, evaluacionDocente: true }
    case '3.3':
      return {
        escenario: 'nielol',
        partes: [
          { id: PARTE_CIRCUITO, recorrido: '3.3-circuito' },
          { id: PARTE_PERFIL, recorrido: '3.3-perfil' },
        ],
        etapa: 'integrador',
        dialogo: '3.3',
        motivos: MOTIVOS_M33,
        bloqueos: bloqueosM33,
        evaluar: evaluarM33,
        evaluacionDocente: true,
      }
  }
}

export const MISIONES_JUGABLES: readonly IdMisionJugable[] = ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3']

export const esJugable = (id: string): id is IdMisionJugable => (MISIONES_JUGABLES as readonly string[]).includes(id)

/** Todas las configuraciones posibles (cada piel de la 2.1), para revisar datos y guiones. */
export const todasLasConfiguraciones = (): ConfigMision[] =>
  MISIONES_JUGABLES.flatMap((id) =>
    id === '2.1' ? (Object.keys(PIELES_2_1) as PielActo2[]).map((piel) => configMision(id, { piel })) : [configMision(id, { piel: 'red-del-agua' })],
  )

/** La piel del intento si ya la tiene (queda fija al empezarlo); si no, la que fija el docente. */
export const opcionesDelIntento = (p: Parametros, intento: { piel?: PielActo2 }, tramo?: Tramo): OpcionesMision => ({
  piel: intento.piel ?? p.acto2.piel,
  tramo,
})

/**
 * Entrega de una misión: primero lo que bloquea (libreta incompleta o fuera del recorrido, etapa
 * propia sin llenar), que no cuenta como falla; si no hay bloqueos, la evaluación automática.
 */
export function entregarMision(config: ConfigMision, ctx: ContextoEntrega): ResultadoEntrega {
  const nombres = textos.entrega.m33.partes as Record<string, string>
  const deLibreta = config.partes.flatMap((p) => {
    const parte = ctx.partes[p.id] ?? { registro: ctx.registro, lecturas: ctx.lecturas }
    const motivos = bloqueosLibreta(parte.registro, ctx.modo, parte.lecturas)
    return config.partes.length > 1 ? motivos.map((m) => `${nombres[p.id] ?? p.id}: ${m}`) : motivos
  })
  const motivos = deLibreta.length ? deLibreta : config.bloqueos(ctx)
  return motivos.length ? { tipo: 'bloqueada', motivos } : { tipo: 'evaluada', evaluacion: config.evaluar(ctx) }
}
