import { useId, type ReactNode } from 'react'
import { ChartLine, FileDown, Table2 } from 'lucide-react'
import type { Parametros } from '@/datos/parametros'
import type { EstacionPerfil } from '@/motor/perfil'
import { parsearMetrosAMm, parsearNumero } from '@/motor/numeros'
import { EJES_PERFIL, type EjePerfil, type EntradasPerfil } from '@/misiones/tipos'
import textos from '@/textos/es-CL.json'
import { geometriaPerfil, planoSugeridoMm } from './geometriaPerfil'
import { PerfilSvg, type RotulosPerfil } from './PerfilSvg'
import { Desplazable } from '@/componentes/ui/Desplazable'

const t = textos.perfil

interface Props {
  /** Estaciones del eje (E0…E5). */
  eje: string[]
  /** Perfil generado desde la libreta del jugador (RF-09). */
  estaciones: EstacionPerfil[]
  entradas: EntradasPerfil
  onCambio: (e: EntradasPerfil) => void
  parametros: Parametros
  estudiante: string
  mision: string
}

const claseCampo = 'w-full rounded-lg border border-tierra-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-bosque-500'
const claseEntrada = `${claseCampo} text-right font-mono`

/** Escala escrita por el jugador si es razonable para dibujar; si no, la del docente. */
const escalaParaDibujar = (texto: string, porDefecto: number) => {
  const n = parsearNumero(texto)
  return n !== null && n >= 10 && n <= 5000 ? n : porDefecto
}

export const rotuloEje = (eje: EjePerfil | '') => (eje ? t.ejes[eje] : '')

/**
 * Etapa de la 1.3: planilla del perfil (progresiva, cota, Δh parcial y acumulado, calculados por el
 * jugador) y plantilla del dibujo (escalas, plano de comparación, rótulos). El dibujo sale de la libreta.
 */
