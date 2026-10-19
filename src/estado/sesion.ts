import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Sesion {
  usuarioId: string | null
  /** Texto más grande y líneas más gruesas, para la sala con proyector. */
  modoProyector: boolean
  entrar: (usuarioId: string) => void
  salir: () => void
  alternarProyector: () => void
}

export const useSesion = create<Sesion>()(
  persist(
    (set) => ({
      usuarioId: null,
      modoProyector: false,
      entrar: (usuarioId) => set({ usuarioId }),
      salir: () => set({ usuarioId: null }),
      alternarProyector: () => set((s) => ({ modoProyector: !s.modoProyector })),
    }),
    { name: 'gn3d_sesion_v1' },
  ),
)
