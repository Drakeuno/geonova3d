import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  corregirEnLineaNueva,
  registrarFila,
  registroVacio,
  tacharCelda,
  type CampoCorregible,
  type DatosFila,
  type RegistroLibreta,
} from '@/motor/libreta'
import type { Borrador } from '@/componentes/libreta/borrador'

// Libretas de campo guardadas fila a fila en el navegador: si se interrumpe la sesión, al volver
// la libreta está igual (§9, recuperación de sesión). Incluye la línea que se estaba escribiendo.

interface AlmacenLibretas {
  registros: Record<string, RegistroLibreta>
  borradores: Record<string, Borrador>
  abrir: (clave: string, pr: RegistroLibreta['pr']) => void
  registrar: (clave: string, datos: DatosFila) => void
  corregir: (clave: string, idOriginal: string, datos: DatosFila) => void
  tachar: (clave: string, idFila: string, campo: CampoCorregible, valor: number | null) => void
  guardarBorrador: (clave: string, borrador: Borrador | null) => void
  reiniciar: (clave: string) => void
}

export const useLibretas = create<AlmacenLibretas>()(
  persist(
    (set) => {
      const cambiar = (clave: string, f: (r: RegistroLibreta) => RegistroLibreta) =>
        set((s) => ({ registros: { ...s.registros, [clave]: f(s.registros[clave]) } }))
      return {
        registros: {},
        borradores: {},
        abrir: (clave, pr) =>
          set((s) => (s.registros[clave] ? s : { registros: { ...s.registros, [clave]: registroVacio(pr) } })),
        registrar: (clave, datos) => cambiar(clave, (r) => registrarFila(r, datos, Date.now())),
        corregir: (clave, idOriginal, datos) => cambiar(clave, (r) => corregirEnLineaNueva(r, idOriginal, datos, Date.now())),
        tachar: (clave, idFila, campo, valor) => cambiar(clave, (r) => tacharCelda(r, idFila, campo, valor, Date.now())),
        guardarBorrador: (clave, borrador) =>
          set((s) => {
            const borradores = { ...s.borradores }
            if (borrador) borradores[clave] = borrador
            else delete borradores[clave]
            return { borradores }
          }),
        reiniciar: (clave) =>
          set((s) => {
            const registros = { ...s.registros }
            const borradores = { ...s.borradores }
            delete registros[clave]
            delete borradores[clave]
            return { registros, borradores }
          }),
      }
    },
    { name: 'gn3d_libretas_v1' },
  ),
)
