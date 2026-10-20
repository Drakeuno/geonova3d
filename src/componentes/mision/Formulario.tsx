import { useId, type ReactNode } from 'react'
import type { Formulario } from '@/misiones/tipos'

// Piezas de las etapas de formulario (decisión técnica, informe, diagnóstico). Lo escrito se guarda
// tal cual, como texto: la evaluación lo lee con coma o punto decimal.

export interface PropsFormulario {
  formulario: Formulario
  onCambio: (clave: string, valor: string) => void
}

export function TarjetaEtapa({ icono, titulo, bajada, children }: { icono: ReactNode; titulo: string; bajada: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className="card overflow-hidden" aria-labelledby={id}>
      <header className="flex items-center gap-3 border-b border-tierra-200 bg-tierra-100/60 px-4 py-3">
        <span className="text-bosque-700">{icono}</span>
        <div>
          <h2 id={id} className="text-xl font-bold text-tierra-900">
            {titulo}
          </h2>
          <p className="text-sm text-tierra-600">{bajada}</p>
        </div>
      </header>
      <div className="space-y-5 p-4">{children}</div>
    </section>
  )
}

export function Subtitulo({ children }: { children: ReactNode }) {
  return <h3 className="font-display font-bold text-tierra-900">{children}</h3>
}

const claseEntrada =
  'w-full rounded-lg border border-tierra-300 bg-white px-2 py-1.5 text-right font-mono text-sm focus:outline-none focus:ring-2 focus:ring-bosque-500'

/** Entrada numérica sin etiqueta visible (dentro de una tabla): la etiqueta va para lectores de pantalla. */
export function Entrada({ clave, etiqueta, formulario, onCambio, placeholder }: PropsFormulario & { clave: string; etiqueta: string; placeholder?: string }) {
  return (
    <input
      aria-label={etiqueta}
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      value={formulario[clave] ?? ''}
      onChange={(e) => onCambio(clave, e.target.value)}
      className={claseEntrada}
    />
  )
}

/** Campo numérico con su etiqueta encima. */
export function Campo({
  clave,
  etiqueta,
  ayuda,
  placeholder,
  formulario,
  onCambio,
}: PropsFormulario & { clave: string; etiqueta: string; ayuda?: string; placeholder?: string }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-tierra-700">
        {etiqueta}
      </label>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={formulario[clave] ?? ''}
        onChange={(e) => onCambio(clave, e.target.value)}
        aria-describedby={ayuda ? `${id}-ayuda` : undefined}
        className={`mt-1 ${claseEntrada}`}
      />
      {ayuda && (
        <p id={`${id}-ayuda`} className="mt-1 text-xs text-tierra-600">
          {ayuda}
        </p>
      )}
    </div>
  )
}

/** Opciones excluyentes como botones (radio). `compacto` para usarlas dentro de una tabla. */
export function Opciones({
  clave,
  etiqueta,
  opciones,
  formulario,
  onCambio,
  compacto = false,
}: PropsFormulario & { clave: string; etiqueta: string; opciones: readonly (readonly [string, string])[]; compacto?: boolean }) {
  const nombre = useId()
  return (
    <fieldset>
      <legend className={compacto ? 'sr-only' : 'text-xs font-semibold text-tierra-700'}>{etiqueta}</legend>
      <div className={`flex flex-wrap gap-1.5 ${compacto ? '' : 'mt-1'}`}>
        {opciones.map(([valor, texto]) => {
          const activa = formulario[clave] === valor
          return (
            <label
              key={valor}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-bosque-500 ${
                activa ? 'border-poncho-700 bg-poncho-700 text-white' : 'border-tierra-300 bg-white text-tierra-800 hover:bg-tierra-100'
              }`}
            >
              <input type="radio" name={nombre} value={valor} checked={activa} onChange={() => onCambio(clave, valor)} className="sr-only" />
              {texto}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export function TextoLargo({
  clave,
  etiqueta,
  minimo,
  placeholder,
  formulario,
  onCambio,
}: PropsFormulario & { clave: string; etiqueta: string; minimo: number; placeholder?: string }) {
  const id = useId()
  const largo = (formulario[clave] ?? '').trim().length
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-tierra-700">
        {etiqueta}
      </label>
      <textarea
        id={id}
        rows={3}
        placeholder={placeholder}
        value={formulario[clave] ?? ''}
        onChange={(e) => onCambio(clave, e.target.value)}
        aria-describedby={`${id}-cuenta`}
        className="mt-1 w-full rounded-lg border border-tierra-300 bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bosque-500"
      />
      <p id={`${id}-cuenta`} className={`mt-0.5 text-xs ${largo >= minimo ? 'text-bosque-700' : 'text-tierra-600'}`}>
        {largo} / {minimo}
      </p>
    </div>
  )
}

/** Dato que entrega la misión (no se mide): línea de seguridad, plano antiguo… */
export function DatoEntregado({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-xl bg-poncho-50 px-3 py-2 text-poncho-900">
      <dt className="text-xs font-semibold opacity-80">{etiqueta}</dt>
      <dd className="font-mono text-lg font-semibold tabular-nums">{valor}</dd>
    </div>
  )
}

/** Tabla de entradas: una fila por tramo, casa o vivienda. */
export function TablaEntradas({ columnas, filas }: { columnas: string[]; filas: { id: string; celdas: ReactNode[] }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b-2 border-tierra-300 text-left text-xs font-semibold text-tierra-700">
            {columnas.map((c, i) => (
              <th key={c} scope="col" className={`px-2 py-2 ${i > 0 ? 'text-right' : ''}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-tierra-100">
          {filas.map((f) => (
            <tr key={f.id}>
              <th scope="row" className="whitespace-nowrap px-2 py-1.5 text-left font-semibold">
                {f.id}
              </th>
              {f.celdas.map((c, i) => (
                <td key={i} className="px-2 py-1.5">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
