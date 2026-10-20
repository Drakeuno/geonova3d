import { describe, expect, it } from 'vitest'
import { paleta } from './paleta'

// Requisito no funcional: contraste AA. Cada par es una combinación que la interfaz usa de verdad.

function luminancia(hex: string) {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5)
}

function contraste(a: string, b: string) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

const BLANCO = '#FFFFFF'
const { bosque, poncho, granate, buey, tierra, costa } = paleta

// [descripción, texto, fondo]
const paresTexto: [string, string, string][] = [
  ['texto principal sobre papel', tierra[900], tierra[50]],
  ['texto secundario sobre papel', tierra[600], tierra[50]],
  ['texto secundario sobre tarjeta blanca', tierra[600], BLANCO],
  ['botón primario', BLANCO, bosque[700]],
  ['botón primario (hover)', BLANCO, bosque[800]],
  ['barra de navegación activa', bosque[800], bosque[100]],
  ['chip de XP', buey[800], buey[100]],
  ['botón de acento (Entregar)', BLANCO, buey[600]],
  ['botón de acento (hover)', BLANCO, buey[700]],
  ['chip de error', granate[700], granate[100]],
  ['panel secundario', BLANCO, poncho[700]],
  ['texto claro sobre panel secundario', poncho[100], poncho[700]],
  ['chip neutro frío', costa[800], costa[100]],
  ['enlace sobre papel', bosque[700], tierra[50]],
]

describe('contraste AA de la paleta', () => {
  it.each(paresTexto)('%s ≥ 4,5:1', (_desc, texto, fondo) => {
    expect(contraste(texto, fondo)).toBeGreaterThanOrEqual(4.5)
  })
})
