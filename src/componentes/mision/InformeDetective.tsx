import { FileSearch } from 'lucide-react'
import { PUNTO_ESTANQUE, VIVIENDAS_2_2 } from '@/misiones/m22'
import { formatearMm, formatearNumero, type Mm } from '@/motor/numeros'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { Campo, DatoEntregado, Entrada, Opciones, Subtitulo, TablaEntradas, TarjetaEtapa, TextoLargo, type PropsFormulario } from './Formulario'

// Etapa de la 2.2: el informe del detective. Compara el radier re-nivelado con el plano antiguo,
// calcula las presiones reales y propone la cota del estanque.

const t = textos.etapas
const d = t.detective

export function InformeDetective({
  radierPlanoMm,
  alturaTorreMm,
  presionMinimaMca,
  ...p
}: PropsFormulario & { radierPlanoMm: Mm; alturaTorreMm: Mm; presionMinimaMca: number }) {
  return (
    <TarjetaEtapa icono={<FileSearch size={22} aria-hidden />} titulo={d.titulo} bajada={d.bajada}>
      <div>
        <Subtitulo>{d.plano}</Subtitulo>
        <dl className="mt-2 grid gap-2 sm:grid-cols-3">
          <DatoEntregado etiqueta={d.radierPlano} valor={`${formatearMm(radierPlanoMm)} m`} />
          <DatoEntregado etiqueta={d.torre} valor={`${formatearMm(alturaTorreMm)} m`} />
          <DatoEntregado etiqueta={d.estanquePlano} valor={`${formatearMm(radierPlanoMm + alturaTorreMm)} m`} />
        </dl>
      </div>

      <div>
        <Subtitulo>{d.verificacion}</Subtitulo>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo {...p} clave={`cota:${PUNTO_ESTANQUE}`} etiqueta={d.radierMedido} ayuda={d.radierAyuda} />
          <Campo {...p} clave="dif" etiqueta={d.diferencia} ayuda={d.diferenciaAyuda} />
          <Campo {...p} clave="cotaEstanque" etiqueta={d.estanqueReal} ayuda={d.estanqueAyuda} />
        </div>
        <div className="mt-3">
          <Opciones
            {...p}
            clave="alterado"
            etiqueta={d.alterado}
            opciones={[
              ['si', d.alteradoSi],
              ['no', d.alteradoNo],
            ]}
          />
        </div>
      </div>

      <div>
        <Subtitulo>{d.viviendas}</Subtitulo>
        <p className="mt-1 font-mono text-sm text-tierra-700">{d.formulaPresion}</p>
        <TablaEntradas
          columnas={[d.vivienda, d.cota, rellenar(d.presion, { mca: formatearNumero(presionMinimaMca, 0) })]}
          filas={VIVIENDAS_2_2.map((v) => ({
            id: v,
            celdas: [
              <Entrada key="c" {...p} clave={`cota:${v}`} etiqueta={rellenar(d.cotaDe, { v })} />,
              <Entrada key="p" {...p} clave={`presion:${v}`} etiqueta={rellenar(d.presionDe, { v })} />,
            ],
          }))}
        />
      </div>

      <div>
        <Subtitulo>{d.propuesta}</Subtitulo>
        <p className="mt-1 font-mono text-sm text-tierra-700">{rellenar(d.formulaOptima, { mca: formatearNumero(presionMinimaMca, 0) })}</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Campo {...p} clave="cotaOptima" etiqueta={d.optima} />
          <Campo {...p} clave="cotaPropuesta" etiqueta={d.propuestaCota} ayuda={d.propuestaAyuda} />
        </div>
      </div>

      <TextoLargo {...p} clave="justificacion" etiqueta={t.justificacion} minimo={30} placeholder={d.ejemploJustificacion} />
    </TarjetaEtapa>
  )
}
