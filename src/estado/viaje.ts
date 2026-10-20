import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MISIONES } from '@/datos/misiones'
import type { Burbuja } from '@/motor/burbuja'
import { entregar, iniciar, resolver, viajeInicial, type EstadoMision, type ProgresoMision, type Viaje } from '@/motor/progreso'
import type { MovimientoXp } from '@/motor/puntaje'
import { perfilVacio, type EntradasCompensacion, type EntradasPerfil, type Evaluacion, type Formulario } from '@/misiones/tipos'
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

export interface EvaluacionGuardada extends Evaluacion {
  intento: number
  en: number
  /** XP otorgado, solo en la primera aprobación. */
  recompensa: MovimientoXp[]
}

interface AlmacenViaje {
  viajes: Record<string, Viaje>
  intentos: Record<string, IntentoMision>
  evaluaciones: Record<string, EvaluacionGuardada>
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
