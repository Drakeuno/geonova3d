import { useEffect, useState } from 'react'
import { leerEscenario, type Escenario } from '@/motor/escenarios'
import { rangoDesdeParametros } from '@/motor/lecturas'
import { useParametros } from './parametros'

// Carga de escenarios desde `public/datos/escenarios/` (editables sin recompilar). Se validan al
// leerlos con el rango de mira vigente: un escenario incoherente falla con la lista de problemas.

const cache = new Map<string, Escenario>()

export function useEscenario(id: string) {
  const { parametros, error: errorParametros } = useParametros()
  const [escenario, setEscenario] = useState<Escenario | null>(cache.get(id) ?? null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!parametros || cache.has(id)) return
    let vigente = true
    fetch(`${import.meta.env.BASE_URL}datos/escenarios/${id}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`No se pudo leer el escenario ${id} (HTTP ${r.status})`)
        return r.json()
      })
      .then((json) => {
        const e = leerEscenario(json, rangoDesdeParametros(parametros.lectura))
        cache.set(id, e)
        if (vigente) setEscenario(e)
      })
      .catch((e: unknown) => vigente && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      vigente = false
    }
  }, [id, parametros])

  return { escenario: escenario ?? cache.get(id) ?? null, parametros, error: error ?? errorParametros }
}
