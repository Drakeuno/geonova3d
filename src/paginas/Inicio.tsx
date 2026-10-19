import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { useSesion } from '@/estado/sesion'
import { USUARIOS_DEMO, iniciales, rutaInicial, type UsuarioDemo } from '@/datos/usuariosDemo'
import { BandaPoncho } from '@/componentes/ui/BandaPoncho'
import { LogoAnteojo } from '@/componentes/ui/LogoAnteojo'
import textos from '@/textos/es-CL.json'

export default function Inicio() {
  const entrar = useSesion((s) => s.entrar)
  const navigate = useNavigate()

  const elegir = (u: UsuarioDemo) => {
    entrar(u.id)
    navigate(rutaInicial(u))
  }

  return (
    <div className="grid min-h-full lg:grid-cols-[1.15fr_1fr]">
      <section className="relative min-h-[460px] overflow-hidden bg-poncho-900 text-white">
        <img
          src={`${import.meta.env.BASE_URL}arte/cochayuyero-puerto-saavedra.jpeg`}
          alt={textos.inicio.creditoImagen}
          className="absolute inset-0 h-full w-full object-cover object-[50%_25%]"
        />
        {/* En pantallas angostas el texto cubre toda la foto: velo parejo. En anchas, degradado. */}
        <div className="absolute inset-0 bg-poncho-900/80 lg:bg-transparent lg:bg-gradient-to-t lg:from-poncho-900 lg:via-poncho-900/75 lg:to-poncho-900/0" />
        <div className="relative flex h-full flex-col justify-end p-8 lg:p-12">
          <span className="chip w-fit bg-white/15 text-white backdrop-blur">{textos.inicio.etiqueta}</span>
          <div className="mt-4 flex items-center gap-3">
            <LogoAnteojo size={44} />
            <div>
              <h1 className="text-4xl font-bold leading-none sm:text-5xl">{textos.app.nombre}</h1>
              <p className="mt-1 font-display text-lg font-semibold text-buey-200">{textos.app.subtitulo}</p>
            </div>
          </div>
          <p className="mt-4 font-display text-xl font-semibold">{textos.app.parte}</p>
          <p className="mt-2 max-w-xl text-lg text-poncho-100">{textos.inicio.bajada}</p>
          <ul className="mt-6 space-y-1.5 text-poncho-100">
            {textos.inicio.puntos.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <Check size={18} className="text-bosque-300" aria-hidden /> {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex flex-col bg-tierra-50">
        <BandaPoncho />
        <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <h2 className="text-2xl font-bold text-tierra-900">{textos.inicio.titulo}</h2>
            <p className="mt-1 text-tierra-600">{textos.inicio.ayuda}</p>
            <div className="mt-8 space-y-3">
              {USUARIOS_DEMO.map((u) => (
                <button
                  key={u.id}
                  onClick={() => elegir(u)}
                  className="card group flex w-full items-center gap-4 p-4 text-left transition hover:border-bosque-300 hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bosque-500"
                >
                  <span
                    className={`grid h-14 w-14 place-items-center rounded-2xl text-lg font-bold text-white ${
                      u.rol === 'estudiante' ? 'bg-bosque-700' : 'bg-poncho-700'
                    }`}
                  >
                    {iniciales(u.nombre)}
                  </span>
                  <span className="flex-1">
                    <span className="block font-display text-lg font-bold text-tierra-900">{u.nombre}</span>
                    <span className="block text-sm text-tierra-600">{u.detalle}</span>
                    <span className="chip mt-1 bg-tierra-100 text-tierra-800">{textos.roles[u.rol]}</span>
                  </span>
                  <ArrowRight
                    className="text-tierra-300 transition group-hover:translate-x-1 group-hover:text-bosque-600"
                    aria-hidden
                  />
                </button>
              ))}
            </div>
            <p className="mt-8 text-center text-xs text-tierra-600">{textos.app.aviso}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
