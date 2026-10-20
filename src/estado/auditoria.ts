import { useEffect } from 'react'
import { create } from 'zustand'
import { cargarAuditoria, type DatosAuditoria } from '@/datos/auditoria'

// Perfil de la contratista para la 3.1, leído una vez desde `public/datos/auditoria.json`.

interface AlmacenAuditoria {
  datos: DatosAuditoria | null
  error: string | null
  cargando: boolean
  cargar: () => Promise<void>
}

const useAlmacen = create<AlmacenAuditoria>()((set, get) => ({
  datos: null,
  error: null,
  cargando: false,
  cargar: async () => {
    if (get().cargando || get().datos) return
    set({ cargando: true, error: null })
    try {
      set({ datos: await cargarAuditoria(), cargando: false })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), cargando: false })
    }
  },
}))

/** Con `activa` en falso no carga nada (las misiones que no la usan). */
export function useDatosAuditoria(activa: boolean) {
  const almacen = useAlmacen()
  useEffect(() => {
    if (activa && !almacen.datos && !almacen.cargando && !almacen.error) void almacen.cargar()
  }, [activa, almacen])
  return almacen
}
