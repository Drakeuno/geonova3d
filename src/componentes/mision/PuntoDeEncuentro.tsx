import { AlertTriangle, BookOpen, Bot, CheckCircle2, Handshake, MonitorSmartphone, Users } from 'lucide-react'
import { CAUSAS, type Tramo } from '@/motor/cooperativa'
import type { Escenario, LecturaPlanificada } from '@/motor/escenarios'
import type { RegistroLibreta } from '@/motor/libreta'
import { formatearMm } from '@/motor/numeros'
import { bitacora, cierreDeTramo, otroTramo, type NotaBitacora } from '@/misiones/m23'
import { mmConSigno, textoTolerancia } from '@/misiones/comunes'
import type { EstadoSesion } from '@/estado/sesionCooperativa'
import { TablaLibreta } from '@/componentes/libreta/TablaLibreta'
import { vistaLibreta } from '@/componentes/libreta/vistaLibreta'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { Campo, Opciones, Subtitulo, TarjetaEtapa, TextoLargo, type PropsFormulario } from './Formulario'

const t = textos.cooperativa

const nombrePunto = (e: Escenario, id: string) => e.puntos.find((p) => p.id === id)?.nombre ?? id

/** Antes de partir: con una cuadrilla simulada o con otra ventana de este mismo equipo. */
export function ElegirModo({ onSimulada, onVentanas }: { onSimulada: () => void; onVentanas: () => void }) {
  return (
    <section className="card mt-6 space-y-4 p-5" aria-labelledby="titulo-modo">
      <h2 id="titulo-modo" className="text-xl font-bold text-tierra-900">
        {t.modoTitulo}
      </h2>
      <p className="text-tierra-700">{t.modoBajada}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <button type="button" onClick={onSimulada} className="card flex items-start gap-3 p-4 text-left transition hover:border-bosque-300 hover:shadow-pop">
          <Bot size={28} className="shrink-0 text-bosque-700" aria-hidden />
          <span>
            <span className="block font-display text-lg font-bold text-tierra-900">{t.simulada}</span>
            <span className="block text-sm text-tierra-600">{t.simuladaBajada}</span>
          </span>
        </button>
        <button type="button" onClick={onVentanas} className="card flex items-start gap-3 p-4 text-left transition hover:border-bosque-300 hover:shadow-pop">
          <MonitorSmartphone size={28} className="shrink-0 text-poncho-700" aria-hidden />
          <span>
            <span className="block font-display text-lg font-bold text-tierra-900">{t.ventanas}</span>
            <span className="block text-sm text-tierra-600">{t.ventanasBajada}</span>
          </span>
        </button>
      </div>
    </section>
  )
}

/** Con dos ventanas: cada una elige su cuadrilla. */
export function ElegirCuadrilla({ codigo, onElegir, onSimulada }: { codigo: string; onElegir: (t: Tramo) => void; onSimulada: () => void }) {
  return (
    <section className="card mt-6 space-y-4 p-5" aria-labelledby="titulo-cuadrilla">
      <h2 id="titulo-cuadrilla" className="text-xl font-bold text-tierra-900">
        {rellenar(t.sesion, { codigo })}
      </h2>
      <p className="text-tierra-700">{t.elegirCuadrilla}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primario" onClick={() => onElegir('A')}>
          <Users size={16} aria-hidden /> {t.cuadrillaA}
        </button>
        <button type="button" className="btn-primario" onClick={() => onElegir('B')}>
          <Users size={16} aria-hidden /> {t.cuadrillaB}
        </button>
        <button type="button" className="btn-neutro" onClick={onSimulada}>
          <Bot size={16} aria-hidden /> {t.cambiarASimulada}
        </button>
      </div>
    </section>
  )
}

interface Props extends PropsFormulario {
  estado: EstadoSesion
  escenario: Escenario
  tramo: Tramo
  registroPropio: RegistroLibreta
  lecturasPropias: LecturaPlanificada[]
  modo: 'simulada' | 'ventanas'
  codigo: string | null
  toleranciaMm: number
  coeficienteMm: number
}

