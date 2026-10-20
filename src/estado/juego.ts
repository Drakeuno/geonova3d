import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { xpIndividual, type MovimientoXp } from '@/motor/puntaje'
import type { AyudaRegistrada } from '@/motor/cuadrillas'

// Movimientos de XP por persona y ayudas entre compañeros. Cuadrillas, insignias y clasificación se
// calculan desde aquí y el viaje (`estado/cuadrillas.ts`).

interface AlmacenJuego {
  movimientos: Record<string, MovimientoXp[]>
  /** Mensajes de ayuda enviados, con su aceptación (§14). */
  ayudas: AyudaRegistrada[]
  registrarMovimiento: (usuarioId: string, movimiento: MovimientoXp) => void
  /** Registra una ayuda; una sola por ayudante, compañero y misión. */
  registrarAyuda: (ayuda: AyudaRegistrada) => void
}

export const useJuego = create<AlmacenJuego>()(
  persist(
    (set) => ({
      movimientos: {},
      ayudas: [],
      registrarMovimiento: (usuarioId, movimiento) =>
        set((s) => ({ movimientos: { ...s.movimientos, [usuarioId]: [...(s.movimientos[usuarioId] ?? []), movimiento] } })),
      registrarAyuda: (ayuda) => set((s) => (s.ayudas.some((a) => a.id === ayuda.id) ? s : { ayudas: [...s.ayudas, ayuda] })),
    }),
    { name: 'gn3d_juego_v1' },
  ),
)

export const useXpIndividual = (usuarioId: string | null) =>
  useJuego((s) => (usuarioId ? xpIndividual(s.movimientos[usuarioId] ?? []) : 0))
