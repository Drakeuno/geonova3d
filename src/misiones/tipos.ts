import type { Parametros } from '@/datos/parametros'
import type { Escenario, LecturaPlanificada } from '@/motor/escenarios'
import type { ModoCalculo, RegistroLibreta } from '@/motor/libreta'
import type { Mm } from '@/motor/numeros'

// Tipos comunes del shell de misión (F4). Cada misión jugable define su recorrido en el escenario,
// su etapa propia (compensación, perfil…) y una evaluación pura sobre la libreta del jugador.

export type IdMisionJugable = '1.1' | '1.2' | '1.3'

/** Lo que se entrega además de la libreta: la etapa propia de cada misión. */
export type Etapa = 'ninguna' | 'compensacion' | 'perfil'

export interface DefinicionMision {
  id: IdMisionJugable
  escenario: string
  /** Recorrido del escenario que se nivela. Su primera visada es el PR de partida. */
  recorrido: string
  etapa: Etapa
}

/** Compensación de la 1.2: por punto, la corrección (mm) y la cota compensada (m), como texto. */
export type EntradasCompensacion = Record<string, { correccion: string; cota: string }>

export const EJES_PERFIL = ['progresiva', 'cota', 'lectura', 'distancia'] as const
export type EjePerfil = (typeof EJES_PERFIL)[number]

/** Plantilla del perfil de la 1.3: planilla por estación y datos del dibujo, como texto. */
export interface EntradasPerfil {
  filas: Record<string, { progresiva: string; cota: string; parcial: string; acumulado: string }>
  escalaH: string
  escalaV: string
  planoComparacion: string
  ejeX: EjePerfil | ''
  ejeY: EjePerfil | ''
  titulo: string
}

export const perfilVacio = (): EntradasPerfil => ({
  filas: {},
  escalaH: '',
  escalaV: '',
  planoComparacion: '',
  ejeX: '',
  ejeY: '',
  titulo: '',
})

export interface ContextoEntrega {
  escenario: Escenario
  parametros: Parametros
  registro: RegistroLibreta
  modo: ModoCalculo
  /** Lecturas verdaderas del intento (dato interno: nunca se muestran). */
  lecturas: LecturaPlanificada[]
  compensacion: EntradasCompensacion
  perfil: EntradasPerfil
}

export interface Criterio {
  id: string
  ok: boolean
  /** Lo que se le dice al jugador. Nunca revela cotas verdaderas. */
  texto: string
}

export interface Desempeno {
  lecturasExactas: number
  errorCierreMm?: Mm
  sinErroresRegistro: boolean
}

export interface Evaluacion {
  aprobada: boolean
  criterios: Criterio[]
  /** Primer criterio que falla: elige el rechazo del Cochayuyero. Null si aprobó. */
  motivo: string | null
  desempeno: Desempeno
}

/**
 * Resultado de intentar entregar. Si faltan datos, la entrega se bloquea sin contar como falla
 * (§14: no se entrega una libreta sin distancias); si no, se evalúa.
 */
export type ResultadoEntrega = { tipo: 'bloqueada'; motivos: string[] } | { tipo: 'evaluada'; evaluacion: Evaluacion }
