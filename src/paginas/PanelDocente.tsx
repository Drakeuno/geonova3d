import { LockOpen } from 'lucide-react'
import { useParametros } from '@/estado/parametros'
import { useViaje } from '@/estado/viaje'
import { formatearNumero } from '@/motor/numeros'
import type { Parametros } from '@/datos/parametros'
import textos from '@/textos/es-CL.json'

/** Filas de la tabla de la §11, en el mismo orden que la especificación. */
function filas(p: Parametros): [string, string][] {
  const pct = (n: number) => `${formatearNumero(n, n % 1 === 0 ? 0 : 1)} %`
  return [
    ['Tolerancia de cierre', `T = ${p.toleranciaCierre.coeficienteMm}√K mm (K en km)`],
    ['Pendiente mínima de gravedad (2.1)', pct(p.acto2.pendienteMinimaGravedadPct)],
    ['Pendiente máxima transitable (piel Pehuén)', pct(p.acto2.pendienteMaximaTransitablePct)],
    ['Presión mínima (2.2)', `${p.acto2.presionMinimaMca} m.c.a.`],
    ['Estaciones de perfil', `cada ${p.perfil.estacionamientoM} m`],
    ['Escalas de perfil', `1:${p.perfil.escalaHorizontal} H / 1:${p.perfil.escalaVertical} V`],
    ['Lectura de mira', `${formatearNumero(p.lectura.minimaM)}–${formatearNumero(p.lectura.maximaM)} m`],
    ['XP por lectura exacta (±1 mm)', `${p.xp.lecturaExacta} XP`],
    [
      'XP por misión',
      `Bronce ${p.xp.porInsignia.bronce} · Plata ${p.xp.porInsignia.plata} · Oro ${p.xp.porInsignia.oro} · Integrador ${p.xp.porInsignia.integrador}`,
    ],
    ['Piel del Acto 2', textos.pieles[p.acto2.piel]],
    [
      'Cálculo del desnivel',
      `Acto 0: ${textos.modos[p.modoDesnivel.acto0]} · Acto 2: ${textos.modos[p.modoDesnivel.acto2]} · Acto 3: ${textos.modos[p.modoDesnivel.acto3]}`,
    ],
  ]
}

export default function PanelDocente() {
  const { estado, parametros, error } = useParametros()
  const { todasAbiertas, alternarTodasAbiertas } = useViaje()
  const d = textos.panel.demo

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-tierra-900">{textos.panel.titulo}</h1>
      <p className="mt-2 text-tierra-600">{textos.panel.bajada}</p>

      <section className="card mt-6 flex flex-wrap items-center gap-4 p-5">
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

      <section className="card mt-6 overflow-hidden">
        <header className="border-b border-tierra-200 bg-tierra-100/60 px-5 py-3">
          <h2 className="text-lg font-bold text-tierra-900">{textos.panel.parametros}</h2>
          <p className="text-xs text-tierra-600">{textos.panel.fuente}</p>
        </header>
        {estado === 'error' && (
          <p role="alert" className="m-5 rounded-xl bg-granate-100 p-3 text-granate-700">
            {textos.panel.error}: {error}
          </p>
        )}
        {parametros ? (
          <table className="w-full text-left">
            <tbody className="divide-y divide-tierra-100">
              {filas(parametros).map(([nombre, valor]) => (
                <tr key={nombre}>
                  <th scope="row" className="px-5 py-2.5 font-semibold text-tierra-800">
                    {nombre}
                  </th>
                  <td className="px-5 py-2.5 font-mono text-sm text-tierra-900">{valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          estado !== 'error' && <p className="p-5 text-tierra-600">{textos.panel.cargando}</p>
        )}
      </section>
    </div>
  )
}
