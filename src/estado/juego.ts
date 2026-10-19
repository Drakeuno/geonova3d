import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { xpIndividual, type MovimientoXp } from '@/motor/puntaje'

// Movimientos de XP por persona. En F7 se suman insignias, cuadrillas y clasificación.

interface AlmacenJuego {
  movimientos: Record<string, MovimientoXp[]>
  registrarMovimiento: (usuarioId: string, movimiento: MovimientoXp) => void
}

export const useJuego = create<AlmacenJuego>()(
  persist(
    (set) => ({
      movimientos: {},
      registrarMovimiento: (usuarioId, movimiento) =>
        set((s) => ({ movimientos: { ...s.movimientos, [usuarioId]: [...(s.movimientos[usuarioId] ?? []), movimiento] } })),
    }),
    { name: 'gn3d_juego_v1' },
  ),
)

export const useXpIndividual = (usuarioId: string | null) =>
  useJuego((s) => (usuarioId ? xpIndividual(s.movimientos[usuarioId] ?? []) : 0))
