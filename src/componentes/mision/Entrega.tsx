import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, Hourglass, Lightbulb, RotateCcw, Send, XCircle } from 'lucide-react'
import type { MisionCatalogo } from '@/datos/misiones'
import type { DialogoMision } from '@/datos/dialogos'
import type { EvaluacionGuardada } from '@/estado/viaje'
import type { MovimientoXp } from '@/motor/puntaje'
import { ChipMetal } from '@/componentes/ui/ChipMetal'
import { DialogoCochayuyero } from '@/componentes/dialogo/DialogoCochayuyero'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'

const t = textos.mision

interface Props {
  mision: MisionCatalogo
  dialogo: DialogoMision
  valores: Record<string, string | number>
  intento: number
  /** Última evaluación guardada de la misión (de este intento o de uno anterior). */
  evaluacion: EvaluacionGuardada | undefined
  /** Motivos por los que la última entrega se bloqueó (no cuentan como falla). */
  bloqueos: string[] | null
  pista: string | null
  /** A dónde sigue el viaje al aprobar (la misión siguiente o el tramo narrativo entre actos). */
  siguiente: { a: string; texto: string } | null
  onEntregar: () => void
  onNuevoIntento: () => void
  /** 3.2 y 3.3: la misión está en manos de la comisión; no se puede volver a entregar. */
  enComision?: boolean
  /** Texto del botón de entrega (3.2: pedir la defensa). */
  textoEntregar?: string
}

