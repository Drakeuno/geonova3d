import { MISIONES } from '@/datos/misiones'
import type { IntegranteCurso } from '@/motor/cuadrillas'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { Medalla } from './Medalla'

// Insignias de una persona (§6.2): una por misión (las grupales son de su cuadrilla) y la especial.

const t = textos.insignias
const TOTAL = MISIONES.length + 1

const etiqueta = (nombre: string, obtenida: boolean) => `${nombre} (${obtenida ? t.obtenida : t.pendiente})`

export function contarInsignias(i: Pick<IntegranteCurso, 'insignias' | 'especial'>) {
  return { n: i.insignias.length + (i.especial ? 1 : 0), total: TOTAL }
}

/** Fila de discos para el mapa del viaje. */
export function VitrinaCompacta({ integrante }: { integrante: IntegranteCurso }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={rellenar(t.resumen, contarInsignias(integrante))}>
      {MISIONES.map((m) => {
        const obtenida = integrante.insignias.includes(m.id)
        return (
          <li key={m.id} title={`${m.id} · ${etiqueta(m.insignia.nombre, obtenida)}`}>
            <Medalla clave={m.insignia.metal} obtenida={obtenida} tamano="sm" />
            <span className="sr-only">{etiqueta(m.insignia.nombre, obtenida)}</span>
          </li>
        )
      })}
      <li title={etiqueta(t.especial, integrante.especial)}>
        <Medalla clave="especial" obtenida={integrante.especial} tamano="sm" />
        <span className="sr-only">{etiqueta(t.especial, integrante.especial)}</span>
      </li>
    </ul>
  )
}

/** Vitrina completa: nombre, metal y estado de cada insignia, y el avance hacia la especial. */
export function VitrinaInsignias({ integrante }: { integrante: IntegranteCurso }) {
  return (
    <div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {MISIONES.map((m) => {
          const obtenida = integrante.insignias.includes(m.id)
          return (
            <li key={m.id} className={`flex items-center gap-3 rounded-xl border p-2.5 ${obtenida ? 'border-tierra-200 bg-white' : 'border-tierra-100 bg-tierra-50'}`}>
              <Medalla clave={m.insignia.metal} obtenida={obtenida} />
              <span className="min-w-0 flex-1 leading-tight">
                <span className={`block font-semibold ${obtenida ? 'text-tierra-900' : 'text-tierra-600'}`}>{m.insignia.nombre}</span>
                <span className="block text-xs text-tierra-600">
                  {m.id} · {textos.metales[m.insignia.metal]}
                  {m.insignia.grupal && `, ${t.grupal}`} · {obtenida ? t.obtenida : t.pendiente}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
      <div
        className={`mt-2 flex items-center gap-3 rounded-xl border p-3 ${integrante.especial ? 'border-granate-200 bg-granate-50' : 'border-tierra-100 bg-tierra-50'}`}
      >
        <Medalla clave="especial" obtenida={integrante.especial} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block font-semibold text-tierra-900">
            {t.especial} <span className="text-xs font-normal text-tierra-600">· {integrante.especial ? t.obtenida : t.pendiente}</span>
          </span>
          <span className="block text-xs text-tierra-600">{t.especialRequisito}</span>
          <span className="mt-1 block text-sm font-semibold text-tierra-800">
            {rellenar(t.progresoEspecial, { insignias: integrante.insignias.length, total: MISIONES.length, ayudados: Math.min(integrante.ayudados, 3) })}
          </span>
        </span>
      </div>
    </div>
  )
}
