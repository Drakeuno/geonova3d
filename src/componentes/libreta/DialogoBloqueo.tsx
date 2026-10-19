import { useEffect, useId, useRef, useState } from 'react'
import { BookLock } from 'lucide-react'
import type { FilaLibreta } from '@/motor/libreta'
import { aMetros, parsearMetrosAMm } from '@/motor/numeros'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import type { Celda } from './vistaLibreta'

const t = textos.libreta.bloqueo

interface Props {
  fila: FilaLibreta
  celda: Celda
  penalizacionXp: number
  onCorregir: () => void
  onTachar: (valor: number | null) => void
  onCerrar: () => void
}

/**
 * Aviso al intentar cambiar una celda registrada (CP-03): la edición está bloqueada. Se ofrece la
 * corrección en línea nueva (sin costo) o tachar igual, con penalización.
 */
export function DialogoBloqueo({ fila, celda, penalizacionXp, onCorregir, onTachar, onCerrar }: Props) {
  const [paso, setPaso] = useState<'aviso' | 'tachar'>('aviso')
  const [valor, setValor] = useState('')
  const [error, setError] = useState<string | null>(null)
  const idTitulo = useId()
  const primero = useRef<HTMLButtonElement>(null)
  const entrada = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (paso === 'aviso') primero.current?.focus()
    else entrada.current?.focus()
  }, [paso])

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onCerrar])

  const anulada = fila.anuladaPor !== null

  const confirmarTachadura = () => {
    const mm = valor.trim() ? parsearMetrosAMm(valor) : null
    if (valor.trim() && mm === null) return setError(textos.libreta.errores.numero)
    if (mm === null && celda.campo === 'lecturaMm') return setError(textos.libreta.errores.lecturaFalta)
    onTachar(mm === null ? null : celda.campo === 'distanciaM' ? aMetros(mm) : mm)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-tierra-900/50 p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="card w-full max-w-md animate-pop-in p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-buey-100 text-buey-700">
            <BookLock size={20} aria-hidden />
          </span>
          <div>
            <h2 id={idTitulo} className="text-lg font-bold text-tierra-900">
              {anulada ? t.anuladaTitulo : t.titulo}
            </h2>
            <p className="mt-1 text-tierra-700">
              {anulada ? rellenar(t.anuladaTexto, { n: fila.anuladaPor!.slice(1) }) : t.texto}
            </p>
          </div>
        </div>

        {anulada ? (
          <div className="mt-5 flex justify-end">
            <button ref={primero} type="button" onClick={onCerrar} className="btn-neutro">
              {t.volver}
            </button>
          </div>
        ) : paso === 'aviso' ? (
          <>
            <p className="mt-3 text-sm font-semibold text-granate-700">{rellenar(t.penalizacion, { xp: penalizacionXp })}</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={onCerrar} className="btn-neutro">
                {t.volver}
              </button>
              <button type="button" onClick={() => setPaso('tachar')} className="btn border border-granate-300 bg-white text-granate-700 hover:bg-granate-50">
                {t.tachar}
              </button>
              <button ref={primero} type="button" onClick={onCorregir} className="btn-primario">
                {t.corregir}
              </button>
            </div>
          </>
        ) : (
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault()
              confirmarTachadura()
            }}
          >
            <label className="block text-sm font-semibold text-tierra-800">
              {t.nuevoValor}
              <input
                ref={entrada}
                inputMode="decimal"
                value={valor}
                onChange={(e) => {
                  setValor(e.target.value)
                  setError(null)
                }}
                aria-invalid={Boolean(error)}
                className="mt-1 w-full rounded-lg border border-tierra-300 px-2.5 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-granate-500"
              />
            </label>
            {error && (
              <p role="alert" className="mt-1 text-sm text-granate-700">
                {error}
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setPaso('aviso')} className="btn-neutro">
                {t.volver}
              </button>
              <button type="submit" className="btn bg-granate-600 text-white hover:bg-granate-700 focus-visible:ring-granate-500">
                {rellenar(t.confirmarTachar, { xp: penalizacionXp })}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
