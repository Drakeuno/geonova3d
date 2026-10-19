import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Map, Projector } from 'lucide-react'
import { useSesion } from '@/estado/sesion'
import { iniciales, usuarioPorId } from '@/datos/usuariosDemo'
import { LogoAnteojo } from '@/componentes/ui/LogoAnteojo'
import textos from '@/textos/es-CL.json'

const claseEnlace = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
    isActive ? 'bg-bosque-100 text-bosque-800' : 'text-tierra-700 hover:bg-tierra-100'
  }`

export function BarraSuperior() {
  const { usuarioId, modoProyector, salir, alternarProyector } = useSesion()
  const navigate = useNavigate()
  const usuario = usuarioPorId(usuarioId)
  if (!usuario) return null
  const esEstudiante = usuario.rol === 'estudiante'

  return (
    <header className="sticky top-0 z-30 border-b border-tierra-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <button onClick={() => navigate(esEstudiante ? '/viaje' : '/panel')} className="flex items-center gap-2.5">
          <LogoAnteojo />
          <span className="hidden text-left leading-tight sm:block">
            <span className="block font-display text-lg font-bold text-tierra-900">{textos.app.nombre}</span>
            <span className="block text-xs font-semibold text-tierra-600">{textos.app.subtitulo}</span>
          </span>
        </button>

        <nav className="ml-2 flex items-center gap-1">
          {esEstudiante ? (
            <NavLink to="/viaje" className={claseEnlace}>
              <Map size={16} aria-hidden /> {textos.nav.viaje}
            </NavLink>
          ) : (
            <NavLink to="/panel" className={claseEnlace}>
              <LayoutDashboard size={16} aria-hidden /> {textos.nav.panel}
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={alternarProyector}
            aria-pressed={modoProyector}
            title={modoProyector ? textos.nav.proyectorDesactivar : textos.nav.proyectorActivar}
            aria-label={modoProyector ? textos.nav.proyectorDesactivar : textos.nav.proyectorActivar}
            className={`grid h-9 w-9 place-items-center rounded-lg transition ${
              modoProyector ? 'bg-poncho-700 text-white' : 'text-tierra-700 hover:bg-tierra-100'
            }`}
          >
            <Projector size={18} aria-hidden />
          </button>
          <div className="flex items-center gap-2 rounded-full border border-tierra-200 py-1 pl-1 pr-3">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-poncho-700 text-xs font-bold text-white">
              {iniciales(usuario.nombre)}
            </span>
            <span className="hidden text-sm font-semibold text-tierra-800 sm:block">
              {usuario.nombre.split(' ')[0]}
            </span>
          </div>
          <button
            onClick={() => {
              salir()
              navigate('/')
            }}
            title={textos.nav.salir}
            aria-label={textos.nav.salir}
            className="grid h-9 w-9 place-items-center rounded-lg text-tierra-700 hover:bg-tierra-100"
          >
            <LogOut size={17} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  )
}
