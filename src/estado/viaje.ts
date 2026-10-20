import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MISIONES } from '@/datos/misiones'
import type { Burbuja } from '@/motor/burbuja'
import { entregar, iniciar, resolver, viajeInicial, type EstadoMision, type ProgresoMision, type Viaje } from '@/motor/progreso'
import type { MovimientoXp } from '@/motor/puntaje'
import { perfilVacio, type Desempeno, type EntradasCompensacion, type EntradasPerfil, type Evaluacion, type Formulario } from '@/misiones/tipos'
import { useJuego } from './juego'

// Avance del viaje por estudiante, guardado en el navegador: estado de cada misión, el intento en
// curso (su semilla repite las mismas lecturas al recargar) y la última evaluación.

const ORDEN = MISIONES.map((m) => m.id)
/** Una sola instancia: los selectores de zustand deben devolver siempre la misma referencia. */
const VIAJE_INICIAL = viajeInicial(ORDEN)

export interface IntentoMision {
  numero: number
  /** Fija las lecturas del intento: el docente puede revisar exactamente lo que vio el estudiante. */
  semilla: number
  burbujas: Record<string, Burbuja>
  /** Desviación de la burbuja con que quedó nivelada cada estación (0 = calada). */
  niveladas: Record<string, number>
  compensacion: EntradasCompensacion
  perfil: EntradasPerfil
  /**
   * Respuestas de las etapas de formulario, por sección: '_' en general; en la 2.3, una por tramo
   * (dos ventanas del mismo equipo comparten este almacenamiento). Opcional: los intentos guardados
   * antes de F5 no lo tienen.
   */
  formularios?: Record<string, Formulario>
  /** 2.3: con una cuadrilla simulada o con otra ventana del mismo equipo (código de sesión). */
  cooperativa?: { modo: 'simulada' | 'ventanas'; codigo: string | null } | null
}

/** Veredicto de la comisión (3.2 y 3.3), registrado por el docente con la rúbrica y la evidencia. */
export interface VeredictoGuardado {
  aprobada: boolean
  votosFavor: number
  votosContra: number
  desempateDocente: boolean
  evaluadores: { nombre: string; esDocente: boolean; puntajes: Record<string, number>; porcentaje: number }[]
  /** Archivo de evidencia (presentación, video…), guardado aparte en el navegador. */
  evidencia: { nombre: string; tamano: number; tipo: string } | null
  en: number
}

export interface EvaluacionGuardada extends Evaluacion {
  intento: number
  en: number
  /** XP otorgado, solo en la primera aprobación. */
  recompensa: MovimientoXp[]
  /** Aprobada la parte automática, espera el veredicto de la comisión. */
  enComision?: boolean
  veredicto?: VeredictoGuardado
}

/** Primera aprobación de una misión: la que da la recompensa y cuenta para la clasificación. */
export interface Logro {
  en: number
  desempeno: Desempeno | null
}

interface AlmacenViaje {
  viajes: Record<string, Viaje>
  intentos: Record<string, IntentoMision>
  evaluaciones: Record<string, EvaluacionGuardada>
  /**
   * Por estudiante y misión, el desempeño de la primera aprobación. La evaluación guardada es la
   * última y un reintento la reemplaza; el cierre del Ñielol de la clasificación sale de aquí.
   */
  logros: Record<string, Logro>
  /** Interruptor docente para demos: abre todas las misiones (§14). */
  todasAbiertas: boolean
  /** Abre la misión: la pasa a "en curso" si estaba disponible o por reintentar, y prepara el intento. */
  comenzar: (usuarioId: string, misionId: string) => void
  /** Intento nuevo: otra semilla, libreta en blanco. */
  nuevoIntento: (usuarioId: string, misionId: string) => void
  actualizarIntento: (usuarioId: string, misionId: string, cambios: Partial<Omit<IntentoMision, 'numero' | 'semilla'>>) => void
  /**
   * Registra una entrega evaluada. En la primera aprobación otorga `recompensa` y desbloquea la
   * misión siguiente; devuelve si hubo recompensa.
   */
  resolverEntrega: (usuarioId: string, misionId: string, evaluacion: Evaluacion, recompensa: MovimientoXp[]) => boolean
  /**
   * 3.2 y 3.3: la parte automática aprobó y la misión pasa a la comisión ("en evaluación"). La
   * recompensa espera el veredicto.
   */
  enviarAComision: (usuarioId: string, misionId: string, evaluacion: Evaluacion) => void
  /**
   * Veredicto de la comisión (CP-07). Aprobada: otorga `recompensa` si es la primera aprobación y
   * desbloquea la siguiente misión; si no, la misión queda por reintentar.
   */
  registrarVeredicto: (usuarioId: string, misionId: string, veredicto: VeredictoGuardado, criterio: Evaluacion['criterios'][number], recompensa: MovimientoXp[]) => boolean
  alternarTodasAbiertas: () => void
}

export const claveMision = (usuarioId: string, misionId: string) => `${usuarioId}:${misionId}`

const semillaNueva = () => Math.floor(Math.random() * 1e9)

const intentoNuevo = (numero: number): IntentoMision => ({
  numero,
  semilla: semillaNueva(),
  burbujas: {},
  niveladas: {},
  compensacion: {},
  perfil: perfilVacio(),
  formularios: {},
  cooperativa: null,
})

const viajeGuardado = (viajes: Record<string, Viaje>, usuarioId: string) => viajes[usuarioId] ?? VIAJE_INICIAL

