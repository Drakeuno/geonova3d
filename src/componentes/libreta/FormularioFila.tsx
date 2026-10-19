import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { Check, PenLine, X } from 'lucide-react'
import type { ModoCalculo } from '@/motor/libreta'
import { formatearMm, parsearMetrosAMm, type Mm } from '@/motor/numeros'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import type { Borrador, CampoBorrador } from './borrador'

const t = textos.libreta

interface Props {
  borrador: Borrador
  modo: ModoCalculo
  errores: Partial<Record<CampoBorrador, string>>
  /** Lo que corresponde según las filas ya registradas (asistencia y vista previa). */
  esperado: { desnivelMm: Mm | null; cotaAnteriorMm: Mm | null }
  numeroCorregido: number | null
  onCambio: (b: Borrador) => void
  onRegistrar: () => void
  onCancelarCorreccion: () => void
}

type Estado = 'ok' | 'error' | null

interface PropsCampo extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string
  error?: string
  ayuda?: string
  estado?: Estado
}

const Campo = forwardRef<HTMLInputElement, PropsCampo>(function Campo({ etiqueta, error, ayuda, estado, className = '', ...input }, ref) {
  const id = useId()
  const idAyuda = `${id}-ayuda`
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-semibold text-tierra-700">
        {etiqueta}
      </label>
      <div className="relative mt-1">
        <input
          ref={ref}
          id={id}
          autoComplete="off"
          aria-invalid={Boolean(error) || estado === 'error'}
          aria-describedby={error || ayuda || estado ? idAyuda : undefined}
          className={`w-full rounded-lg border bg-white px-2.5 py-2 font-mono text-sm text-tierra-900 focus:outline-none focus:ring-2 focus:ring-bosque-500 ${
            error || estado === 'error' ? 'border-granate-500' : estado === 'ok' ? 'border-bosque-500' : 'border-tierra-300'
          }`}
          {...input}
        />
        {estado === 'ok' && <Check size={16} className="absolute right-2 top-2.5 text-bosque-600" aria-hidden />}
        {estado === 'error' && <X size={16} className="absolute right-2 top-2.5 text-granate-600" aria-hidden />}
      </div>
      <p id={idAyuda} className={`mt-1 min-h-[1rem] text-xs ${error || estado === 'error' ? 'text-granate-700' : 'text-tierra-600'}`}>
        {error ?? (estado === 'ok' ? t.correcto : estado === 'error' ? t.revisa : ayuda)}
      </p>
    </div>
  )
})