export function PlanillaPerfil({ eje, estaciones, entradas, onCambio, parametros, estudiante, mision }: Props) {
  const idBase = useId()
  const fila = (id: string) => entradas.filas[id] ?? { progresiva: '', cota: '', parcial: '', acumulado: '' }
  const cambiarFila = (id: string, campo: keyof ReturnType<typeof fila>, valor: string) =>
    onCambio({ ...entradas, filas: { ...entradas.filas, [id]: { ...fila(id), [campo]: valor } } })
  const cambiar = <K extends keyof EntradasPerfil>(campo: K, valor: EntradasPerfil[K]) => onCambio({ ...entradas, [campo]: valor })

  const escalas = {
    horizontal: escalaParaDibujar(entradas.escalaH, parametros.perfil.escalaHorizontal),
    vertical: escalaParaDibujar(entradas.escalaV, parametros.perfil.escalaVertical),
  }
  const planoEscrito = parsearMetrosAMm(entradas.planoComparacion)
  const minima = Math.min(...estaciones.map((e) => e.cotaMm))
  const plano = planoEscrito !== null && planoEscrito <= minima && minima - planoEscrito <= 5000 ? planoEscrito : planoSugeridoMm(estaciones)
  const g = geometriaPerfil(estaciones, escalas, plano)
  const rotulos: RotulosPerfil = { titulo: entradas.titulo.trim(), ejeX: rotuloEje(entradas.ejeX), ejeY: rotuloEje(entradas.ejeY) }

  const columnas: [keyof ReturnType<typeof fila>, string, string][] = [
    ['progresiva', t.planilla.progresiva, '20'],
    ['cota', t.planilla.cota, '100,071'],
    ['parcial', t.planilla.parcial, '+0,259'],
    ['acumulado', t.planilla.acumulado, '+0,259'],
  ]

  return (
    <section className="card overflow-hidden" aria-labelledby={`${idBase}-titulo`}>
      <header className="flex items-center gap-3 border-b border-tierra-200 bg-tierra-100/60 px-4 py-3">
        <ChartLine size={22} className="text-bosque-700" aria-hidden />
        <div>
          <h2 id={`${idBase}-titulo`} className="text-xl font-bold text-tierra-900">
            {t.titulo}
          </h2>
          <p className="text-sm text-tierra-600">{t.bajada}</p>
        </div>
      </header>

      <div className="space-y-6 p-4">
        <div>
          <h3 className="flex items-center gap-2 font-display font-bold text-tierra-900">
            <Table2 size={18} aria-hidden /> {t.planilla.titulo}
          </h3>
          <Desplazable etiqueta={textos.zonas.planilla} className="mt-2">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b-2 border-tierra-300 text-left text-xs font-semibold text-tierra-700">
                  <th scope="col" className="px-2 py-2">{t.planilla.estacion}</th>
                  {columnas.map(([c, nombre]) => (
                    <th key={c} scope="col" className="px-2 py-2 text-right">{nombre}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-tierra-100">
                {eje.map((id, i) => (
                  <tr key={id}>
                    <th scope="row" className="px-2 py-1.5 text-left font-semibold">{id}</th>
                    {columnas.map(([c, nombre, ejemplo]) => (
                      <td key={c} className="px-2 py-1.5">
                        {c === 'parcial' && i === 0 ? (
                          <span className="block text-right text-tierra-500">—</span>
                        ) : (
                          <input
                            aria-label={`${nombre}, ${id}`}
                            inputMode="decimal"
                            placeholder={i === 1 ? ejemplo : ''}
                            value={fila(id)[c]}
                            onChange={(e) => cambiarFila(id, c, e.target.value)}
                            className={claseEntrada}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Desplazable>
        </div>

        <div>
          <h3 className="flex items-center gap-2 font-display font-bold text-tierra-900">
            <ChartLine size={18} aria-hidden /> {t.dibujo.titulo}
          </h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Campo etiqueta={t.dibujo.tituloPerfil} className="sm:col-span-2 lg:col-span-3">
              {(id) => (
                <input id={id} value={entradas.titulo} onChange={(e) => cambiar('titulo', e.target.value)} placeholder={t.dibujo.ejemploTitulo} className={claseCampo} />
              )}
            </Campo>
            <Campo etiqueta={t.dibujo.escalaH}>
              {(id) => (
                <span className="flex items-center gap-1 font-mono">
                  1:
                  <input id={id} inputMode="numeric" value={entradas.escalaH} onChange={(e) => cambiar('escalaH', e.target.value)} className={claseEntrada} />
                </span>
              )}
            </Campo>
            <Campo etiqueta={t.dibujo.escalaV}>
              {(id) => (
                <span className="flex items-center gap-1 font-mono">
                  1:
                  <input id={id} inputMode="numeric" value={entradas.escalaV} onChange={(e) => cambiar('escalaV', e.target.value)} className={claseEntrada} />
                </span>
              )}
            </Campo>
            <Campo etiqueta={t.dibujo.plano}>
              {(id) => (
                <input id={id} inputMode="decimal" placeholder="99,000" value={entradas.planoComparacion} onChange={(e) => cambiar('planoComparacion', e.target.value)} className={claseEntrada} />
              )}
            </Campo>
            <Campo etiqueta={t.dibujo.ejeX}>
              {(id) => <SelectorEje id={id} valor={entradas.ejeX} onCambio={(v) => cambiar('ejeX', v)} />}
            </Campo>
            <Campo etiqueta={t.dibujo.ejeY}>
              {(id) => <SelectorEje id={id} valor={entradas.ejeY} onCambio={(v) => cambiar('ejeY', v)} />}
            </Campo>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-tierra-600">{t.vistaPrevia}</p>
            <button
              type="button"
              className="btn-neutro"
              disabled={g.puntos.length < 2}
              onClick={() =>
                void import('./exportarPerfilPdf').then((m) =>
                  m.exportarPerfilPdf({ g, rotulos, estudiante, mision, archivo: `perfil-${mision.split(' ')[0]}-${estudiante.replace(/\s+/g, '-')}.pdf` }),
                )
              }
            >
              <FileDown size={16} aria-hidden /> {t.exportar}
            </button>
          </div>
          <div className="mt-2">
            <PerfilSvg g={g} rotulos={rotulos} />
          </div>
        </div>
      </div>
    </section>
  )
}

function Campo({ etiqueta, className = '', children }: { etiqueta: string; className?: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-semibold text-tierra-700">
        {etiqueta}
      </label>
      <div className="mt-1">{children(id)}</div>
    </div>
  )
}

function SelectorEje({ id, valor, onCambio }: { id: string; valor: EjePerfil | ''; onCambio: (v: EjePerfil | '') => void }) {
  return (
    <select
      id={id}
      value={valor}
      onChange={(e) => onCambio(e.target.value as EjePerfil | '')}
      className="w-full rounded-lg border border-tierra-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-bosque-500"
    >
      <option value="">{t.dibujo.elegir}</option>
      {EJES_PERFIL.map((e) => (
        <option key={e} value={e}>
          {t.ejes[e]}
        </option>
      ))}
    </select>
  )
}