export function Entrega({
  mision,
  dialogo,
  valores,
  intento,
  evaluacion,
  bloqueos,
  pista,
  siguiente,
  onEntregar,
  onNuevoIntento,
  enComision = false,
  textoEntregar = t.entregar,
}: Props) {
  const [confirmando, setConfirmando] = useState(false)
  return (
    <section className="card overflow-hidden" aria-labelledby="titulo-entrega">
      <header className="flex flex-wrap items-center gap-3 border-b border-tierra-200 bg-tierra-100/60 px-4 py-3">
        <Send size={22} className="text-bosque-700" aria-hidden />
        <div className="mr-auto">
          <h2 id="titulo-entrega" className="text-xl font-bold text-tierra-900">
            {t.entregaTitulo}
          </h2>
          <p className="text-sm text-tierra-600">{t.entregaBajada}</p>
        </div>
        <button type="button" className="btn-acento" onClick={onEntregar} disabled={enComision}>
          <Send size={16} aria-hidden /> {textoEntregar}
        </button>
      </header>

      <div className="space-y-4 p-4" aria-live="polite">
        {bloqueos && (
          <div role="alert" className="rounded-xl bg-granate-100 p-3 text-granate-700">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={18} aria-hidden /> {t.bloqueada}
            </p>
            <ul className="ml-7 mt-1 list-disc text-sm">
              {bloqueos.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {evaluacion && !bloqueos && (
          <Resultado mision={mision} dialogo={dialogo} valores={valores} evaluacion={evaluacion} intentoActual={intento} pista={pista} siguiente={siguiente} />
        )}

        {!evaluacion && !bloqueos && <p className="text-sm text-tierra-600">{t.sinEntregas}</p>}

        <div className="border-t border-tierra-200 pt-3">
          {confirmando ? (
            <div role="group" aria-label={t.confirmarNuevo} className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-tierra-900">{t.confirmarNuevo}</p>
              <button
                type="button"
                className="btn bg-granate-600 text-white hover:bg-granate-700"
                onClick={() => {
                  onNuevoIntento()
                  setConfirmando(false)
                }}
              >
                {t.si}
              </button>
              <button type="button" className="btn-neutro" onClick={() => setConfirmando(false)}>
                {t.no}
              </button>
            </div>
          ) : (
            <button type="button" className="btn-neutro" onClick={() => setConfirmando(true)}>
              <RotateCcw size={16} aria-hidden /> {t.nuevoIntento}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function Resultado({
  mision,
  dialogo,
  valores,
  evaluacion: e,
  intentoActual,
  pista,
  siguiente,
}: Pick<Props, 'mision' | 'dialogo' | 'valores' | 'pista' | 'siguiente'> & { evaluacion: EvaluacionGuardada; intentoActual: number }) {
  const rechazo = e.motivo ? (dialogo.rechazo[e.motivo] ?? t.rechazoGeneral) : null
  // Aprobada la parte automática, la misión espera a la comisión: ni aprobada ni rechazada todavía.
  const aprobada = e.aprobada && !e.enComision
  return (
    <div className="space-y-4">
      <div className={`rounded-xl p-3 ${e.enComision ? 'bg-poncho-50 text-poncho-900' : aprobada ? 'bg-bosque-100 text-bosque-800' : 'bg-tierra-100 text-tierra-900'}`}>
        <p className="flex items-center gap-2 font-display text-lg font-bold">
          {e.enComision ? (
            <Hourglass size={20} aria-hidden />
          ) : aprobada ? (
            <CheckCircle2 size={20} aria-hidden />
          ) : (
            <XCircle size={20} className="text-granate-600" aria-hidden />
          )}
          {e.enComision ? t.enComision : aprobada ? t.aprobada : t.rechazada}
        </p>
        <p className="mt-0.5 text-xs">
          {rellenar(t.deIntento, { n: e.intento, hora: new Date(e.en).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) })}
          {e.intento !== intentoActual && ` · ${t.intentoAnterior}`}
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {e.criterios.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              {c.ok ? (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-bosque-700" aria-label={t.cumple} />
              ) : (
                <XCircle size={16} className="mt-0.5 shrink-0 text-granate-600" aria-label={t.noCumple} />
              )}
              <span>{c.texto}</span>
            </li>
          ))}
        </ul>
      </div>

      {e.enComision ? (
        <p className="text-sm text-tierra-700">{textos.entrega.comision.pendiente}</p>
      ) : aprobada ? (
        <DialogoCochayuyero lineas={dialogo.logro} tono="logro" valores={valores} etiqueta={t.etiquetaLogro} />
      ) : (
        <DialogoCochayuyero lineas={[rechazo!]} tono="rechazo" valores={valores} etiqueta={t.etiquetaRechazo} />
      )}
      {!e.aprobada && pista && (
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-buey-700">
            <Lightbulb size={16} aria-hidden /> {t.pistaTitulo}
          </p>
          <DialogoCochayuyero lineas={[pista]} tono="pista" valores={valores} etiqueta={t.etiquetaPista} />
        </div>
      )}

      {aprobada && <Recompensa mision={mision} movimientos={e.recompensa} />}

      {aprobada && (
        <div className="flex flex-wrap gap-2">
          {siguiente && (
            <Link to={siguiente.a} className="btn-primario">
              {siguiente.texto} <ArrowRight size={16} aria-hidden />
            </Link>
          )}
          <Link to="/viaje" className="btn-neutro">
            {t.volver}
          </Link>
        </div>
      )}
    </div>
  )
}

const NOMBRE_MOVIMIENTO: Record<MovimientoXp['tipo'], string> = t.movimientos

function Recompensa({ mision, movimientos }: { mision: MisionCatalogo; movimientos: MovimientoXp[] }) {
  if (movimientos.length === 0) return <p className="text-sm text-tierra-600">{t.sinNuevaRecompensa}</p>
  const total = movimientos.reduce((s, m) => s + m.xp, 0)
  return (
    <div className="animate-pop-in rounded-xl border border-buey-200 bg-buey-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-display font-bold text-buey-800">{t.recompensa}</p>
        <ChipMetal metal={mision.insignia.metal} nombre={mision.insignia.nombre} grupal={mision.insignia.grupal} />
      </div>
      <dl className="mt-2 space-y-0.5 text-sm">
        {movimientos.map((m, i) => (
          <div key={i} className="flex justify-between gap-4">
            <dt>
              {NOMBRE_MOVIMIENTO[m.tipo]}
              {m.ambito === 'cuadrilla' && <span className="ml-1 text-xs text-buey-700">{t.paraLaCuadrilla}</span>}
            </dt>
            <dd className="font-mono font-semibold">+{m.xp} XP</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t border-buey-200 pt-1 font-semibold">
          <dt>{t.total}</dt>
          <dd className="font-mono">+{total} XP</dd>
        </div>
      </dl>
    </div>
  )
}
