import { useCallback, useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { cargarCuadrillas, type Roster } from '@/datos/cuadrillas'
import { MISIONES } from '@/datos/misiones'
import { ayudaSimulada, calcularCurso, proximoCambio, type AvanceJugador, type AyudaRegistrada } from '@/motor/cuadrillas'
import type { MovimientoXp } from '@/motor/puntaje'
import type { Viaje } from '@/motor/progreso'
import { useJuego } from './juego'
import { useParametros } from './parametros'
import { claveMision, useViaje, type EvaluacionGuardada, type Logro } from './viaje'

// El curso: el roster de `public/datos/cuadrillas.json` con el avance de quien juega en este
// navegador y sus ayudas. Todo lo calcula `motor/cuadrillas.ts`.

interface AlmacenRoster {
  roster: Roster | null
  error: string | null
  cargando: boolean
  cargar: () => Promise<void>
}

const useAlmacen = create<AlmacenRoster>()((set, get) => ({
  roster: null,
  error: null,
  cargando: false,
  cargar: async () => {
    if (get().cargando || get().roster) return
    set({ cargando: true, error: null })
    try {
      set({ roster: await cargarCuadrillas(), cargando: false })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), cargando: false })
    }
  },
}))

export function useRoster() {
  const almacen = useAlmacen()
  useEffect(() => {
    if (!almacen.roster && !almacen.cargando && !almacen.error) void almacen.cargar()
  }, [almacen])
  return almacen
}

/** Avance real de un estudiante: sus primeras aprobaciones (con el desempeño de cada una) y su XP. */
export function avanceDe(
  usuarioId: string,
  viaje: Viaje | undefined,
  logros: Record<string, Logro>,
  evaluaciones: Record<string, EvaluacionGuardada>,
  movimientos: MovimientoXp[],
): AvanceJugador {
  const aprobadas = MISIONES.filter((m) => viaje?.[m.id]?.aprobadaEn != null).map((m) => {
    const clave = claveMision(usuarioId, m.id)
    // Las aprobaciones anteriores a F7 no tienen logro: se usa la última evaluación si aprobó.
    const ultima = evaluaciones[clave]
    return [m.id, logros[clave]?.desempeno ?? (ultima?.aprobada && !ultima.enComision ? ultima.desempeno : null)] as const
  })
  return { aprobadas: Object.fromEntries(aprobadas), movimientos }
}

/** Hora actual, que se renueva justo cuando una ayuda simulada se acepta o se cumple. */
function useAhora(ayudas: AyudaRegistrada[]) {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const proximo = proximoCambio(ayudas, ahora)
    if (proximo === null) return
    const id = window.setTimeout(() => setAhora(Date.now()), Math.max(0, proximo - Date.now()) + 50)
    return () => window.clearTimeout(id)
  }, [ayudas, ahora])
  return ahora
}

export function useCurso() {
  const { roster, error } = useRoster()
  const { parametros } = useParametros()
  const viajes = useViaje((s) => s.viajes)
  const logros = useViaje((s) => s.logros)
  const evaluaciones = useViaje((s) => s.evaluaciones)
  const movimientos = useJuego((s) => s.movimientos)
  const ayudas = useJuego((s) => s.ayudas)
  const ahora = useAhora(ayudas)

  const curso = useMemo(() => {
    if (!roster || !parametros) return null
    const jugadores = roster.cuadrillas
      .flatMap((c) => c.integrantes.filter((i) => i.jugador))
      .map((i) => [i.id, avanceDe(i.id, viajes[i.id], logros, evaluaciones, movimientos[i.id] ?? [])] as const)
    return calcularCurso({ roster, misiones: MISIONES, xp: parametros.xp, jugadores: Object.fromEntries(jugadores), ayudas, ahora })
  }, [roster, parametros, viajes, logros, evaluaciones, movimientos, ayudas, ahora])

  return { curso, ayudas, error }
}

/** Enviar ayuda a un compañero. Hoy todos los compañeros son simulados: aceptan y aprueban solos. */
export function useAyudar(ayudanteId: string | null) {
  const { roster } = useRoster()
  const registrar = useJuego((s) => s.registrarAyuda)
  return useCallback(
    (companeroId: string, misionId: string, mensaje: string) => {
      if (!roster || !ayudanteId) return
      registrar(ayudaSimulada(ayudanteId, companeroId, misionId, mensaje.trim(), Date.now(), roster.simulacion))
    },
    [roster, ayudanteId, registrar],
  )
}
