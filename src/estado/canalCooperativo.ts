import { useEffect, useRef, useState } from 'react'
import type { Tramo } from '@/motor/cooperativa'
import type { DatosFila } from '@/motor/libreta'
import type { ResolucionPublica } from '@/misiones/tipos'

// Canal entre dos ventanas del mismo equipo para la 2.3 (BroadcastChannel): cada cuadrilla anuncia su
// estado (libreta y diagnóstico) y escucha el de la otra. Es la versión local de la sincronización;
// entre equipos distintos irá por el servidor (fase B).

export interface EstadoCuadrilla {
  tramo: Tramo
  /** Filas vigentes de la libreta, en orden. */
  filas: DatosFila[]
  resolucion: ResolucionPublica | null
}

type Mensaje = { tipo: 'hola' } | { tipo: 'estado'; estado: EstadoCuadrilla }

export function useCanalCooperativo(codigo: string | null, propio: EstadoCuadrilla | null) {
  const [companero, setCompanero] = useState<EstadoCuadrilla | null>(null)
  const canal = useRef<BroadcastChannel | null>(null)
  const ultimo = useRef(propio)
  ultimo.current = propio

  useEffect(() => {
    if (!codigo || typeof BroadcastChannel === 'undefined') return
    const c = new BroadcastChannel(`gn3d-2.3-${codigo}`)
    canal.current = c
    const anunciar = () => ultimo.current && c.postMessage({ tipo: 'estado', estado: ultimo.current } satisfies Mensaje)
    c.onmessage = (e: MessageEvent<Mensaje>) => {
      if (e.data?.tipo === 'hola') anunciar()
      if (e.data?.tipo === 'estado' && e.data.estado.tramo !== ultimo.current?.tramo) setCompanero(e.data.estado)
    }
    c.postMessage({ tipo: 'hola' } satisfies Mensaje)
    anunciar()
    // Latido: si la otra ventana se recarga, recibe el estado sin esperar un cambio.
    const latido = window.setInterval(anunciar, 3000)
    return () => {
      window.clearInterval(latido)
      c.close()
      canal.current = null
    }
  }, [codigo])

  // Cada cambio propio se anuncia de inmediato.
  const firma = JSON.stringify(propio)
  useEffect(() => {
    if (propio) canal.current?.postMessage({ tipo: 'estado', estado: propio } satisfies Mensaje)
  }, [firma]) // eslint-disable-line react-hooks/exhaustive-deps

  return companero
}
