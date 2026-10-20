import { useMemo, useState } from 'react'
import { AlertTriangle, Lock, RotateCcw, Save, SlidersHorizontal } from 'lucide-react'
import { CAMPOS_EDITABLES, GRUPOS, leerFormulario, textoDe, valorEn, type Ajustes, type CampoEditable, type ErrorCampo } from '@/datos/configuracion'
import type { Parametros } from '@/datos/parametros'
import { formatearNumero } from '@/motor/numeros'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'

// Configuración del juego desde el panel docente (RF-08): los parámetros de la §11 sobre los del
// archivo. Se edita un borrador y se guarda de una vez; con errores no se guarda.

const t = textos.configuracion
type TextoCampo = { etiqueta: string; ayuda?: string; unidad?: string; prefijo?: string }
const TEXTO_CAMPO = t.campos as Record<string, TextoCampo>
const OPCIONES: Record<string, Record<string, string>> = { 'acto2.piel': textos.pieles }
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const nombreOpcion = (ruta: string, valor: string) => OPCIONES[ruta]?.[valor] ?? mayuscula((textos.modos as Record<string, string>)[valor] ?? valor)

interface Props {
  base: Parametros
  ajustes: Ajustes
  ajustesInvalidos: boolean
  /** Resultado de la última acción (guardar o restablecer); lo lleva el panel porque el formulario se rearma. */
  aviso: string | null
  onEditar: () => void
  onGuardar: (ajustes: Ajustes) => void
  onRestablecer: () => void
}

const iguales = (a: Ajustes, b: Ajustes) => {
  const ka = Object.keys(a)
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k])
}

