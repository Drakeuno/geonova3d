import { useEffect } from 'react'
import { create } from 'zustand'
import { cargarDialogos, type Dialogos } from '@/datos/dialogos'

// Guiones del Cochayuyero, leídos una vez desde `public/datos/dialogos/`.

interface AlmacenDialogos {
  dialogos: Dialogos | null
  error: string | null
  cargando: boolean
  cargar: () => Promise<void>
}

const useAlmacen = create<AlmacenDialogos>()((set, get) => ({
  dialogos: null,
  error: null,
  cargando: false,
  cargar: async () => {
    if (get().cargando || get().dialogos) return
    set({ cargando: true, error: null })
    try {
      set({ dialogos: await cargarDialogos(), cargando: false })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), cargando: false })
    }
  },
}))

export function useDialogos() {
  const almacen = useAlmacen()
  useEffect(() => {
    if (!almacen.dialogos && !almacen.cargando && !almacen.error) void almacen.cargar()
  }, [almacen])
  return almacen
}
