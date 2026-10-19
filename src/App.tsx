import { Suspense, lazy, useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useSesion } from '@/estado/sesion'
import { rutaInicial, usuarioPorId, type Rol } from '@/datos/usuariosDemo'
import { Marco } from '@/componentes/layout/Marco'
import Inicio from '@/paginas/Inicio'
import MapaViaje from '@/paginas/MapaViaje'
import PanelDocente from '@/paginas/PanelDocente'
import PracticaLibreta from '@/paginas/PracticaLibreta'
import textos from '@/textos/es-CL.json'

// La página 3D (y three.js) se descarga solo cuando se abre.
const CampoPractica = lazy(() => import('@/paginas/CampoPractica'))

function useUsuario() {
  return usuarioPorId(useSesion((s) => s.usuarioId))
}

function SoloRol({ rol, children }: { rol: Rol; children: ReactNode }) {
  const usuario = useUsuario()
  if (!usuario) return <Navigate to="/" replace />
  if (usuario.rol !== rol) return <Navigate to={rutaInicial(usuario)} replace />
  return <>{children}</>
}

function SoloSinSesion() {
  const usuario = useUsuario()
  return usuario ? <Navigate to={rutaInicial(usuario)} replace /> : <Inicio />
}

export default function App() {
  const modoProyector = useSesion((s) => s.modoProyector)
  useEffect(() => {
    document.documentElement.toggleAttribute('data-proyector', modoProyector)
  }, [modoProyector])

  return (
    <Routes>
      <Route path="/" element={<SoloSinSesion />} />
      <Route element={<Marco />}>
        <Route path="/viaje" element={<SoloRol rol="estudiante"><MapaViaje /></SoloRol>} />
        <Route path="/practica" element={<SoloRol rol="estudiante"><PracticaLibreta /></SoloRol>} />
        <Route
          path="/campo"
          element={
            <SoloRol rol="estudiante">
              <Suspense fallback={<p className="mx-auto max-w-7xl px-4 py-8 text-tierra-600">{textos.campo.cargando}</p>}>
                <CampoPractica />
              </Suspense>
            </SoloRol>
          }
        />
        <Route path="/panel" element={<SoloRol rol="docente"><PanelDocente /></SoloRol>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
