import { useId, useState } from 'react'
import { Check, Lock, Send } from 'lucide-react'
import { MISIONES } from '@/datos/misiones'
import { MINIMO_MENSAJE_AYUDA, type AyudaRegistrada, type EstadoAyuda, type IntegranteCurso, type puedeAyudar } from '@/motor/cuadrillas'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { Avatar } from './Integrante'

// Pedido de ayuda de un compañero atascado (§14): se responde con un mensaje; vale cuando el
// compañero lo acepta y aprueba esa misión.

const t = textos.ayuda
const PASOS: EstadoAyuda[] = ['enviada', 'aceptada', 'valida']

interface Props {
  companero: IntegranteCurso
  /** Nombre de su cuadrilla, si no es la propia. */
  cuadrilla: string | null
  mision: string
  permiso: ReturnType<typeof puedeAyudar>
  ayuda: AyudaRegistrada | undefined
  estado: EstadoAyuda | undefined
  onEnviar: (mensaje: string) => void
}

export function PedidoAyuda({ companero, cuadrilla, mision, permiso, ayuda, estado, onEnviar }: Props) {
  const titulo = MISIONES.find((m) => m.id === mision)?.titulo ?? ''
  return (
    <li className="card p-4">
      <div className="flex items-start gap-3">
        <Avatar nombre={companero.nombre} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-tierra-900">
            {companero.nombre}
            {cuadrilla && <span className="font-normal text-tierra-600"> · {cuadrilla}</span>}
          </p>
          <p className="text-sm text-tierra-600">{rellenar(t.pide, { mision, titulo })}</p>
          {companero.pedido && <blockquote className="mt-2 rounded-lg bg-tierra-50 px-3 py-2 text-sm text-tierra-800">«{companero.pedido}»</blockquote>}
        </div>
      </div>
      <div className="mt-3 border-t border-tierra-100 pt-3">
        {ayuda && estado ? (
          <AvanceAyuda ayuda={ayuda} estado={estado} nombre={companero.nombre.split(' ')[0]} />
        ) : permiso.ok ? (
          <FormularioAyuda nombre={companero.nombre.split(' ')[0]} onEnviar={onEnviar} />
        ) : (
          <p className="flex items-center gap-2 text-sm text-tierra-700">
            <Lock size={15} aria-hidden /> {rellenar(t.sinAprobar, { mision })}
          </p>
        )}
      </div>
    </li>
  )
}

function FormularioAyuda({ nombre, onEnviar }: { nombre: string; onEnviar: (mensaje: string) => void }) {
  const id = useId()
  const [mensaje, setMensaje] = useState('')
  const faltan = MINIMO_MENSAJE_AYUDA - mensaje.trim().length
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (faltan <= 0) onEnviar(mensaje)
      }}
    >
      <label htmlFor={id} className="text-sm font-semibold text-tierra-800">
        {rellenar(t.mensaje, { nombre })}
      </label>
      <textarea
        id={id}
        rows={3}
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        aria-describedby={`${id}-ayuda`}
        className="mt-1 w-full rounded-xl border border-tierra-300 bg-white px-3 py-2 text-sm text-tierra-900 focus:border-bosque-500 focus:outline-none focus:ring-2 focus:ring-bosque-200"
      />
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <p id={`${id}-ayuda`} className="text-xs text-tierra-600">
          {rellenar(t.mensajeAyuda, { n: MINIMO_MENSAJE_AYUDA })} {faltan > 0 && rellenar(t.faltan, { n: faltan })}
        </p>
        <button type="submit" className="btn-primario" disabled={faltan > 0}>
          <Send size={15} aria-hidden /> {t.enviar}
        </button>
      </div>
    </form>
  )
}

function AvanceAyuda({ ayuda, estado, nombre }: { ayuda: AyudaRegistrada; estado: EstadoAyuda; nombre: string }) {
  const actual = PASOS.indexOf(estado)
  return (
    <div className="space-y-2">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold">
        {PASOS.map((p, i) => (
          <li key={p} className={`flex items-center gap-1 ${i <= actual ? 'text-bosque-800' : 'text-tierra-600'}`}>
            <span
              aria-hidden
              className={`grid h-5 w-5 place-items-center rounded-full ${i <= actual ? 'bg-bosque-700 text-white' : 'border border-tierra-300 bg-white'}`}
            >
              {i <= actual ? <Check size={12} /> : i + 1}
            </span>
            {t.pasos[p]}
            {i < PASOS.length - 1 && <span aria-hidden className="ml-1 text-tierra-300">—</span>}
          </li>
        ))}
      </ol>
      <p role="status" className={`text-sm ${estado === 'valida' ? 'font-semibold text-bosque-800' : 'text-tierra-700'}`}>
        {rellenar(t.estados[estado], { nombre, mision: ayuda.misionId })}
      </p>
      <p className="text-xs text-tierra-600">
        {t.tuMensaje} «{ayuda.mensaje}»
      </p>
    </div>
  )
}
