// Perfiles de la demo (sin servidor): el ingreso solo elige uno. Las cuentas reales llegan con
// Supabase en la fase B.

export type Rol = 'estudiante' | 'docente'

export interface UsuarioDemo {
  id: string
  nombre: string
  rol: Rol
  detalle: string
  cuadrilla?: string
}

export const USUARIOS_DEMO: UsuarioDemo[] = [
  {
    id: 'est-1',
    nombre: 'Camila Reyes',
    rol: 'estudiante',
    detalle: 'Ing. en Construcción · 2° año',
    cuadrilla: 'Cuadrilla 1',
  },
  {
    id: 'doc-1',
    nombre: 'Claudio Gil',
    rol: 'docente',
    detalle: 'Docente responsable · Topografía',
  },
]

export const usuarioPorId = (id: string | null) => USUARIOS_DEMO.find((u) => u.id === id) ?? null

export const rutaInicial = (u: UsuarioDemo) => (u.rol === 'estudiante' ? '/viaje' : '/panel')

export const iniciales = (nombre: string) =>
  nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