export const FormularioFila = forwardRef<HTMLInputElement, Props>(function FormularioFila(
  { borrador: b, modo, errores, esperado, numeroCorregido, onCambio, onRegistrar, onCancelarCorreccion },
  refLectura,
) {
  const cambiar = (campo: keyof Borrador) => (e: { target: { value: string } }) => onCambio({ ...b, [campo]: e.target.value })
  const esLa = b.tipo === 'LA'

  // Modo asistido: cada valor se revisa contra las lecturas del propio jugador apenas se escribe.
  const desnivelEscrito = b.desnivel.trim() ? parsearMetrosAMm(b.desnivel) : null
  const cotaEscrita = b.cota.trim() ? parsearMetrosAMm(b.cota) : null
  const estadoDesnivel: Estado =
    modo === 'asistido' && desnivelEscrito !== null && esperado.desnivelMm !== null ? (desnivelEscrito === esperado.desnivelMm ? 'ok' : 'error') : null
  const estadoCota: Estado =
    modo === 'asistido' && cotaEscrita !== null && desnivelEscrito !== null && esperado.cotaAnteriorMm !== null
      ? cotaEscrita === esperado.cotaAnteriorMm + desnivelEscrito
        ? 'ok'
        : 'error'
      : null

  const previa =
    modo === 'automatico' && esLa && esperado.desnivelMm !== null && esperado.cotaAnteriorMm !== null
      ? `${t.previa}: Δh = ${formatearMm(esperado.desnivelMm, { signo: true })} · ${t.cota.replace(' (m)', '')} = ${formatearMm(esperado.cotaAnteriorMm + esperado.desnivelMm)}`
      : null

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onRegistrar()
      }}
      className={`rounded-2xl border-2 border-dashed p-4 ${numeroCorregido ? 'border-buey-400 bg-buey-50' : 'border-tierra-300 bg-tierra-50'}`}
      aria-label={numeroCorregido ? rellenar(t.correccionDe, { n: numeroCorregido }) : t.nueva}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <PenLine size={18} className="text-tierra-700" aria-hidden />
        <h3 className="font-display font-bold text-tierra-900">
          {numeroCorregido ? rellenar(t.correccionDe, { n: numeroCorregido }) : t.nueva}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-x-3 sm:grid-cols-4 lg:grid-cols-8">
        <Campo etiqueta={t.columnas.estacion} value={b.estacion} onChange={cambiar('estacion')} error={errores.estacion} />
        <Campo etiqueta={t.columnas.punto} value={b.punto} onChange={cambiar('punto')} error={errores.punto} />
        <fieldset className="col-span-2">
          <legend className="text-xs font-semibold text-tierra-700">{t.tipo}</legend>
          <div className="mt-1 grid grid-cols-2 gap-1 rounded-lg border border-tierra-300 bg-white p-1">
            {(['LT', 'LA'] as const).map((tipo) => (
              <label
                key={tipo}
                className={`cursor-pointer rounded-md px-2 py-1.5 text-center text-sm font-semibold ${
                  b.tipo === tipo ? 'bg-poncho-700 text-white' : 'text-tierra-700 hover:bg-tierra-100'
                }`}
              >
                <input
                  type="radio"
                  name="tipo-visada"
                  value={tipo}
                  checked={b.tipo === tipo}
                  onChange={() => onCambio({ ...b, tipo })}
                  className="sr-only"
                />
                {tipo === 'LT' ? t.tipoLt : t.tipoLa}
              </label>
            ))}
          </div>
        </fieldset>
        <Campo
          ref={refLectura}
          etiqueta={t.lectura}
          inputMode="decimal"
          placeholder="1,523"
          value={b.lectura}
          onChange={cambiar('lectura')}
          error={errores.lectura}
          className="col-span-2"
        />
        {esLa && (
          <Campo
            etiqueta={t.distancia}
            inputMode="decimal"
            placeholder="45,00"
            value={b.distancia}
            onChange={cambiar('distancia')}
            error={errores.distancia}
            ayuda={t.ayudaDistancia}
            className="col-span-2"
          />
        )}
        {esLa && modo !== 'automatico' && (
          <>
            <Campo
              etiqueta={t.desnivel}
              inputMode="decimal"
              placeholder="+0,850"
              value={b.desnivel}
              onChange={cambiar('desnivel')}
              error={errores.desnivel}
              estado={estadoDesnivel}
              className="col-span-2"
            />
            <Campo
              etiqueta={t.cota}
              inputMode="decimal"
              placeholder="100,850"
              value={b.cota}
              onChange={cambiar('cota')}
              error={errores.cota}
              estado={estadoCota}
              className="col-span-2"
            />
          </>
        )}
        <div className="col-span-2 sm:col-span-4 lg:col-span-8">
          <label className="block text-xs font-semibold text-tierra-700">
            {t.observaciones}
            <input
              value={b.observaciones}
              onChange={cambiar('observaciones')}
              className="mt-1 w-full rounded-lg border border-tierra-300 bg-white px-2.5 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-bosque-500"
            />
          </label>
        </div>
      </div>

      {previa && <p className="mt-3 font-mono text-sm text-tierra-700">{previa}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" className="btn-primario">
          {t.registrar}
        </button>
        {numeroCorregido && (
          <button type="button" onClick={onCancelarCorreccion} className="btn-neutro">
            {t.cancelarCorreccion}
          </button>
        )}
      </div>
    </form>
  )
})
