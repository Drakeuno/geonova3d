import { useEffect, useRef } from 'react'
import { lecturaEnLaCruzMm } from './optica'
import type { PropsAnteojo } from './Anteojo3D'
import { dibujarMira } from './dibujarMira'
import { ANCHO_MIRA_M } from './geometriaMira'

// Anteojo en 2D, para equipos sin WebGL: el mismo dibujo de la mira y la misma cruz, sin escena 3D.

export function AnteojoPlano({ cotaPuntoMm, colimacionMm, desplazamientoMm, ventanaM, tamano }: PropsAnteojo & { tamano: number }) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = lienzo.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const escala = window.devicePixelRatio || 1
    c.width = tamano * escala
    c.height = tamano * escala
    ctx.fillStyle = '#A3B38C'
    ctx.fillRect(0, 0, c.width, c.height)
    const centro = lecturaEnLaCruzMm(colimacionMm, cotaPuntoMm, desplazamientoMm) / 1000
    const anchoMira = (ANCHO_MIRA_M / ventanaM) * c.width
    dibujarMira(ctx, c.width, c.height, centro - ventanaM / 2, centro + ventanaM / 2, (c.width - anchoMira) / 2, anchoMira)
  }, [cotaPuntoMm, colimacionMm, desplazamientoMm, ventanaM, tamano])
  return <canvas ref={lienzo} style={{ width: tamano, height: tamano }} />
}
