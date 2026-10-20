import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { cargarParametros, type Parametros } from '@/datos/parametros'
import { aplicarAjustes, type Ajustes } from '@/datos/configuracion'

// Parámetros vigentes: los de `public/datos/parametros.json` con los ajustes que el docente hace
// desde su panel (RF-08). Los ajustes se guardan en este navegador hasta que haya servidor.

type EstadoCarga = 'inicial' | 'cargando' | 'listo' | 'error'

interface AlmacenParametros {
  estado: EstadoCarga
  /** Los del archivo, sin ajustes. */
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

interface AlmacenAjustes {
  ajustes: Ajustes
  /** Cuándo se guardaron por última vez (null: nunca, rigen los del archivo). */
  guardadosEn: number | null
  guardar: (ajustes: Ajustes) => void
  restablecer: () => void
}

export const useAjustes = create<AlmacenAjustes>()(
  persist(
    (set) => ({
      ajustes: {},
      guardadosEn: null,
      guardar: (ajustes) => set({ ajustes, guardadosEn: Date.now() }),
      restablecer: () => set({ ajustes: {}, guardadosEn: Date.now() }),
    }),
    { name: 'gn3d_parametros_v1' },
  ),
)

export function useParametros() {
  const almacen = useAlmacen()
  const ajustes = useAjustes((s) => s.ajustes)
  useEffect(() => {
    if (almacen.estado === 'inicial') void almacen.cargar()
  }, [almacen])
  const vigentes = useMemo(() => (almacen.parametros ? aplicarAjustes(almacen.parametros, ajustes) : null), [almacen.parametros, ajustes])
  return {
    estado: almacen.estado,
    error: almacen.error,
    /** Los que usa el juego: archivo + ajustes del docente. */
    parametros: vigentes?.parametros ?? null,
    /** Los del archivo, para mostrar los valores por defecto. */
    base: almacen.parametros,
    ajustes,
    /** Los ajustes guardados no forman parámetros válidos: rigen los del archivo. */
    ajustesInvalidos: vigentes?.invalidos ?? false,
  }
}
