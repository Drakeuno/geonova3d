import { describe, expect, it } from 'vitest'
import { progresivas } from '@/motor/perfil'
import { geometriaPerfil, planoSugeridoMm, textoProgresiva } from './geometriaPerfil'

// Sendero de la 1.3: E0–E5 cada 20 m.
const cotas = [99_812, 100_071, 100_395, 100_548, 100_903, 101_217]
const estaciones = progresivas(6, 20).map((progresivaM, i) => ({ id: `E${i}`, progresivaM, cotaMm: cotas[i] }))

describe('perfil sobre el papel (1:100 H / 1:20 V)', () => {
  const g = geometriaPerfil(estaciones, { horizontal: 100, vertical: 20 }, 99_000)

  it('100 m de eje son 1000 mm de papel', () => {
    expect(g.anchoMm).toBe(1000)
    expect(g.puntos.map((p) => p.xMm)).toEqual([0, 200, 400, 600, 800, 1000])
  })

  it('la cota se mide desde el plano de comparación con la escala vertical: 0,812 m → 40,6 mm', () => {
    expect(g.puntos[0].yMm).toBeCloseTo(40.6, 6)
    expect(g.puntos[5].yMm).toBeCloseTo(110.85, 6)
  })

  it('la grilla de cotas va cada 0,5 m, del plano a la cota redonda sobre la más alta', () => {
    expect(g.techoMm).toBe(101_500)
    expect(g.altoMm).toBe(125)
    expect(g.marcasCota.map((m) => m.cotaMm)).toEqual([99_000, 99_500, 100_000, 100_500, 101_000, 101_500])
    expect(g.marcasCota[1].yMm).toBe(25)
  })

  it('cambia con las escalas: 1:200 H deja el eje en 500 mm', () => {
    expect(geometriaPerfil(estaciones, { horizontal: 200, vertical: 20 }, 99_000).anchoMm).toBe(500)
  })

  it('sugiere como plano de comparación el metro entero bajo la cota más baja', () => {
    expect(planoSugeridoMm(estaciones)).toBe(99_000)
  })

  it('escribe las progresivas como kilometraje', () => {
    expect(textoProgresiva(0)).toBe('0+000')
    expect(textoProgresiva(20)).toBe('0+020')
    expect(textoProgresiva(1240)).toBe('1+240')
  })
})
