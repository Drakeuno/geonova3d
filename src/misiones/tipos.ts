import type { Parametros } from '@/datos/parametros'
import type { ErrorSembrado, FilaAuditoria } from '@/motor/auditoria'
import type { EventoSembrado, Tramo } from '@/motor/cooperativa'
import type { Escenario, LecturaPlanificada } from '@/motor/escenarios'
import type { ModoCalculo, RegistroLibreta } from '@/motor/libreta'
import type { Mm } from '@/motor/numeros'

// Tipos comunes del shell de misión (F4). Cada misión jugable define su recorrido en el escenario,
// su etapa propia (compensación, perfil…) y una evaluación pura sobre la libreta del jugador.

export type IdMisionJugable = '1.1' | '1.2' | '1.3' | '2.1' | '2.2' | '2.3' | '3.1' | '3.2' | '3.3'

/** Lo que se entrega además de la libreta: la etapa propia de cada misión. */
export type Etapa =
  | 'ninguna'
  | 'compensacion'
  | 'perfil'
  | 'decision-agua'
  | 'decision-pehuen'
  | 'decision-cero-cota'
  | 'detective'
  | 'cooperativa'
  | 'auditoria'
  | 'asamblea'
  | 'integrador'

/** Respuestas de las etapas de formulario (decisión, informe, diagnóstico), tal como se escriben. */
export type Formulario = Record<string, string>

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

/** Una parte de terreno: su libreta y las lecturas verdaderas del intento (dato interno). */
export interface ParteEntregada {
  registro: RegistroLibreta
  lecturas: LecturaPlanificada[]
}

export interface ContextoEntrega {
  escenario: Escenario
  parametros: Parametros
  /** Libreta de la parte principal (la única, salvo en la 3.3). */
  registro: RegistroLibreta
  modo: ModoCalculo
  /** Lecturas verdaderas del intento (dato interno: nunca se muestran). */
  lecturas: LecturaPlanificada[]
  /** Todas las partes de terreno, por id (la 3.3 tiene circuito y perfil). */
  partes: Record<string, ParteEntregada>
  /** Solo en la 3.1: la tabla de la contratista y sus errores sembrados. */
  auditoria: SesionAuditoria | null
  compensacion: EntradasCompensacion
  perfil: EntradasPerfil
  formulario: Formulario
  /** Solo en la 2.3. */
  cooperativa: SesionCooperativa | null
}

export interface SesionAuditoria {
  /** Tabla verdadera (dato interno). */
  correcta: FilaAuditoria[]
  /** Tabla que entrega la contratista, con los errores. */
  entregada: FilaAuditoria[]
  errores: ErrorSembrado[]
}

/** Lo que una cuadrilla comparte con la otra en la 2.3 (por el canal, o generado si es simulada). */
export interface ResolucionPublica {
  tramo: Tramo
  estacion: string
  causa: string
  cotaComunMm: Mm
  documentada: boolean
}

export interface SesionCooperativa {
  /** Tramo de quien juega en esta ventana. */
  tramo: Tramo
  evento: EventoSembrado
  /** Postura de la ida donde quedó la lectura alterada. */
  estacionDelEvento: string
  companero: {
    simulado: boolean
    registro: RegistroLibreta | null
    lecturas: LecturaPlanificada[]
    resolucion: ResolucionPublica | null
  }
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
  /** Tolerancia de ese cierre: con ella se calcula el % de precisión del Ñielol (§14). */
  toleranciaCierreMm?: number
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
