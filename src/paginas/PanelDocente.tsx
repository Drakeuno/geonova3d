import { useRef, useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LockOpen } from 'lucide-react'
import { USUARIOS_DEMO } from '@/datos/usuariosDemo'
import { useAjustes, useParametros } from '@/estado/parametros'
import { useViaje } from '@/estado/viaje'
import { Comision } from '@/componentes/docente/Comision'
import { Configuracion } from '@/componentes/docente/Configuracion'
import { Seguimiento } from '@/componentes/docente/Seguimiento'
import textos from '@/textos/es-CL.json'

// Panel docente (RF-08): seguimiento por cuadrilla, comisión de las defensas orales (3.2 y 3.3) y
// configuración del juego. La pestaña va en la dirección (?seccion=), para volver a ella.

const SECCIONES = ['seguimiento', 'comision', 'configuracion'] as const
type Seccion = (typeof SECCIONES)[number]
const t = textos.panel

export default function PanelDocente() {
  const { estado, parametros, base, ajustes, ajustesInvalidos, error } = useParametros()
  const { guardar, restablecer, guardadosEn } = useAjustes()
  const viajes = useViaje((s) => s.viajes)
  const [busqueda, setBusqueda] = useSearchParams()
  const pedida = busqueda.get('seccion') as Seccion | null
  const seccion: Seccion = pedida && SECCIONES.includes(pedida) ? pedida : 'seguimiento'
  const pestanas = useRef<Record<string, HTMLButtonElement | null>>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const ir = (s: Seccion) => {
    setBusqueda({ seccion: s }, { replace: true })
    pestanas.current[s]?.focus()
  }
  const defensas = USUARIOS_DEMO.filter((u) => u.rol === 'estudiante').reduce(
    (n, u) => n + ['3.2', '3.3'].filter((m) => viajes[u.id]?.[m]?.estado === 'en_evaluacion').length,
    0,
  )

  // Flechas izquierda/derecha entre pestañas (patrón de pestañas de ARIA).
  const teclado = (e: KeyboardEvent) => {
    const i = SECCIONES.indexOf(seccion)
    if (e.key === 'ArrowRight') ir(SECCIONES[(i + 1) % SECCIONES.length])
    else if (e.key === 'ArrowLeft') ir(SECCIONES[(i + SECCIONES.length - 1) % SECCIONES.length])
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-tierra-900">{t.titulo}</h1>
      <p className="mt-2 text-tierra-600">{t.bajada}</p>

      <div role="tablist" aria-label={t.pestanas.etiqueta} className="mt-6 flex gap-1 overflow-x-auto border-b border-tierra-200" onKeyDown={teclado}>
        {SECCIONES.map((s) => (
          <button
            key={s}
            ref={(b) => {
              pestanas.current[s] = b
            }}
            id={`pestana-${s}`}
            role="tab"
            type="button"
            aria-selected={seccion === s}
            aria-controls={`seccion-${s}`}
            tabIndex={seccion === s ? 0 : -1}
            onClick={() => ir(s)}
            className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              seccion === s ? 'border-bosque-700 text-bosque-800' : 'border-transparent text-tierra-700 hover:text-tierra-900'
            }`}
          >
            {t.pestanas[s]}
            {s === 'comision' && defensas > 0 && <span className="chip bg-buey-100 px-2 py-0.5 text-buey-800">{defensas}</span>}
          </button>
        ))}
      </div>

      <div id={`seccion-${seccion}`} role="tabpanel" aria-labelledby={`pestana-${seccion}`} className="mt-6">
        {estado === 'error' ? (
          <p role="alert" className="rounded-xl bg-granate-100 p-3 text-granate-700">
            {t.error}: {error}
          </p>
        ) : !parametros || !base ? (
          <p className="text-tierra-600">{t.cargando}</p>
        ) : seccion === 'seguimiento' ? (
          <Seguimiento fallasAntesDePista={parametros.reintentos.fallasAntesDePista} onIrComision={() => ir('comision')} />
        ) : seccion === 'comision' ? (
          <Comision parametros={parametros} />
        ) : (
          <>
            <Demostracion />
            <div className="mt-6">
              {/* Si otra pestaña guarda ajustes, el formulario parte de nuevo desde lo guardado. */}
              <Configuracion
                key={guardadosEn ?? 0}
                base={base}
                ajustes={ajustes}
                ajustesInvalidos={ajustesInvalidos}
                aviso={aviso}
                onEditar={() => setAviso(null)}
                onGuardar={(a) => {
                  guardar(a)
                  setAviso(textos.configuracion.guardado)
                }}
                onRestablecer={() => {
                  restablecer()
                  setAviso(textos.configuracion.restablecido)
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Demostracion() {
  const { todasAbiertas, alternarTodasAbiertas } = useViaje()
  const d = t.demo
  return (
    <section className="card flex flex-wrap items-center gap-4 p-5">
      <LockOpen size={22} className="text-poncho-700" aria-hidden />
      <div className="min-w-[14rem] flex-1">
        <h2 className="text-lg font-bold text-tierra-900">{d.titulo}</h2>
        <p className="text-sm text-tierra-600">{d.texto}</p>
        <p className="mt-1 text-sm font-semibold text-tierra-800" role="status">
          {todasAbiertas ? d.abiertas : d.enOrden}
        </p>
      </div>
      <button type="button" aria-pressed={todasAbiertas} className={todasAbiertas ? 'btn-neutro' : 'btn-primario'} onClick={alternarTodasAbiertas}>
        {todasAbiertas ? d.desactivar : d.activar}
      </button>
    </section>
  )
}
