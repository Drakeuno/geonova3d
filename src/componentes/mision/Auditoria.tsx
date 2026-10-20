import { FileDown, ScanSearch, X } from 'lucide-react'
import type { Parametros } from '@/datos/parametros'
import { aplicarMarcas, type ColumnaAuditable, type FilaAuditoria } from '@/motor/auditoria'
import { formatearMm, formatearNumero } from '@/motor/numeros'
import { claveMarca, COLUMNAS_AUDITABLES, marcasDe } from '@/misiones/m31'
import type { SesionAuditoria } from '@/misiones/tipos'
import { geometriaPerfil, planoSugeridoMm } from '@/componentes/perfil/geometriaPerfil'
import { PerfilSvg } from '@/componentes/perfil/PerfilSvg'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { Subtitulo, TarjetaEtapa, type PropsFormulario } from './Formulario'
import { Desplazable } from '@/componentes/ui/Desplazable'

// Etapa de la 3.1: auditar la tabla de la contratista. Cada celda auditable se marca como errónea y
// se le escribe su valor correcto; la tabla nunca se borra: el valor original queda tachado al lado.

const t = textos.auditoria

const texto = (columna: ColumnaAuditable, v: number | null) =>
  v === null ? '' : columna === 'distanciaAcumuladaM' ? formatearNumero(v, 2) : formatearMm(v, { signo: columna === 'desnivelMm' })

/** Valor para empezar a corregir: el de la celda, escrito como lo escribiría el jugador. */
const textoEditable = (columna: ColumnaAuditable, v: number | null) =>
  v === null ? '' : columna === 'distanciaAcumuladaM' ? String(v).replace('.', ',') : formatearMm(v).replace('−', '-')

/** Perfil (estaciones con su cota) de una tabla: el que se dibuja y se defiende. */
export const perfilDeTabla = (tabla: FilaAuditoria[]) =>
  tabla.map((f) => ({ id: f.estacion, progresivaM: f.distanciaAcumuladaM, cotaMm: f.cotaMm }))

/** Tabla con las correcciones legibles del jugador aplicadas. */
export const tablaCorregida = (sesion: SesionAuditoria, formulario: Record<string, string>) => aplicarMarcas(sesion.entregada, marcasDe(formulario).marcas)

interface Props extends PropsFormulario {
  sesion: SesionAuditoria
  sendero: string
  parametros: Parametros
  estudiante: string
}

export function Auditoria({ sesion, sendero, parametros, estudiante, formulario, onCambio }: Props) {
  const marcadas = Object.keys(formulario).filter((k) => k.startsWith('marca:')).length
  const corregida = tablaCorregida(sesion, formulario)
  const estaciones = perfilDeTabla(corregida)
  const g = geometriaPerfil(estaciones, { horizontal: parametros.perfil.escalaHorizontal, vertical: parametros.perfil.escalaVertical }, planoSugeridoMm(estaciones))
  const rotulos = { titulo: rellenar(t.tituloPerfil, { sendero }), ejeX: textos.perfil.ejes.progresiva, ejeY: textos.perfil.ejes.cota }

  return (
    <TarjetaEtapa icono={<ScanSearch size={22} aria-hidden />} titulo={t.titulo} bajada={rellenar(t.bajada, { sendero })}>
      <div>
        <Subtitulo>{t.tabla}</Subtitulo>
        <p className="mt-1 text-sm text-tierra-700">{t.instrucciones}</p>
        <Desplazable etiqueta={textos.zonas.tablaContratista} className="mt-2">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-tierra-300 text-left text-xs font-semibold text-tierra-700">
                <th scope="col" className="px-2 py-2">{t.columnas.estacion}</th>
                <th scope="col" className="px-2 py-2 text-right">{t.columnas.parcial}</th>
                {COLUMNAS_AUDITABLES.map((c) => (
                  <th key={c} scope="col" className="px-2 py-2 text-right">
                    {t.columnas[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-tierra-200">
              {sesion.entregada.map((fila, i) => (
                <tr key={fila.estacion}>
                  <th scope="row" className="px-2 py-1.5 text-left font-semibold">
                    {fila.estacion}
                  </th>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">{i === 0 ? '—' : formatearNumero(fila.distanciaParcialM, 2)}</td>
                  {COLUMNAS_AUDITABLES.map((c) =>
                    i === 0 ? (
                      <td key={c} className="px-2 py-1.5 text-right font-mono tabular-nums text-tierra-600">
                        {texto(c, fila[c])}
                      </td>
                    ) : (
                      <Celda key={c} fila={i} columna={c} valor={fila[c]} estacion={fila.estacion} formulario={formulario} onCambio={onCambio} />
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Desplazable>
        <p className="mt-2 text-sm font-semibold text-tierra-800" role="status">
          {rellenar(t.marcadas, { n: marcadas })}
        </p>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Subtitulo>{t.perfilCorregido}</Subtitulo>
          <button
            type="button"
            className="btn-neutro"
            onClick={() =>
              void import('@/componentes/perfil/exportarPerfilPdf').then((m) =>
                m.exportarPerfilPdf({ g, rotulos, estudiante, mision: '3.1 El Error Crítico', archivo: `perfil-corregido-3.1-${estudiante.replace(/\s+/g, '-')}.pdf` }),
              )
            }
          >
            <FileDown size={16} aria-hidden /> {t.exportar}
          </button>
        </div>
        <p className="mt-1 text-sm text-tierra-600">{t.perfilAyuda}</p>
        <div className="mt-2">
          <PerfilSvg g={g} rotulos={rotulos} />
        </div>
      </div>
    </TarjetaEtapa>
  )
}

function Celda({
  fila,
  columna,
  valor,
  estacion,
  formulario,
  onCambio,
}: PropsFormulario & { fila: number; columna: ColumnaAuditable; valor: number | null; estacion: string }) {
  const clave = claveMarca(fila, columna)
  // Marcada = la clave existe, aunque el valor esté a medio escribir.
  const marcada = clave in formulario
  const nombre = rellenar(t.celda, { estacion, columna: t.columnas[columna] })
  if (!marcada) {
    return (
      <td className="px-1 py-1 text-right">
        <button
          type="button"
          onClick={() => onCambio(clave, textoEditable(columna, valor))}
          aria-label={rellenar(t.marcar, { celda: nombre, valor: texto(columna, valor) })}
          className="w-full rounded px-1.5 py-1 text-right font-mono tabular-nums hover:bg-buey-50 hover:ring-1 hover:ring-buey-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bosque-500"
        >
          {texto(columna, valor)}
        </button>
      </td>
    )
  }
  return (
    <td className="bg-granate-50 px-1 py-1 text-right">
      <div className="flex items-center justify-end gap-1">
        <s className="font-mono text-xs text-granate-600 decoration-granate-600">{texto(columna, valor)}</s>
        <input
          aria-label={rellenar(t.corregir, { celda: nombre })}
          inputMode="decimal"
          value={formulario[clave]}
          onChange={(e) => onCambio(clave, e.target.value)}
          className="w-24 rounded border border-granate-400 bg-white px-1.5 py-1 text-right font-mono text-sm focus:outline-none focus:ring-2 focus:ring-bosque-500"
        />
        <button type="button" onClick={() => onCambio(clave, null)} aria-label={rellenar(t.desmarcar, { celda: nombre })} className="rounded p-0.5 text-granate-700 hover:bg-granate-100">
          <X size={14} aria-hidden />
        </button>
      </div>
    </td>
  )
}
