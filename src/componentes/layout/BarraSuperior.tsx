import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Map, Projector, Sparkles, Trophy, Users } from 'lucide-react'
import { useSesion } from '@/estado/sesion'
import { useXpIndividual } from '@/estado/juego'
import { iniciales, usuarioPorId, type Rol } from '@/datos/usuariosDemo'
import { LogoAnteojo } from '@/componentes/ui/LogoAnteojo'
import { formatearNumero } from '@/motor/numeros'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'

const NAVEGACION: Record<Rol, [string, string, ReactNode][]> = {
  estudiante: [
    ['/viaje', textos.nav.viaje, <Map key="v" size={16} aria-hidden />],
    ['/cuadrilla', textos.nav.cuadrilla, <Users key="c" size={16} aria-hidden />],
    ['/clasificacion', textos.nav.clasificacion, <Trophy key="t" size={16} aria-hidden />],
  ],
  docente: [
    ['/panel', textos.nav.panel, <LayoutDashboard key="p" size={16} aria-hidden />],
    ['/clasificacion', textos.nav.clasificacion, <Trophy key="t" size={16} aria-hidden />],
  ],
}

const claseEnlace = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
    isActive ? 'bg-bosque-100 text-bosque-800' : 'text-tierra-700 hover:bg-tierra-100'
  }`

export function BarraSuperior() {
  const { usuarioId, modoProyector, salir, alternarProyector } = useSesion()
  const navigate = useNavigate()
  const usuario = usuarioPorId(usuarioId)
  const xp = useXpIndividual(usuarioId)
  if (!usuario) return null
  const esEstudiante = usuario.rol === 'estudiante'

  return (
    <header className="sticky top-0 z-30 border-b border-tierra-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4">
        <Link to={esEstudiante ? '/viaje' : '/panel'} className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-bosque-500">
          <LogoAnteojo />
          {/* En celular el nombre no cabe, pero los lectores de pantalla lo siguen leyendo. */}
          <span className="sr-only text-left leading-tight sm:not-sr-only sm:block">
            <span className="block font-display text-lg font-bold text-tierra-900">{textos.app.nombre}</span>
            <span className="block text-xs font-semibold text-tierra-600">{textos.app.subtitulo}</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:ml-2">
          {NAVEGACION[usuario.rol].map(([a, nombre, icono]) => (
            <NavLink key={a} to={a} className={claseEnlace}>
              {icono} <span className="sr-only lg:not-sr-only">{nombre}</span>
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {esEstudiante && (
            <Link to="/cuadrilla" title={textos.nav.xpTitulo} className="chip hidden bg-buey-100 text-buey-800 hover:bg-buey-200 sm:inline-flex">
              <Sparkles size={13} aria-hidden /> {rellenar(textos.nav.xp, { xp: formatearNumero(xp, 0) })}
            </Link>
          )}
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
