import { useEffect, useRef, useState } from 'react'
import { formatearMm } from '@/motor/numeros'
import { paleta } from '@/estilos/paleta'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { textoProgresiva, type GeometriaPerfil } from './geometriaPerfil'

const t = textos.perfil

export interface RotulosPerfil {
  titulo: string
  ejeX: string
  ejeY: string
}

// Medidas del marco en pantalla (px). El área de dibujo conserva la proporción del papel: la
// exageración vertical se ve tal cual quedará impresa.
const IZQ = 132
const DER = 28
const SUP = 44
const FILA = 24
const INF = 52
const FILAS_GUITARRA = 3

/** Ancho disponible del contenedor; en pruebas sin ResizeObserver, un ancho fijo. */
function useAncho(inicial = 900) {
  const ref = useRef<HTMLDivElement>(null)
  const [ancho, setAncho] = useState(inicial)
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setAncho(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return { ref, ancho }
}

/** Perfil longitudinal dibujado desde la libreta, con grilla de cotas y guitarra de datos. */
export function PerfilSvg({ g, rotulos }: { g: GeometriaPerfil; rotulos: RotulosPerfil }) {
  const { ref, ancho } = useAncho()
  return (
    <div ref={ref}>
      {g.puntos.length < 2 ? (
        <p className="rounded-xl border border-dashed border-tierra-300 p-6 text-center text-sm text-tierra-600">{t.sinDatos}</p>
      ) : (
        <Dibujo g={g} rotulos={rotulos} ancho={ancho} />
      )}
    </div>
  )
}

function Dibujo({ g, rotulos, ancho }: { g: GeometriaPerfil; rotulos: RotulosPerfil; ancho: number }) {
  // px por mm de papel: llena el ancho disponible, sin bajar de 0,6 (con barra de desplazamiento).
  const k = Math.max(0.6, (ancho - IZQ - DER) / g.anchoMm)
  const w = g.anchoMm * k
  const h = g.altoMm * k
  const anchoTotal = IZQ + w + DER
  const altoTotal = SUP + h + FILA * FILAS_GUITARRA + INF
  const x = (mm: number) => IZQ + mm * k
  const y = (mm: number) => SUP + h - mm * k
  const base = SUP + h
  const filaY = (i: number) => base + FILA * i + FILA / 2 + 4
  const linea = g.puntos.map((p) => `${x(p.xMm)},${y(p.yMm)}`).join(' ')

  const valoresGuitarra: [string, (i: number) => string][] = [
    [rotulos.ejeX || t.guitarra.progresiva, (i) => textoProgresiva(g.puntos[i].progresivaM)],
    [t.guitarra.cota, (i) => formatearMm(g.puntos[i].cotaMm)],
    [t.guitarra.parcial, (i) => (i === 0 ? '—' : formatearMm(g.puntos[i].cotaMm - g.puntos[i - 1].cotaMm, { signo: true }))],
  ]

  return (
    <div className="overflow-x-auto rounded-xl border border-tierra-200 bg-white">
      <svg
        width={anchoTotal}
        height={altoTotal}
        viewBox={`0 0 ${anchoTotal} ${altoTotal}`}
        role="img"
        aria-label={rellenar(t.descripcion, { titulo: rotulos.titulo || t.sinTitulo, n: g.puntos.length })}
        className="font-sans"
      >
        <text x={IZQ} y={26} fontSize={16} fontWeight={700} fill={paleta.tierra[900]} className="font-display">
          {rotulos.titulo || t.sinTitulo}
        </text>

        {g.marcasCota.map((m) => (
          <g key={m.cotaMm}>
            <line x1={IZQ} x2={IZQ + w} y1={y(m.yMm)} y2={y(m.yMm)} stroke={paleta.tierra[200]} strokeWidth={1} />
            <text x={IZQ - 8} y={y(m.yMm) + 4} fontSize={11} textAnchor="end" fill={paleta.tierra[700]} className="font-mono">
              {formatearMm(m.cotaMm)}
            </text>
          </g>
        ))}
        <text
          transform={`translate(18 ${SUP + h / 2}) rotate(-90)`}
          fontSize={12}
          fontWeight={600}
          textAnchor="middle"
          fill={paleta.tierra[800]}
        >
          {rotulos.ejeY || '—'}
        </text>

        {g.puntos.map((p) => (
          <g key={p.id}>
            <line x1={x(p.xMm)} x2={x(p.xMm)} y1={y(p.yMm)} y2={base} stroke={paleta.tierra[300]} strokeDasharray="3 3" />
            <circle cx={x(p.xMm)} cy={y(p.yMm)} r={3.5} fill={paleta.bosque[700]} />
            <text x={x(p.xMm)} y={y(p.yMm) - 9} fontSize={11} fontWeight={700} textAnchor="middle" fill={paleta.tierra[900]}>
              {p.id}
            </text>
          </g>
        ))}
        <polyline points={linea} fill="none" stroke={paleta.bosque[700]} strokeWidth={2.5} strokeLinejoin="round" />
        <rect x={IZQ} y={SUP} width={w} height={h} fill="none" stroke={paleta.tierra[700]} strokeWidth={1.2} />

        {valoresGuitarra.map(([titulo, valor], fila) => (
          <g key={fila}>
            <line x1={8} x2={IZQ + w} y1={base + FILA * (fila + 1)} y2={base + FILA * (fila + 1)} stroke={paleta.tierra[400]} />
            <text x={10} y={filaY(fila)} fontSize={11} fontWeight={600} fill={paleta.tierra[800]}>
              {titulo}
            </text>
            {g.puntos.map((p, i) => (
              <text key={p.id} x={x(p.xMm)} y={filaY(fila)} fontSize={11} textAnchor="middle" fill={paleta.tierra[900]} className="font-mono">
                {valor(i)}
              </text>
            ))}
          </g>
        ))}

        <text x={IZQ} y={altoTotal - 16} fontSize={11} fill={paleta.tierra[700]}>
          {rellenar(t.pie, { h: g.escalas.horizontal, v: g.escalas.vertical, plano: formatearMm(g.planoMm), ex: g.escalas.horizontal / g.escalas.vertical })}
        </text>
      </svg>
    </div>
  )
}
