import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileDown, NotebookPen } from 'lucide-react'
import type { Parametros } from '@/datos/parametros'
import {
  esperadoParaBorrador,
  filasVigentes,
  registroVacio,
  revisarParaEntrega,
  type FilaLibreta,
  type ModoCalculo,
  type RevisionEntrega,
} from '@/motor/libreta'
import { aMm, parsearMetrosAMm, type Mm } from '@/motor/numeros'
import { penalizacionTachadura } from '@/motor/puntaje'
import { useLibretas } from '@/estado/libretas'
import { useJuego } from '@/estado/juego'
import { Aviso, type MensajeAviso } from '@/componentes/ui/Aviso'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { borradorDesdeFila, borradorVacio, leerBorrador, type Borrador, type CampoBorrador, type VisadaSugerida } from './borrador'
import { DialogoBloqueo } from './DialogoBloqueo'
import { FormularioFila } from './FormularioFila'
import { ResumenLibreta } from './ResumenLibreta'
import { TablaLibreta } from './TablaLibreta'
import { vistaLibreta, type Celda } from './vistaLibreta'

const t = textos.libreta

export interface PropsLibreta {
  /** Identifica la libreta guardada (persona + misión + intento). */
  clave: string
  usuarioId: string
  misionId: string
  titulo: string
  estudiante: string
  pr: { punto: string; cotaMm: Mm }
  modo: ModoCalculo
  parametros: Parametros
  /** Secuencia de visadas de la misión: sugiere estación, punto y tipo de la línea siguiente. */
  plan?: VisadaSugerida[]
}

/** Sin plan, sigue la estación en curso: tras una LT viene una LA. */
function sugerencia(vigentes: FilaLibreta[], pr: PropsLibreta['pr'], plan?: VisadaSugerida[]): VisadaSugerida {
  if (plan) return plan[vigentes.length] ?? { estacion: '', punto: '', tipo: 'LT' }
  const ultima = vigentes[vigentes.length - 1]
  if (!ultima) return { estacion: 'E1', punto: pr.punto, tipo: 'LT' }
  return { estacion: ultima.estacion, punto: '', tipo: 'LA' }
}

