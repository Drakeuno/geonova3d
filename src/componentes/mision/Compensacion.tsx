import { Calculator } from 'lucide-react'
import { formatearMm, formatearNumero, parsearMetrosAMm, parsearNumero, type Mm } from '@/motor/numeros'
import type { CierreCircuito } from '@/misiones/m12'
import type { EntradasCompensacion } from '@/misiones/tipos'
import { mmConSigno, textoTolerancia } from '@/misiones/comunes'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'

const t = textos.compensacion

interface Props {
  /** Null mientras la libreta no esté completa. */
  cierre: CierreCircuito | null
  /** Cota de cada punto según la libreta del jugador (la que escribió, o la del sistema en automático). */
  cotasLibreta: Record<string, Mm | null>
  entradas: EntradasCompensacion
  onCambio: (e: EntradasCompensacion) => void
}

const claseEntrada =
  'w-28 rounded-lg border bg-white px-2 py-1.5 text-right font-mono text-sm focus:outline-none focus:ring-2 focus:ring-bosque-500'

/**
 * Etapa de la 1.2: el sistema calcula el error de cierre desde la libreta (§5, 1.2 a) y el jugador
 * reparte la corrección en proporción a la distancia acumulada, punto por punto.
 */
export function Compensacion({ cierre, cotasLibreta, entradas, onCambio }: Props) {
  return (
    <section className="card overflow-hidden" aria-labelledby="titulo-compensacion">
      <header className="flex items-center gap-3 border-b border-tierra-200 bg-tierra-100/60 px-4 py-3">
        <Calculator size={22} className="text-bosque-700" aria-hidden />
        <div>
          <h2 id="titulo-compensacion" className="text-xl font-bold text-tierra-900">
            {t.titulo}
          </h2>
          <p className="text-sm text-tierra-600">{t.bajada}</p>
        </div>
      </header>
      {!cierre ? (
        <p className="p-4 text-tierra-600">{t.completaLibreta}</p>
      ) : (
        <div className="space-y-4 p-4">
          <dl className="grid gap-2 sm:grid-cols-3">
            <Dato etiqueta={t.error} valor={`${mmConSigno(cierre.errorMm)} mm`} alerta={!cierre.aprobado} />
            <Dato etiqueta={t.tolerancia} valor={`±${textoTolerancia(cierre.toleranciaMm)} mm`} />
            <Dato etiqueta={t.largo} valor={`${formatearNumero(cierre.longitudM, 2)} m`} />
          </dl>
          <p className={`text-sm font-semibold ${cierre.aprobado ? 'text-bosque-700' : 'text-granate-700'}`} role="status">
            {cierre.aprobado ? t.cierra : t.noCierra}
          </p>
          <p className="font-mono text-sm text-tierra-700">{t.formula}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b-2 border-tierra-300 text-left text-xs font-semibold text-tierra-700">
                  <th scope="col" className="px-2 py-2">{t.punto}</th>
                  <th scope="col" className="px-2 py-2 text-right">{t.distancia}</th>
                  <th scope="col" className="px-2 py-2 text-right">{t.cotaLibreta}</th>
                  <th scope="col" className="px-2 py-2 text-right">{t.correccion}</th>
                  <th scope="col" className="px-2 py-2 text-right">{t.cotaCompensada}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tierra-100">
                {cierre.compensados.map((p, i) => {
                  const e = entradas[p.punto] ?? { correccion: '', cota: '' }
                  const cambiar = (campo: 'correccion' | 'cota', valor: string) => onCambio({ ...entradas, [p.punto]: { ...e, [campo]: valor } })
                  const malCorreccion = e.correccion.trim() !== '' && parsearNumero(e.correccion) === null
                  const malCota = e.cota.trim() !== '' && parsearMetrosAMm(e.cota) === null
                  const cota = cotasLibreta[p.punto]
                  return (
                    <tr key={`${p.punto}-${i}`}>
                      <th scope="row" className="px-2 py-2 text-left font-semibold">
                        {p.punto}
                        {i === cierre.compensados.length - 1 && <span className="ml-1 text-xs font-normal text-tierra-600">{t.cierreEn}</span>}
                      </th>
                      <td className="px-2 py-2 text-right font-mono tabular-nums">{formatearNumero(p.distanciaAcumuladaM, 2)}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums">{cota === null || cota === undefined ? '·' : formatearMm(cota)}</td>
                      <td className="px-2 py-2 text-right">
                        <input
                          aria-label={rellenar(t.correccionDe, { punto: p.punto })}
                          inputMode="decimal"
                          placeholder="−2"
                          value={e.correccion}
                          onChange={(ev) => cambiar('correccion', ev.target.value)}
                          aria-invalid={malCorreccion}
                          className={`${claseEntrada} ${malCorreccion ? 'border-granate-500' : 'border-tierra-300'}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          aria-label={rellenar(t.cotaCompensadaDe, { punto: p.punto })}
                          inputMode="decimal"
                          placeholder="100,583"
                          value={e.cota}
                          onChange={(ev) => cambiar('cota', ev.target.value)}
                          aria-invalid={malCota}
                          className={`${claseEntrada} ${malCota ? 'border-granate-500' : 'border-tierra-300'}`}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

function Dato({ etiqueta, valor, alerta = false }: { etiqueta: string; valor: string; alerta?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${alerta ? 'bg-granate-100 text-granate-700' : 'bg-tierra-100 text-tierra-900'}`}>
      <dt className="text-xs font-semibold opacity-80">{etiqueta}</dt>
      <dd className="font-mono text-lg font-semibold tabular-nums">{valor}</dd>
    </div>
  )
}
