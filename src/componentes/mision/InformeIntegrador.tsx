import { FileDown, FileText } from 'lucide-react'
import { claveTramo } from '@/misiones/comunes'
import { formatearNumero } from '@/motor/numeros'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { CampoTexto, Entrada, Seleccion, Subtitulo, TablaEntradas, TarjetaEtapa, TextoLargo, type PropsFormulario } from './Formulario'

// Etapa final de la 3.3: análisis de pendientes por tramo, identificación del tramo que pasa el
// máximo de accesibilidad y el informe técnico (libreta + perfil + análisis + conclusiones).

const t = textos.integrador

interface Props extends PropsFormulario {
  tramos: readonly (readonly [string, string])[]
  maximoPct: number
  onExportar: () => void
}

export function InformeIntegrador({ tramos, maximoPct, onExportar, ...p }: Props) {
  const maximo = `${formatearNumero(maximoPct, 0)} %`
  return (
    <TarjetaEtapa icono={<FileText size={22} aria-hidden />} titulo={t.titulo} bajada={t.bajada}>
      <div>
        <Subtitulo>{rellenar(t.pendientes, { max: maximo })}</Subtitulo>
        <p className="mt-1 font-mono text-sm text-tierra-700">{t.formula}</p>
        <TablaEntradas
          columnas={[textos.etapas.tramo, t.pendiente]}
          filas={tramos.map(([a, b]) => ({
            id: `${a}–${b}`,
            celdas: [<Entrada key="p" {...p} clave={claveTramo('p', a, b)} etiqueta={rellenar(textos.etapas.pehuen.pendienteDe, { a, b })} />],
          }))}
        />
        <div className="mt-3 max-w-md">
          <Seleccion
            {...p}
            clave="tramoCritico"
            etiqueta={rellenar(t.tramoCritico, { max: maximo })}
            vacia={textos.perfil.dibujo.elegir}
            opciones={[...tramos.map(([a, b]) => [`${a}|${b}`, `${a}–${b}`] as const), ['ninguno', t.ninguno] as const]}
          />
        </div>
      </div>

      <div>
        <Subtitulo>{t.informe}</Subtitulo>
        <div className="mt-2 space-y-3">
          <CampoTexto {...p} clave="tituloInforme" etiqueta={t.tituloInforme} placeholder={t.ejemploTitulo} />
          <TextoLargo {...p} clave="conclusiones" etiqueta={t.conclusiones} minimo={120} placeholder={t.ejemploConclusiones} />
        </div>
        <button type="button" className="btn-neutro mt-3" onClick={onExportar}>
          <FileDown size={16} aria-hidden /> {t.exportar}
        </button>
        <p className="mt-1 text-xs text-tierra-600">{t.exportarAyuda}</p>
      </div>
    </TarjetaEtapa>
  )
}
