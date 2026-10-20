import { Droplets, House, Mountain } from 'lucide-react'
import { claveTramo } from '@/misiones/comunes'
import { CASAS_CERO_COTA, PUNTOS_AGUA, PUNTOS_PEHUEN } from '@/misiones/m21'
import { formatearMm, formatearNumero, type Mm } from '@/motor/numeros'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { Campo, DatoEntregado, Entrada, Opciones, Subtitulo, TablaEntradas, TarjetaEtapa, TextoLargo, type PropsFormulario } from './Formulario'

// Etapa de la 2.1 en sus tres pieles (RF-12): la planilla de tramos y la decisión técnica.

const t = textos.etapas
const tramos = (ids: string[]) => ids.slice(1).map((b, i) => [ids[i], b] as const)
const SI_NO = [
  ['si', t.si],
  ['no', t.no],
] as const

/** Piel La Red del Agua: ¿el agua llega por gravedad o hay que bombear? */
export function DecisionAgua({ pendienteMinimaPct, ...p }: PropsFormulario & { pendienteMinimaPct: number }) {
  const a = t.agua
  return (
    <TarjetaEtapa icono={<Droplets size={22} aria-hidden />} titulo={a.titulo} bajada={a.bajada}>
      <dl className="grid gap-2 sm:grid-cols-2">
        <DatoEntregado etiqueta={a.pendienteMinima} valor={`${formatearNumero(pendienteMinimaPct, 1)} %`} />
      </dl>
      <div>
        <Subtitulo>{t.planillaTramos}</Subtitulo>
        <TablaEntradas
          columnas={[t.tramo, t.dh]}
          filas={tramos(PUNTOS_AGUA).map(([x, y]) => ({
            id: `${x}–${y}`,
            celdas: [<Entrada key="dh" {...p} clave={claveTramo('dh', x, y)} etiqueta={rellenar(t.dhDe, { a: x, b: y })} placeholder="+0,000" />],
          }))}
        />
      </div>
      <div>
        <Subtitulo>{a.citas}</Subtitulo>
        <p className="mt-1 font-mono text-sm text-tierra-700">{a.formula}</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo {...p} clave="cota:F" etiqueta={a.cotaF} placeholder="96,430" />
          <Campo {...p} clave="cota:V4" etiqueta={a.cotaV4} placeholder="100,461" />
          <Campo {...p} clave="dist" etiqueta={a.distancia} ayuda={a.distanciaAyuda} />
          <Campo {...p} clave="pendiente" etiqueta={a.pendiente} placeholder="−1,008" />
        </div>
      </div>
      <Opciones
        {...p}
        clave="decision"
        etiqueta={a.decision}
        opciones={[
          ['gravedad', a.gravedad],
          ['bombeo', a.bombeo],
        ]}
      />
      <TextoLargo {...p} clave="justificacion" etiqueta={t.justificacion} minimo={30} placeholder={a.ejemploJustificacion} />
    </TarjetaEtapa>
  )
}

/** Piel Camino del Pehuén: ¿algún tramo pasa la pendiente máxima transitable? */
export function DecisionPehuen({ pendienteMaximaPct, ...p }: PropsFormulario & { pendienteMaximaPct: number }) {
  const ph = t.pehuen
  const maximo = `${formatearNumero(pendienteMaximaPct, 0)} %`
  return (
    <TarjetaEtapa icono={<Mountain size={22} aria-hidden />} titulo={ph.titulo} bajada={ph.bajada}>
      <dl className="grid gap-2 sm:grid-cols-2">
        <DatoEntregado etiqueta={ph.pendienteMaxima} valor={maximo} />
      </dl>
      <div>
        <Subtitulo>{t.planillaTramos}</Subtitulo>
        <p className="mt-1 font-mono text-sm text-tierra-700">{ph.formula}</p>
        <TablaEntradas
          columnas={[t.tramo, t.dh, ph.pendiente, rellenar(ph.excede, { max: maximo })]}
          filas={tramos(PUNTOS_PEHUEN).map(([x, y]) => ({
            id: `${x}–${y}`,
            celdas: [
              <Entrada key="dh" {...p} clave={claveTramo('dh', x, y)} etiqueta={rellenar(t.dhDe, { a: x, b: y })} />,
              <Entrada key="p" {...p} clave={claveTramo('p', x, y)} etiqueta={rellenar(ph.pendienteDe, { a: x, b: y })} />,
              <div key="e" className="flex justify-end">
                <Opciones {...p} compacto clave={claveTramo('excede', x, y)} etiqueta={rellenar(ph.excedeDe, { a: x, b: y, max: maximo })} opciones={SI_NO} />
              </div>,
            ],
          }))}
        />
      </div>
      <Opciones
        {...p}
        clave="decision"
        etiqueta={ph.decision}
        opciones={[
          ['transitable', ph.transitable],
          ['no-transitable', ph.noTransitable],
        ]}
      />
      <TextoLargo {...p} clave="justificacion" etiqueta={t.justificacion} minimo={30} placeholder={ph.ejemploJustificacion} />
    </TarjetaEtapa>
  )
}

/** Piel Operación Cero Cota: ¿qué casas quedan bajo la línea de seguridad? */
export function DecisionCeroCota({ lineaMm, ...p }: PropsFormulario & { lineaMm: Mm }) {
  const c = t.ceroCota
  return (
    <TarjetaEtapa icono={<House size={22} aria-hidden />} titulo={c.titulo} bajada={c.bajada}>
      <dl className="grid gap-2 sm:grid-cols-2">
        <DatoEntregado etiqueta={c.linea} valor={`${formatearMm(lineaMm)} m`} />
      </dl>
      <div>
        <Subtitulo>{c.planilla}</Subtitulo>
        <p className="mt-1 font-mono text-sm text-tierra-700">{c.formula}</p>
        <TablaEntradas
          columnas={[c.casa, c.cota, c.margen, c.bajo]}
          filas={CASAS_CERO_COTA.map((casa) => ({
            id: casa,
            celdas: [
              <Entrada key="c" {...p} clave={`cota:${casa}`} etiqueta={rellenar(c.cotaDe, { a: casa })} />,
              <Entrada key="m" {...p} clave={`margen:${casa}`} etiqueta={rellenar(c.margenDe, { a: casa })} />,
              <div key="b" className="flex justify-end">
                <Opciones {...p} compacto clave={`bajo:${casa}`} etiqueta={rellenar(c.bajoDe, { a: casa })} opciones={SI_NO} />
              </div>,
            ],
          }))}
        />
      </div>
      <TextoLargo {...p} clave="justificacion" etiqueta={t.justificacion} minimo={30} placeholder={c.ejemploJustificacion} />
    </TarjetaEtapa>
  )
}
