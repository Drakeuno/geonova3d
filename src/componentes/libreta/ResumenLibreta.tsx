import { CheckCircle2 } from 'lucide-react'
import { calcularRegistro, cantidadTachaduras, comprobacionAritmetica, type ModoCalculo, type RegistroLibreta } from '@/motor/libreta'
import { formatearMm } from '@/motor/numeros'
import textos from '@/textos/es-CL.json'

const t = textos.libreta.resumen

function Dato({ etiqueta, valor, tono = 'neutro' }: { etiqueta: string; valor: string; tono?: 'neutro' | 'alerta' }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${tono === 'alerta' ? 'bg-granate-100 text-granate-700' : 'bg-tierra-100 text-tierra-900'}`}>
      <dt className="text-xs font-semibold opacity-80">{etiqueta}</dt>
      <dd className="font-mono text-lg font-semibold tabular-nums">{valor}</dd>
    </div>
  )
}

export function ResumenLibreta({ registro, modo, penalizacionXp }: { registro: RegistroLibreta; modo: ModoCalculo; penalizacionXp: number }) {
  const { vigentes } = calcularRegistro(registro)
  const { sumaLtMm, sumaLaMm, sumaDesnivelesMm, cuadra } = comprobacionAritmetica(registro)
  const correcciones = registro.filas.filter((f) => f.corrigeA !== null).length
  const tachaduras = cantidadTachaduras(registro)

  return (
    <div className="space-y-3">
      {modo === 'manual' ? (
        <p className="text-sm text-tierra-600">{t.manual}</p>
      ) : (
        vigentes.length > 0 && (
          <>
            <dl className="grid grid-cols-3 gap-2">
              <Dato etiqueta={t.sumaLt} valor={formatearMm(sumaLtMm)} />
              <Dato etiqueta={t.sumaLa} valor={formatearMm(sumaLaMm)} />
              <Dato etiqueta={t.sumaDesniveles} valor={formatearMm(sumaDesnivelesMm, { signo: true })} />
            </dl>
            {cuadra && (
              <p className="flex items-center gap-1.5 text-sm text-bosque-700">
                <CheckCircle2 size={16} aria-hidden /> {t.comprobacionOk}
              </p>
            )}
          </>
        )
      )}
      <dl className="grid grid-cols-3 gap-2">
        <Dato etiqueta={t.filas} valor={String(registro.filas.length)} />
        <Dato etiqueta={t.correcciones} valor={String(correcciones)} />
        <Dato
          etiqueta={t.tachaduras}
          valor={tachaduras ? `${tachaduras} (−${tachaduras * penalizacionXp} XP)` : '0'}
          tono={tachaduras ? 'alerta' : 'neutro'}
        />
      </dl>
    </div>
  )
}