export function PuntoDeEncuentro({ estado: s, escenario, tramo, registroPropio, lecturasPropias, modo, codigo, toleranciaMm, coeficienteMm, ...p }: Props) {
  const otro = otroTramo(tramo)
  const c = s.companero
  const estadoOtra = !c.conectada
    ? t.estado.esperandoVentana
    : c.registro && cierreDeTramo(c.registro, c.lecturas, coeficienteMm)
      ? t.estado.cerro
      : c.enM
        ? t.estado.enM
        : t.estado.enCamino
  const diferencia = s.cotaMPropia !== null && s.cotaMCompanero !== null ? s.cotaMPropia - s.cotaMCompanero : null
  const discrepa = diferencia !== null && Math.abs(diferencia) > toleranciaMm
  const cotas: Record<Tramo, number | null> = tramo === 'A' ? { A: s.cotaMPropia, B: s.cotaMCompanero } : { A: s.cotaMCompanero, B: s.cotaMPropia }

  return (
    <TarjetaEtapa icono={<Handshake size={22} aria-hidden />} titulo={t.titulo} bajada={t.bajada}>
      <div className="grid gap-3 sm:grid-cols-2">
        <EstadoCuadrilla
          titulo={rellenar(t.tuCuadrilla, { tramo })}
          detalle={rellenar(t.parteDe, { punto: nombrePunto(escenario, tramo === 'A' ? 'C' : 'R') })}
          estado={s.cotaMPropia === null ? t.estado.nivelando : t.estado.llegasteAM}
        />
        <EstadoCuadrilla
          titulo={rellenar(c.simulado ? t.otraSimulada : t.otraVentana, { tramo: otro })}
          detalle={rellenar(t.parteDe, { punto: nombrePunto(escenario, otro === 'A' ? 'C' : 'R') })}
          estado={estadoOtra}
          alerta={!c.conectada}
        />
      </div>
      {modo === 'ventanas' && codigo && <p className="text-sm text-tierra-600">{rellenar(t.codigoSesion, { codigo })}</p>}

      <div>
        <Subtitulo>{t.confrontacion}</Subtitulo>
        {!s.confrontada ? (
          <p className="mt-1 text-sm text-tierra-600">{t.sinConfrontar}</p>
        ) : (
          <div className="mt-2 space-y-2">
            <dl className="grid gap-2 sm:grid-cols-3">
              {(['A', 'B'] as const).map((tr) => (
                <div key={tr} className="rounded-xl bg-tierra-100 px-3 py-2">
                  <dt className="text-xs font-semibold text-tierra-700">{rellenar(t.cotaMDe, { tramo: tr })}</dt>
                  <dd className="font-mono text-lg font-semibold tabular-nums">{cotas[tr] === null ? '·' : formatearMm(cotas[tr]!)}</dd>
                </div>
              ))}
              <div className={`rounded-xl px-3 py-2 ${discrepa ? 'bg-granate-100 text-granate-700' : 'bg-bosque-100 text-bosque-800'}`}>
                <dt className="text-xs font-semibold opacity-80">{rellenar(t.diferencia, { t: textoTolerancia(toleranciaMm) })}</dt>
                <dd className="font-mono text-lg font-semibold tabular-nums">{mmConSigno(diferencia!)} mm</dd>
              </div>
            </dl>
            <p role="status" className={`flex items-center gap-1.5 text-sm font-semibold ${discrepa ? 'text-granate-700' : 'text-bosque-700'}`}>
              {discrepa ? <AlertTriangle size={16} aria-hidden /> : <CheckCircle2 size={16} aria-hidden />}
              {discrepa ? t.discrepan : t.coinciden}
            </p>
          </div>
        )}
      </div>

      {s.confrontada && <Diagnostico s={s} tramo={tramo} registroPropio={registroPropio} lecturasPropias={lecturasPropias} coeficienteMm={coeficienteMm} {...p} />}
    </TarjetaEtapa>
  )
}

