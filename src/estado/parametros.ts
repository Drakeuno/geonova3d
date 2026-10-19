import { useEffect } from 'react'
import { create } from 'zustand'
import { cargarParametros, type Parametros } from '@/datos/parametros'

// Parámetros vigentes. Hoy son los de `public/datos/parametros.json`; en F8 se suman los ajustes
// que haga el docente desde su panel.

type EstadoCarga = 'inicial' | 'cargando' | 'listo' | 'error'

interface AlmacenParametros {
  estado: EstadoCarga
  parametros: Parametros | null
  error: string | null
  cargar: () => Promise<void>
}

const useAlmacen = create<AlmacenParametros>()((set, get) => ({
  estado: 'inicial',
  parametros: null,
  error: null,
  cargar: async () => {
    if (get().estado === 'cargando' || get().estado === 'listo') return
    set({ estado: 'cargando', error: null })
    try {
      set({ estado: 'listo', parametros: await cargarParametros() })
    } catch (e) {
      set({ estado: 'error', error: e instanceof Error ? e.message : String(e) })
    }
  },
}))

export function useParametros() {
  const almacen = useAlmacen()
  useEffect(() => {
    if (almacen.estado === 'inicial') void almacen.cargar()
  }, [almacen])
  return almacen
}
