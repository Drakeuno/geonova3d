import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Megaphone, RotateCcw } from 'lucide-react'
import { PRACTICA_LIBRETA } from '@/datos/practicaLibreta'
import { usuarioPorId } from '@/datos/usuariosDemo'
import { useParametros } from '@/estado/parametros'
import { useSesion } from '@/estado/sesion'
import { useLibretas } from '@/estado/libretas'
import { Libreta } from '@/componentes/libreta/Libreta'
import type { ModoCalculo } from '@/motor/libreta'
import { formatearMm, formatearNumero } from '@/motor/numeros'
import textos from '@/textos/es-CL.json'

const t = textos.practica
const MODOS: ModoCalculo[] = ['automatico', 'asistido', 'manual']
const plan = PRACTICA_LIBRETA.dictado.map(({ estacion, punto, tipo }) => ({ estacion, punto, tipo }))

export default function PracticaLibreta() {
  const usuario = usuarioPorId(useSesion((s) => s.usuarioId))!
  const { parametros, estado } = useParametros()
  const reiniciar = useLibretas((s) => s.reiniciar)
  const [modo, setModo] = useState<ModoCalculo>('manual')
  const [confirmando, setConfirmando] = useState(false)
  const clave = `${usuario.id}:practica:${modo}`

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link to="/viaje" className="inline-flex items-center gap-1 text-sm font-semibold text-bosque-700 hover:underline">
        <ArrowLeft size={16} aria-hidden /> {t.volver}
      </Link>
      <h1 className="mt-2 text-3xl font-bold text-tierra-900">{t.titulo}</h1>
      <p className="mt-1 max-w-3xl text-tierra-700">{t.bajada}</p>

      <div className="mt-6 grid gap-6 xl:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <fieldset className="card p-4">
            <legend className="px-1 font-display font-bold text-tierra-900">{t.modo}</legend>
            <div className="mt-1 space-y-1">
              {MODOS.map((m) => (
                <label key={m} className={`flex cursor-pointer items-start gap-2 rounded-lg p-2 ${modo === m ? 'bg-bosque-100' : 'hover:bg-tierra-100'}`}>
                  <input type="radio" name="modo-practica" checked={modo === m} onChange={() => setModo(m)} className="mt-1 accent-bosque-700" />
                  <span>
                    <span className="block font-semibold text-tierra-900">{textos.libreta.modo[m]}</span>
                    <span className="block text-xs text-tierra-600">{textos.libreta.modoAyuda[m]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <section className="card p-4">
            <h2 className="flex items-center gap-2 font-display font-bold text-tierra-900">
              <Megaphone size={18} className="text-buey-600" aria-hidden /> {t.dictado}
            </h2>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-tierra-600">
                  <th scope="col" className="py-1">{t.estacion}</th>
                  <th scope="col" className="py-1">{t.visada}</th>
                  <th scope="col" className="py-1 text-right">{t.lectura}</th>
                  <th scope="col" className="py-1 text-right">{t.distancia}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tierra-100 font-mono">
                {PRACTICA_LIBRETA.dictado.map((d, i) => (
                  <tr key={i}>
                    <td className="py-1">{d.estacion}</td>
                    <td className="py-1">
                      {d.tipo} {d.punto}
                    </td>
                    <td className="py-1 text-right">{formatearMm(d.lecturaMm)}</td>
                    <td className="py-1 text-right">{d.distanciaM === undefined ? '' : formatearNumero(d.distanciaM, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="card p-4">
            {confirmando ? (
              <div role="group" aria-label={t.confirmarReiniciar}>
                <p className="font-semibold text-tierra-900">{t.confirmarReiniciar}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="btn bg-granate-600 text-white hover:bg-granate-700"
                    onClick={() => {
                      reiniciar(clave)
                      setConfirmando(false)
                    }}
                  >
                    {t.si}
                  </button>
                  <button type="button" className="btn-neutro" onClick={() => setConfirmando(false)}>
                    {t.no}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn-neutro w-full" onClick={() => setConfirmando(true)}>
                <RotateCcw size={16} aria-hidden /> {t.reiniciar}
              </button>
            )}
          </div>
        </aside>

        <div className="min-w-0">
          {parametros ? (
            <Libreta
              key={clave}
              clave={clave}
              usuarioId={usuario.id}
              misionId="practica"
              titulo={t.titulo}
              estudiante={usuario.nombre}
              pr={PRACTICA_LIBRETA.pr}
              modo={modo}
              parametros={parametros}
              plan={plan}
            />
          ) : (
            <p className="card p-5 text-tierra-600">{estado === 'error' ? textos.panel.error : textos.panel.cargando}</p>
          )}
        </div>
      </div>
    </div>
  )
}