export function Configuracion({ base, ajustes, ajustesInvalidos, aviso, onEditar, onGuardar, onRestablecer }: Props) {
  const inicial = () => Object.fromEntries(CAMPOS_EDITABLES.map((c) => [c.ruta, textoDe(ajustes[c.ruta] ?? valorEn(base, c.ruta))]))
  const [borrador, setBorrador] = useState<Record<string, string>>(inicial)
  const [confirmando, setConfirmando] = useState(false)
  const { ajustes: leidos, errores } = useMemo(() => leerFormulario(base, borrador), [base, borrador])
  const nErrores = Object.keys(errores).length
  const cambios = !iguales(leidos, ajustes)

  const cambiar = (ruta: string, valor: string) => {
    setBorrador((b) => ({ ...b, [ruta]: valor }))
    onEditar()
  }

  return (
    <section aria-labelledby="titulo-configuracion">
      <div className="flex flex-wrap items-start gap-3">
        <SlidersHorizontal size={22} className="mt-1 text-poncho-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="titulo-configuracion" className="text-xl font-bold text-tierra-900">
            {t.titulo}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-tierra-600">{t.bajada}</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-tierra-600">
            {t.notas.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      </div>

      {ajustesInvalidos && (
        <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-granate-100 p-3 text-sm text-granate-700">
          <AlertTriangle size={16} aria-hidden /> {t.invalidos}
        </p>
      )}

      <form
        className="mt-4 space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (nErrores || !cambios) return
          onGuardar(leidos)
        }}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {GRUPOS.map((g) => (
            <fieldset key={g} className="card p-4">
              <legend className="sr-only">{t.grupos[g]}</legend>
              <p aria-hidden className="font-display text-lg font-bold text-tierra-900">
                {t.grupos[g]}
              </p>
              <div className="mt-2 divide-y divide-tierra-100">
                {CAMPOS_EDITABLES.filter((c) => c.grupo === g).map((c) => (
                  <Campo
                    key={c.ruta}
                    campo={c}
                    texto={borrador[c.ruta]}
                    porDefecto={valorEn(base, c.ruta)}
                    ajustado={c.ruta in leidos}
                    error={errores[c.ruta]}
                    onCambiar={(v) => cambiar(c.ruta, v)}
                  />
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <Fijos base={base} />

        {/* Fija abajo desde tablet; en celular ocuparía media pantalla y va al final del formulario. */}
        <div className="card z-10 flex flex-wrap items-center gap-3 p-3 shadow-pop sm:sticky sm:bottom-3">
          <p role="status" className="min-w-[12rem] flex-1 text-sm font-semibold text-tierra-800">
            {nErrores
              ? rellenar(t.conErrores, { n: nErrores })
              : cambios
                ? t.porGuardar
                : (aviso ?? (Object.keys(ajustes).length ? rellenar(t.ajustesActivos, { n: Object.keys(ajustes).length }) : t.sinCambios))}
          </p>
          {confirmando ? (
            <div role="group" aria-label={t.confirmarRestablecer} className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-tierra-900">{t.confirmarRestablecer}</span>
              <button
                type="button"
                className="btn bg-granate-600 text-white hover:bg-granate-700"
                onClick={() => {
                  onRestablecer()
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
            <>
              <button type="button" className="btn-neutro" onClick={() => setConfirmando(true)} disabled={!Object.keys(ajustes).length && !cambios}>
                <RotateCcw size={15} aria-hidden /> {t.restablecerTodo}
              </button>
              <button
                type="button"
                className="btn-neutro"
                disabled={!cambios && !nErrores}
                onClick={() => {
                  setBorrador(inicial())
                  onEditar()
                }}
              >
                {t.descartar}
              </button>
              <button type="submit" className="btn-primario" disabled={!cambios || nErrores > 0}>
                <Save size={15} aria-hidden /> {t.guardar}
              </button>
            </>
          )}
        </div>
      </form>
    </section>
  )
}

function Campo({
  campo: c,
  texto,
  porDefecto,
  ajustado,
  error,
  onCambiar,
}: {
  campo: CampoEditable
  texto: string
  porDefecto: number | string
  ajustado: boolean
  error: ErrorCampo | undefined
  onCambiar: (valor: string) => void
}) {
  const tc = TEXTO_CAMPO[c.ruta]
  const id = `campo-${c.ruta.replace(/\./g, '-')}`
  const textoDefecto =
    typeof porDefecto === 'number' ? `${tc.prefijo ?? ''}${formatearNumero(porDefecto, Number.isInteger(porDefecto) ? 0 : 1)}${tc.unidad ? ` ${tc.unidad}` : ''}` : nombreOpcion(c.ruta, porDefecto)
  const mensajeError =
    error && (error === 'rango' && c.tipo === 'numero' ? rellenar(t.errores.rango, { min: formatearNumero(c.min, Number.isInteger(c.min) ? 0 : 1), max: formatearNumero(c.max, 0) }) : t.errores[error])
  const descripcion = [tc.ayuda, rellenar(t.porDefecto, { valor: textoDefecto })].filter(Boolean).join(' ')
  const claseControl = `rounded-lg border bg-white px-2.5 py-1.5 text-sm text-tierra-900 focus:outline-none focus:ring-2 ${
    error ? 'border-granate-500 focus:ring-granate-200' : 'border-tierra-300 focus:border-bosque-500 focus:ring-bosque-200'
  }`

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
      <div className="min-w-[11rem] flex-1">
        <label htmlFor={id} className="text-sm font-semibold text-tierra-900">
          {tc.etiqueta}
        </label>
        {ajustado && <span className="chip ml-2 bg-buey-100 px-2 py-0.5 text-buey-800">{t.ajustado}</span>}
        <p id={`${id}-ayuda`} className="text-xs text-tierra-600">
          {descripcion}
        </p>
        {mensajeError && (
          <p id={`${id}-error`} className="text-xs font-semibold text-granate-700">
            {mensajeError}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {c.tipo === 'opcion' ? (
          <select id={id} value={texto} onChange={(e) => onCambiar(e.target.value)} aria-describedby={`${id}-ayuda`} className={claseControl}>
            {c.opciones.map((o) => (
              <option key={o} value={o}>
                {nombreOpcion(c.ruta, o)}
              </option>
            ))}
          </select>
        ) : (
          <>
            {tc.prefijo && <span className="font-mono text-sm text-tierra-700">{tc.prefijo}</span>}
            <input
              id={id}
              inputMode={c.entero ? 'numeric' : 'decimal'}
              value={texto}
              onChange={(e) => onCambiar(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={`${id}-ayuda${mensajeError ? ` ${id}-error` : ''}`}
              className={`w-24 text-right font-mono ${claseControl}`}
            />
            {tc.unidad && <span className="w-[4.5rem] text-xs text-tierra-600">{tc.unidad}</span>}
          </>
        )}
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-lg text-tierra-600 hover:bg-tierra-100 disabled:invisible"
          disabled={!ajustado && !error}
          onClick={() => onCambiar(textoDe(porDefecto))}
          aria-label={rellenar(t.restablecerCampo, { campo: tc.etiqueta })}
          title={rellenar(t.restablecerCampo, { campo: tc.etiqueta })}
        >
          <RotateCcw size={15} aria-hidden />
        </button>
      </div>
    </div>
  )
}

function Fijos({ base: p }: { base: Parametros }) {
  const valores = {
    min: formatearNumero(p.lectura.minimaM),
    max: formatearNumero(p.lectura.maximaM),
    largo: formatearNumero(p.lectura.largoMiraM, 0),
    desnivel: formatearNumero(p.lectura.maximaM - p.lectura.minimaM, 1),
    cada: p.perfil.estacionamientoM,
    tol: p.comparacion.toleranciaMm,
    comp: p.comparacion.compensacionMm,
    grosero: p.errorGroseroMm,
  }
  return (
    <div className="card p-4">
      <p className="flex items-center gap-2 font-display text-lg font-bold text-tierra-900">
        <Lock size={17} className="text-tierra-600" aria-hidden /> {t.fijosTitulo}
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-tierra-700">
        {t.fijos.map((f) => (
          <li key={f}>{rellenar(f, valores)}</li>
        ))}
      </ul>
    </div>
  )
}