/** Estado que ve el estudiante: con el interruptor docente, las bloqueadas se muestran disponibles. */
export const estadoVisible = (p: ProgresoMision | undefined, todasAbiertas: boolean): EstadoMision =>
  !p ? 'bloqueada' : p.estado === 'bloqueada' && todasAbiertas ? 'disponible' : p.estado

export const useViaje = create<AlmacenViaje>()(
  persist(
    (set, get) => ({
      viajes: {},
      intentos: {},
      evaluaciones: {},
      logros: {},
      todasAbiertas: false,

      comenzar: (usuarioId, misionId) =>
        set((s) => {
          let viaje = viajeGuardado(s.viajes, usuarioId)
          const p = viaje[misionId]
          if (p.estado === 'bloqueada' && s.todasAbiertas) viaje = { ...viaje, [misionId]: { ...p, estado: 'disponible' } }
          if (viaje[misionId].estado === 'disponible' || viaje[misionId].estado === 'a_reintentar') viaje = iniciar(viaje, misionId)
          const clave = claveMision(usuarioId, misionId)
          return {
            viajes: { ...s.viajes, [usuarioId]: viaje },
            intentos: s.intentos[clave] ? s.intentos : { ...s.intentos, [clave]: intentoNuevo(1) },
          }
        }),

      nuevoIntento: (usuarioId, misionId) =>
        set((s) => {
          const clave = claveMision(usuarioId, misionId)
          const viaje = viajeGuardado(s.viajes, usuarioId)
          const enCurso = viaje[misionId].estado === 'en_curso' ? viaje : iniciar(viaje, misionId)
          return {
            viajes: { ...s.viajes, [usuarioId]: enCurso },
            intentos: { ...s.intentos, [clave]: intentoNuevo((s.intentos[clave]?.numero ?? 0) + 1) },
          }
        }),

      actualizarIntento: (usuarioId, misionId, cambios) =>
        set((s) => {
          const clave = claveMision(usuarioId, misionId)
          const actual = s.intentos[clave]
          return actual ? { intentos: { ...s.intentos, [clave]: { ...actual, ...cambios } } } : s
        }),

      resolverEntrega: (usuarioId, misionId, evaluacion, recompensa) => {
        const s = get()
        let viaje = viajeGuardado(s.viajes, usuarioId)
        if (viaje[misionId].estado !== 'en_curso') viaje = iniciar(viaje, misionId)
        const ahora = Date.now()
        const r = resolver(entregar(viaje, misionId), ORDEN, misionId, evaluacion.aprobada, ahora)
        const otorgada = r.otorgaRecompensa ? recompensa : []
        const clave = claveMision(usuarioId, misionId)
        set({
          viajes: { ...s.viajes, [usuarioId]: r.viaje },
          evaluaciones: {
            ...s.evaluaciones,
            [clave]: { ...evaluacion, intento: s.intentos[clave]?.numero ?? 1, en: ahora, recompensa: otorgada },
          },
          ...(r.otorgaRecompensa && { logros: { ...s.logros, [clave]: { en: ahora, desempeno: evaluacion.desempeno } } }),
        })
        const registrar = useJuego.getState().registrarMovimiento
        otorgada.forEach((m) => registrar(usuarioId, m))
        return r.otorgaRecompensa
      },

      enviarAComision: (usuarioId, misionId, evaluacion) =>
        set((s) => {
          let viaje = viajeGuardado(s.viajes, usuarioId)
          if (viaje[misionId].estado !== 'en_curso') viaje = iniciar(viaje, misionId)
          const clave = claveMision(usuarioId, misionId)
          return {
            viajes: { ...s.viajes, [usuarioId]: entregar(viaje, misionId) },
            evaluaciones: {
              ...s.evaluaciones,
              [clave]: { ...evaluacion, intento: s.intentos[clave]?.numero ?? 1, en: Date.now(), recompensa: [], enComision: true },
            },
          }
        }),

      registrarVeredicto: (usuarioId, misionId, veredicto, criterio, recompensa) => {
        const s = get()
        const clave = claveMision(usuarioId, misionId)
        const previa = s.evaluaciones[clave]
        const r = resolver(viajeGuardado(s.viajes, usuarioId), ORDEN, misionId, veredicto.aprobada, veredicto.en)
        const otorgada = r.otorgaRecompensa ? recompensa : []
        set({
          viajes: { ...s.viajes, [usuarioId]: r.viaje },
          evaluaciones: {
            ...s.evaluaciones,
            [clave]: {
              ...previa,
              aprobada: veredicto.aprobada,
              motivo: veredicto.aprobada ? null : 'comision',
              criterios: [...(previa?.criterios ?? []).filter((c) => c.id !== 'comision'), criterio],
              enComision: false,
              veredicto,
              en: veredicto.en,
              recompensa: otorgada,
            },
          },
          ...(r.otorgaRecompensa && { logros: { ...s.logros, [clave]: { en: veredicto.en, desempeno: previa?.desempeno ?? null } } }),
        })
        const registrar = useJuego.getState().registrarMovimiento
        otorgada.forEach((m) => registrar(usuarioId, m))
        return r.otorgaRecompensa
      },

      alternarTodasAbiertas: () => set((s) => ({ todasAbiertas: !s.todasAbiertas })),
    }),
    { name: 'gn3d_viaje_v1' },
  ),
)

/** Viaje de un estudiante (o el inicial, si todavía no empieza). */
export const useViajeDe = (usuarioId: string | null) =>
  useViaje((s) => (usuarioId ? viajeGuardado(s.viajes, usuarioId) : null))
