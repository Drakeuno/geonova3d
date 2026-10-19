import { describe, expect, it } from 'vitest'
import {
  abastecimientoSuficiente,
  citasCoinciden,
  cotaOptimaTanqueMm,
  decidirAgua,
  evaluarTransitable,
  planoAlterado,
  presionesMca,
  viviendasBajoLinea,
} from './decisiones'

// Trazado F–V1 120 m, V1–V2 90 m, V2–V3 110 m, V3–V4 80 m: 400 m (§5, 2.1).
const TRAZADO_M = 400

describe('2.1 · piel La Red del Agua', () => {
  it('escenario base: la fuente ~4 m bajo V4 obliga a bombear (decisión del 19-oct-2026)', () => {
    expect(decidirAgua(96_000, 100_000, TRAZADO_M, 0.5)).toEqual({ decision: 'bombeo', pendientePct: -1 })
  })

  it('gravedad si la fuente está más alta y la pendiente llega a 0,5 %', () => {
    expect(decidirAgua(102_000, 100_000, TRAZADO_M, 0.5)).toEqual({ decision: 'gravedad', pendientePct: 0.5 })
  })

  it('bombeo si la fuente está más alta pero la pendiente no alcanza', () => {
    expect(decidirAgua(101_999, 100_000, TRAZADO_M, 0.5).decision).toBe('bombeo')
  })
})

describe('2.1 · pieles Camino del Pehuén y Cero Cota', () => {
  it('Pehuén: transitable si ningún tramo pasa de 8 %', () => {
    expect(evaluarTransitable([{ pendientePct: 7.9 }, { pendientePct: -8 }], 8)).toEqual({ transitable: true, excedidos: [] })
    expect(evaluarTransitable([{ pendientePct: 3 }, { pendientePct: -8.2 }], 8)).toEqual({ transitable: false, excedidos: [1] })
  })

  it('Cero Cota: viviendas bajo la línea de seguridad', () => {
    const v = [
      { id: 'V1', cotaMm: 99_500 },
      { id: 'V2', cotaMm: 100_000 },
      { id: 'V3', cotaMm: 100_400 },
    ]
    expect(viviendasBajoLinea(v, 100_000)).toEqual(['V1'])
  })
})

describe('2.1 c · la justificación cita los números de la libreta', () => {
  const libreta = { cotaF: 96_012, cotaV4: 100_004, distancia: 400_000 }

  it('acepta citas dentro de ±1 mm', () => {
    expect(citasCoinciden({ cotaF: 96_013, cotaV4: 100_004, distancia: 400_000 }, libreta).ok).toBe(true)
  })

  it('rechaza valores genéricos y citas faltantes', () => {
    expect(citasCoinciden({ cotaF: 96_000, cotaV4: 100_004, distancia: null }, libreta)).toEqual({
      ok: false,
      faltantes: ['distancia'],
      distintas: ['cotaF'],
    })
  })
})

describe('2.2 · Detective de Cotas', () => {
  const viviendas = [
    { id: 'V1', cotaMm: 98_200 },
    { id: 'V2', cotaMm: 99_150 },
    { id: 'V3', cotaMm: 99_870 },
    { id: 'V4', cotaMm: 98_640 },
  ]

  it('detecta el plano alterado en +3,500 m', () => {
    expect(planoAlterado(110_500 + 3_500, 110_500, 5.4)).toBe(true)
    expect(planoAlterado(110_503, 110_500, 5.4)).toBe(false)
  })

  it('cota óptima = máx(Cota Vᵢ) + 10 m.c.a.', () => {
    expect(cotaOptimaTanqueMm(viviendas.map((v) => v.cotaMm), 10)).toBe(109_870)
  })

  it('con la cota óptima todas las viviendas tienen al menos 10 m.c.a.; 1 mm menos no alcanza', () => {
    expect(abastecimientoSuficiente(109_870, viviendas, 10)).toBe(true)
    expect(abastecimientoSuficiente(109_869, viviendas, 10)).toBe(false)
    expect(presionesMca(109_870, viviendas).find((p) => p.id === 'V3')?.presionMca).toBe(10)
  })
})