export function Libreta({ clave, usuarioId, misionId, titulo, estudiante, pr, modo, parametros, plan }: PropsLibreta) {
  const { registros, borradores, abrir, registrar, corregir, tachar, guardarBorrador } = useLibretas()
  const registrarMovimiento = useJuego((s) => s.registrarMovimiento)
  const [errores, setErrores] = useState<Partial<Record<CampoBorrador, string>>>({})
  const [dialogo, setDialogo] = useState<{ fila: FilaLibreta; celda: Celda } | null>(null)
  const [aviso, setAviso] = useState<MensajeAviso | null>(null)
  const [revision, setRevision] = useState<RevisionEntrega | null>(null)
  const refLectura = useRef<HTMLInputElement>(null)
  const refFormulario = useRef<HTMLDivElement>(null)

  useEffect(() => abrir(clave, pr), [abrir, clave, pr])

  const registro = registros[clave] ?? registroVacio(pr)
  const vigentes = filasVigentes(registro)
  const borrador = borradores[clave] ?? borradorVacio(sugerencia(vigentes, pr, plan))
  const penalizacionXp = parametros.xp.penalizacionTachadura
  const esperado = esperadoParaBorrador(
    registro,
    modo,
    { estacion: borrador.estacion, tipo: borrador.tipo, lecturaMm: parsearMetrosAMm(borrador.lectura) },
    borrador.corrigeA,
  )
  const numeroCorregido = borrador.corrigeA ? (registro.filas.find((f) => f.id === borrador.corrigeA)?.numero ?? null) : null

  const cambiarBorrador = (b: Borrador) => {
    guardarBorrador(clave, b)
    setErrores({})
  }

  const registrarBorrador = () => {
    const { datos, errores: encontrados } = leerBorrador(borrador, modo, aMm(parametros.lectura.largoMiraM))
    setErrores(encontrados)
    if (!datos) return
    if (borrador.corrigeA) {
      corregir(clave, borrador.corrigeA, datos)
      setAviso({ id: Date.now(), texto: rellenar(t.aviso.correccion, { n: registro.filas.length + 1 }), tono: 'exito' })
    } else {
      registrar(clave, datos)
    }
    guardarBorrador(clave, null)
    setRevision(null)
    refLectura.current?.focus()
  }

  const corregirFila = (fila: FilaLibreta) => {
    guardarBorrador(clave, borradorDesdeFila(fila))
    setDialogo(null)
    refFormulario.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    refLectura.current?.focus()
  }

  const tacharCelda = (fila: FilaLibreta, celda: Celda, valor: number | null) => {
    tachar(clave, fila.id, celda.campo, valor)
    registrarMovimiento(usuarioId, penalizacionTachadura(parametros.xp, misionId))
    setAviso({ id: Date.now(), texto: rellenar(t.aviso.tachadura, { xp: penalizacionXp, n: fila.numero }), tono: 'penalizacion' })
    setDialogo(null)
    setRevision(null)
  }

  const cerrarAviso = useCallback(() => setAviso(null), [])

  return (
    <section className="card overflow-hidden" aria-label={t.titulo}>
      <header className="flex flex-wrap items-center gap-3 border-b border-tierra-200 bg-tierra-100/60 px-4 py-3">
        <NotebookPen size={22} className="text-bosque-700" aria-hidden />
        <div className="mr-auto">
          <h2 className="text-xl font-bold text-tierra-900">
            {t.titulo} · {titulo}
          </h2>
          <p className="text-sm text-tierra-600">
            <span className="font-semibold text-tierra-800">{t.modo[modo]}.</span> {t.modoAyuda[modo]}
          </p>
        </div>
        <button type="button" className="btn-neutro" onClick={() => setRevision(revisarParaEntrega(registro, modo))}>
          <ClipboardCheck size={16} aria-hidden /> {t.revisar}
        </button>
        <button
          type="button"
          className="btn-neutro"
          disabled={registro.filas.length === 0}
          onClick={() =>
            void import('./exportarPdf').then((m) =>
              m.exportarLibretaPdf({ registro, modo, titulo, estudiante, archivo: `libreta-${misionId}-${estudiante.replace(/\s+/g, '-')}.pdf` }),
            )
          }
        >
          <FileDown size={16} aria-hidden /> {t.exportar}
        </button>
      </header>

      <div className="space-y-5 p-4">
        <TablaLibreta filas={vistaLibreta(registro, modo)} pr={pr} onIntentarEditar={(fila, celda) => setDialogo({ fila, celda })} />

        <div ref={refFormulario}>
          <FormularioFila
            ref={refLectura}
            borrador={borrador}
            modo={modo}
            errores={errores}
            esperado={esperado}
            numeroCorregido={numeroCorregido}
            onCambio={cambiarBorrador}
            onRegistrar={registrarBorrador}
            onCancelarCorreccion={() => guardarBorrador(clave, null)}
          />
        </div>

        <ResumenLibreta registro={registro} modo={modo} penalizacionXp={penalizacionXp} />

        {revision && <PanelRevision revision={revision} />}
      </div>

      {dialogo && (
        <DialogoBloqueo
          fila={dialogo.fila}
          celda={dialogo.celda}
          penalizacionXp={penalizacionXp}
          onCorregir={() => corregirFila(dialogo.fila)}
          onTachar={(valor) => tacharCelda(dialogo.fila, dialogo.celda, valor)}
          onCerrar={() => setDialogo(null)}
        />
      )}
      <Aviso mensaje={aviso} onCerrar={cerrarAviso} />
    </section>
  )
}

function PanelRevision({ revision: r }: { revision: RevisionEntrega }) {
  const motivos = [
    ...(r.faltanDistancias.length ? [rellenar(t.revision.faltanDistancias, { filas: r.faltanDistancias.join(', ') })] : []),
    ...(r.faltanCalculos.length ? [rellenar(t.revision.faltanCalculos, { filas: r.faltanCalculos.join(', ') })] : []),
    ...r.problemas,
  ]
  const vacia = !r.entregable && motivos.length === 0
  return (
    <div role="status" className={`rounded-xl p-3 ${r.entregable ? 'bg-bosque-100 text-bosque-800' : 'bg-granate-100 text-granate-700'}`}>
      {r.entregable ? (
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 size={18} aria-hidden /> {t.revision.lista}
        </p>
      ) : (
        <>
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={18} aria-hidden /> {t.revision.noEntregable}
          </p>
          <ul className="ml-7 mt-1 list-disc text-sm">
            {vacia ? <li>{t.revision.vacia}</li> : motivos.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </>
      )}
      {r.calculosErroneos.length > 0 && (
        <p className="mt-2 text-sm font-semibold text-granate-700">
          {rellenar(t.revision.calculosErroneos, { filas: r.calculosErroneos.join(', ') })}
        </p>
      )}
    </div>
  )
}