function EstadoCuadrilla({ titulo, detalle, estado, alerta = false }: { titulo: string; detalle: string; estado: string; alerta?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${alerta ? 'border-buey-300 bg-buey-50' : 'border-tierra-200 bg-white'}`}>
      <p className="font-display font-bold text-tierra-900">{titulo}</p>
      <p className="text-xs text-tierra-600">{detalle}</p>
      <p className="mt-1 text-sm font-semibold text-tierra-800" role="status">
        {estado}
      </p>
    </div>
  )
}

function Diagnostico({
  s,
  tramo,
  registroPropio,
  lecturasPropias,
  coeficienteMm,
  ...p
}: { s: EstadoSesion; tramo: Tramo; registroPropio: RegistroLibreta; lecturasPropias: LecturaPlanificada[]; coeficienteMm: number } & PropsFormulario) {
  const otro = otroTramo(tramo)
  // Los dos tramos usan las mismas posturas (S1–S4): la bitácora de cada uno se arma igual.
  const notas = (tr: Tramo) => bitacora(lecturasPropias, tr, s.sesion.evento, s.sesion.estacionDelEvento)
  return (
    <div className="space-y-5 border-t border-tierra-200 pt-4">
      <p className="flex items-start gap-2 rounded-xl bg-buey-50 p-3 text-sm text-buey-900">
        <BookOpen size={18} className="mt-0.5 shrink-0" aria-hidden /> {t.diagnosticoIntro}
      </p>

      <div>
        <Subtitulo>{t.bitacoras}</Subtitulo>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {(['A', 'B'] as const).map((tr) => (
            <Bitacora key={tr} tramo={tr} notas={notas(tr)} />
          ))}
        </div>
      </div>

      <div>
        <Subtitulo>{t.cierres}</Subtitulo>
        <div className="mt-1 space-y-1">
          <Cierre registro={registroPropio} lecturas={lecturasPropias} tramo={tramo} coeficienteMm={coeficienteMm} />
          {s.companero.registro && <Cierre registro={s.companero.registro} lecturas={s.companero.lecturas} tramo={otro} coeficienteMm={coeficienteMm} />}
        </div>
      </div>

      <div>
        <Subtitulo>{rellenar(t.libretaDe, { tramo: otro })}</Subtitulo>
        {s.companero.registro ? (
          <div className="mt-2">
            <TablaLibreta filas={vistaLibreta(s.companero.registro, 'asistido')} pr={s.companero.registro.pr} onIntentarEditar={() => {}} soloLectura />
          </div>
        ) : (
          <p className="mt-1 text-sm text-tierra-600">{t.sinLibretaOtra}</p>
        )}
      </div>

      <div>
        <Subtitulo>{t.resolucion}</Subtitulo>
        <div className="mt-2 grid gap-3 lg:grid-cols-2">
          <Opciones
            {...p}
            clave="tramo"
            etiqueta={t.campos.tramo}
            opciones={[
              ['A', rellenar(t.tramoN, { tramo: 'A' })],
              ['B', rellenar(t.tramoN, { tramo: 'B' })],
            ]}
          />
          <Opciones
            {...p}
            clave="estacion"
            etiqueta={t.campos.estacion}
            opciones={[
              ['S1', t.posturaS1],
              ['S2', t.posturaS2],
            ]}
          />
        </div>
        <div className="mt-3">
          <Opciones {...p} clave="causa" etiqueta={t.campos.causa} opciones={CAUSAS.map((c) => [c, t.causas[c]] as const)} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Campo {...p} clave="cotaComun" etiqueta={t.campos.cotaComun} ayuda={t.cotaComunAyuda} />
        </div>
        <div className="mt-3">
          <TextoLargo {...p} clave="procedimiento" etiqueta={t.campos.procedimiento} minimo={40} placeholder={t.ejemploProcedimiento} />
        </div>
        {!s.companero.simulado && (
          <p className="mt-2 text-sm text-tierra-700" role="status">
            {s.companero.resolucion?.documentada
              ? rellenar(t.otraResolvio, { tramo: otro, cota: formatearMm(s.companero.resolucion.cotaComunMm) })
              : rellenar(t.otraSinResolver, { tramo: otro })}
          </p>
        )}
      </div>
    </div>
  )
}

function Cierre({ registro, lecturas, tramo, coeficienteMm }: { registro: RegistroLibreta; lecturas: LecturaPlanificada[]; tramo: Tramo; coeficienteMm: number }) {
  const cierre = cierreDeTramo(registro, lecturas, coeficienteMm)
  if (!cierre) return <p className="text-sm text-tierra-600">{rellenar(t.sinCierre, { tramo })}</p>
  return (
    <p className={`text-sm font-semibold ${cierre.aprobado ? 'text-bosque-700' : 'text-granate-700'}`}>
      {rellenar(cierre.aprobado ? t.cierra : t.noCierra, { tramo, e: mmConSigno(cierre.errorMm), t: textoTolerancia(cierre.toleranciaMm) })}
    </p>
  )
}

function Bitacora({ tramo, notas }: { tramo: Tramo; notas: NotaBitacora[] }) {
  return (
    <div className="rounded-xl border border-tierra-200 bg-tierra-50 p-3">
      <p className="font-display font-bold text-tierra-900">{rellenar(t.bitacoraDe, { tramo })}</p>
      <ul className="mt-1 space-y-1 text-sm">
        {notas.map((n, i) => (
          <li key={n.estacion}>
            <span className="font-mono font-semibold">{n.estacion}</span> ·{' '}
            {n.tipo === 'rutina' ? t.rutina[i % t.rutina.length] : <span className="font-semibold text-buey-800">{t.eventos[n.tipo]}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
