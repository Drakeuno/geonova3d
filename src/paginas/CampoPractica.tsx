import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import type { Parametros } from '@/datos/parametros'
import { useEscenario } from '@/estado/escenarios'
import { crearRng } from '@/motor/azar'
import type { Burbuja } from '@/motor/burbuja'
import { planificarRecorrido, type Escenario, type LecturaPlanificada } from '@/motor/escenarios'
import { erroresDeLectura, esLecturaExacta, rangoDesdeParametros, type ErroresLectura } from '@/motor/lecturas'
import { formatearMm, parsearMetrosAMm } from '@/motor/numeros'
import { claveLectura, PanelCampo } from '@/componentes/campo/PanelCampo'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'

const t = textos.campo

export default function CampoPractica() {
  const { escenario, parametros, error } = useEscenario('campus-uct')
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link to="/viaje" className="inline-flex items-center gap-1 text-sm font-semibold text-bosque-700 hover:underline">
        <ArrowLeft size={16} aria-hidden /> {t.volver}
      </Link>
      <h1 className="mt-2 text-3xl font-bold text-tierra-900">{t.titulo}</h1>
      <p className="mt-1 max-w-3xl text-tierra-700">{t.bajada}</p>
      {escenario && parametros ? (
        <Practica escenario={escenario} parametros={parametros} />
      ) : (
        <p className="card mt-6 p-5 text-tierra-600">{error ? `${t.error}: ${error}` : t.cargando}</p>
      )}
    </div>
  )
}

interface ResultadoLectura extends ErroresLectura {
  ingresadaMm: number
  mostradaMm: number
}

const semillaNueva = () => Math.floor(Math.random() * 1e9)

function Practica({ escenario, parametros }: { escenario: Escenario; parametros: Parametros }) {
  // ?semilla=… en la dirección repite exactamente el mismo intento (revisión docente y pruebas).
  const [busqueda] = useSearchParams()
  const [recorridoId, setRecorridoId] = useState(busqueda.get('recorrido') ?? escenario.recorridos[0].id)
  const [semilla, setSemilla] = useState(() => Number(busqueda.get('semilla')) || semillaNueva())
  const [burbujas, setBurbujas] = useState<Record<string, Burbuja>>({})
  const [niveladas, setNiveladas] = useState<Record<string, number>>({})
  const [entradas, setEntradas] = useState<Record<string, string>>({})
  const [resultados, setResultados] = useState<Record<string, ResultadoLectura | 'invalida'>>({})

  const recorrido = escenario.recorridos.find((r) => r.id === recorridoId)!
  const lecturas = useMemo(
    () => planificarRecorrido(escenario, recorridoId, rangoDesdeParametros(parametros.lectura), crearRng(semilla)),
    [escenario, recorridoId, semilla, parametros.lectura],
  )

  const empezarDeNuevo = (id = recorridoId) => {
    setRecorridoId(id)
    setSemilla(semillaNueva())
    setBurbujas({})
    setNiveladas({})
    setEntradas({})
    setResultados({})
  }

  const comprobar = (l: LecturaPlanificada, desplazamientoMm: number) => {
    const ingresadaMm = parsearMetrosAMm(entradas[claveLectura(l)] ?? '')
    if (ingresadaMm === null) return setResultados({ ...resultados, [claveLectura(l)]: 'invalida' })
    const mostradaMm = l.verdaderaMm + desplazamientoMm
    setResultados({ ...resultados, [claveLectura(l)]: { ...erroresDeLectura(ingresadaMm, { verdaderaMm: l.verdaderaMm, mostradaMm }), ingresadaMm, mostradaMm } })
  }

  return (
    <div className="mt-6">
      <PanelCampo
        key={`${recorridoId}:${semilla}`}
        escenario={escenario}
        parametros={parametros}
        recorrido={recorrido}
        lecturas={lecturas}
        semilla={semilla}
        burbujas={burbujas}
        niveladas={niveladas}
        onBurbuja={(estacion, b) => setBurbujas({ ...burbujas, [estacion]: b })}
        onNivelar={(estacion, desviacion) => {
          const resto = { ...niveladas }
          if (desviacion === null) delete resto[estacion]
          else resto[estacion] = desviacion
          setNiveladas(resto)
        }}
        encabezado={
          <section className="card p-4">
            <label className="block text-sm font-semibold text-tierra-800">
              {t.recorrido}
              <select
                value={recorridoId}
                onChange={(e) => empezarDeNuevo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-tierra-300 bg-white px-2.5 py-2 font-normal"
              >
                {escenario.recorridos.map((r) => (
                  <option key={r.id} value={r.id}>
                    {t.recorridos[r.id as keyof typeof t.recorridos] ?? r.id}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn-neutro mt-3 w-full" onClick={() => empezarDeNuevo()}>
              <RotateCcw size={16} aria-hidden /> {t.reiniciar}
            </button>
          </section>
        }
        bajoAnteojo={(visada, desplazamientoMm) => {
          const resultado = resultados[claveLectura(visada)]
          return (
            <>
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  comprobar(visada, desplazamientoMm)
                }}
              >
                <label className="flex-1 text-sm font-semibold text-tierra-800">
                  {t.tuLectura}
                  <input
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="1,523"
                    value={entradas[claveLectura(visada)] ?? ''}
                    onChange={(e) => setEntradas({ ...entradas, [claveLectura(visada)]: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-tierra-300 bg-white px-2.5 py-2 font-mono font-normal focus:outline-none focus:ring-2 focus:ring-bosque-500"
                  />
                </label>
                <button type="submit" className="btn-primario">
                  {t.comprobar}
                </button>
              </form>
              {resultado && <Resultado resultado={resultado} />}
            </>
          )
        }}
      />
    </div>
  )
}

function Resultado({ resultado }: { resultado: ResultadoLectura | 'invalida' }) {
  const r = t.resultado
  if (resultado === 'invalida') return <p className="text-sm text-granate-700">{r.invalida}</p>
  const fila = (etiqueta: string, mm: number) => (
    <div className="flex justify-between">
      <dt>{etiqueta}</dt>
      <dd className="font-mono font-semibold">{mm > 0 ? `+${mm}` : mm} mm</dd>
    </div>
  )
  const exacta = esLecturaExacta(resultado.totalMm)
  return (
    <div role="status" className={`rounded-xl p-3 text-sm ${exacta ? 'bg-bosque-100 text-bosque-800' : 'bg-tierra-100 text-tierra-900'}`}>
      <p>
        {rellenar(r.lectura, { l: formatearMm(resultado.ingresadaMm) })}; {rellenar(r.cruz, { c: formatearMm(resultado.mostradaMm) })}.
      </p>
      <dl className="mt-2 space-y-0.5">
        {fila(r.errorLectura, resultado.lecturaMm)}
        {fila(r.errorMontaje, resultado.montajeMm)}
        {fila(r.errorTotal, resultado.totalMm)}
      </dl>
      {exacta && <p className="mt-2 font-semibold">{r.exacta}</p>}
    </div>
  )
}
