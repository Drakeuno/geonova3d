import { Check, Lock, X } from 'lucide-react'
import type { FilaLibreta } from '@/motor/libreta'
import { formatearMm } from '@/motor/numeros'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { textoDistancia, type Celda, type FilaVista } from './vistaLibreta'

const t = textos.libreta
const col = t.columnas

interface Props {
  filas: FilaVista[]
  pr: { punto: string; cotaMm: number }
  onIntentarEditar: (fila: FilaLibreta, celda: Celda) => void
}

const textoTachado = (c: Celda, v: number | null) =>
  v === null ? '—' : c.campo === 'distanciaM' ? textoDistancia(v) : formatearMm(v, { signo: c.campo === 'desnivelMm' })

const NOMBRE_CAMPO: Record<Celda['campo'], string> = {
  lecturaMm: 'lectura',
  distanciaM: 'distancia',
  desnivelMm: 'desnivel',
  cotaMm: 'cota',
}

function ValorCelda({ fila, celda, onIntentarEditar }: { fila: FilaLibreta; celda: Celda | null; onIntentarEditar: Props['onIntentarEditar'] }) {
  if (!celda) return <td className="px-2 py-2" />
  const contenido = (
    <>
      {celda.tachaduras.map((tch, i) => (
        <s key={i} className="mr-1 text-granate-600 decoration-granate-600 decoration-2">
          {textoTachado(celda, tch.valorAnterior)}
        </s>
      ))}
      <span className={celda.delSistema ? 'italic text-tierra-600' : ''}>{celda.texto || '·'}</span>
      {celda.revision === 'ok' && <Check size={14} className="ml-1 inline text-bosque-600" aria-label={t.correcto} />}
      {celda.revision === 'error' && <X size={14} className="ml-1 inline text-granate-600" aria-label={t.revisa} />}
    </>
  )
  // Toda celda escrita por el jugador es un botón: el intento de editarla abre el aviso de bloqueo.
  const esBoton = !celda.delSistema
  return (
    <td className="whitespace-nowrap px-2 py-2 text-right font-mono tabular-nums">
      {esBoton ? (
        <button
          type="button"
          onClick={() => onIntentarEditar(fila, celda)}
          className="rounded px-1 hover:bg-tierra-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bosque-500"
          aria-label={rellenar(t.celda, { n: fila.numero, campo: NOMBRE_CAMPO[celda.campo], valor: celda.texto || 'vacía' })}
        >
          {contenido}
        </button>
      ) : (
        contenido
      )}
    </td>
  )
}

export function TablaLibreta({ filas, pr, onIntentarEditar }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-tierra-300 text-left text-xs font-semibold text-tierra-700">
            <th scope="col" className="px-2 py-2">{col.numero}</th>
            <th scope="col" className="px-2 py-2">{col.estacion}</th>
            <th scope="col" className="px-2 py-2">{col.punto}</th>
            <th scope="col" className="px-2 py-2 text-right">{col.lt}</th>
            <th scope="col" className="px-2 py-2 text-right">{col.la}</th>
            <th scope="col" className="px-2 py-2 text-right">{col.desnivel}</th>
            <th scope="col" className="px-2 py-2 text-right">{col.cota}</th>
            <th scope="col" className="px-2 py-2 text-right">{col.distancia}</th>
            <th scope="col" className="px-2 py-2">{col.observaciones}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-tierra-200">
          <tr className="bg-bosque-50/60 text-tierra-700">
            <td className="px-2 py-2" />
            <td className="px-2 py-2" />
            <td className="px-2 py-2 font-semibold">{pr.punto}</td>
            <td colSpan={3} />
            <td className="px-2 py-2 text-right font-mono font-semibold tabular-nums">{formatearMm(pr.cotaMm)}</td>
            <td />
            <td className="px-2 py-2 text-xs">{t.pr}</td>
          </tr>
          {filas.length === 0 && (
            <tr>
              <td colSpan={9} className="px-2 py-6 text-center text-tierra-600">
                {t.vacia}
              </td>
            </tr>
          )}
          {filas.map((v) => (
            <tr key={v.fila.id} className={v.vigente ? '' : 'bg-tierra-100 text-tierra-700'}>
              <td className="px-2 py-2 font-mono text-xs text-tierra-600">{v.fila.numero}</td>
              <td className="px-2 py-2">{v.fila.estacion}</td>
              <td className="px-2 py-2 font-semibold">{v.fila.punto}</td>
              <ValorCelda fila={v.fila} celda={v.lt} onIntentarEditar={onIntentarEditar} />
              <ValorCelda fila={v.fila} celda={v.la} onIntentarEditar={onIntentarEditar} />
              <ValorCelda fila={v.fila} celda={v.desnivel} onIntentarEditar={onIntentarEditar} />
              <ValorCelda fila={v.fila} celda={v.cota} onIntentarEditar={onIntentarEditar} />
              <ValorCelda fila={v.fila} celda={v.distancia} onIntentarEditar={onIntentarEditar} />
              <td className="px-2 py-2">
                <div className="flex flex-wrap items-center gap-1">
                  {v.fila.anuladaPor && (
                    <span className="chip bg-tierra-200 text-tierra-800">
                      <Lock size={11} aria-hidden /> {rellenar(t.anulada, { n: v.fila.anuladaPor.slice(1) })}
                    </span>
                  )}
                  {v.fila.corrigeA && (
                    <span className="chip bg-bosque-100 text-bosque-800">{rellenar(t.corrige, { n: v.fila.corrigeA.slice(1) })}</span>
                  )}
                  {v.fila.tachaduras.length > 0 && <span className="chip bg-granate-100 text-granate-700">{t.tachada}</span>}
                  {v.fila.observaciones && <span className="text-tierra-700">{v.fila.observaciones}</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
