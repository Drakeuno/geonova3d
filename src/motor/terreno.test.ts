import { describe, expect, it } from 'vitest'
import { crearRng } from './azar'
import { elegirColimacion, rangoDesdeParametros } from './lecturas'
import { alturaTerrenoMm, limites } from './terreno'

const control = [
  { x: 0, y: 0, cotaMm: 100_000 },
  { x: 45, y: 0, cotaMm: 100_850 },
  { x: 45, y: 60, cotaMm: 101_420 },
]

describe('terreno interpolado', () => {
  it('pasa exactamente por los puntos de control', () => {
    for (const p of control) expect(alturaTerrenoMm(control, p.x, p.y)).toBe(p.cotaMm)
  })

  it('entre puntos queda dentro del rango de cotas', () => {
    const rng = crearRng(1)
    for (let i = 0; i < 300; i++) {
      const h = alturaTerrenoMm(control, rng() * 80 - 10, rng() * 80 - 10)
      expect(h).toBeGreaterThanOrEqual(100_000)
      expect(h).toBeLessThanOrEqual(101_420)
    }
  })

  it('los límites agregan margen alrededor de los puntos', () => {
    expect(limites(control, 10)).toEqual({ minX: -10, maxX: 55, minY: -10, maxY: 70 })
  })
})

describe('colimación con altura preferida', () => {
  const rango = rangoDesdeParametros({ minimaM: 0.5, maximaM: 2.5 })

  it('queda cerca de la preferida si es posible', () => {
    const rng = crearRng(2)
    for (let i = 0; i < 200; i++) {
      const c = elegirColimacion([100_000, 100_850], rango, rng, 101_900)
      expect(Math.abs(c - 101_900)).toBeLessThanOrEqual(50)
    }
  })

  it('si la preferida no cabe, se acerca lo más posible sin salir del rango', () => {
    const c = elegirColimacion([100_000, 101_900], rango, crearRng(3), 101_000)
    expect(c).toBeGreaterThanOrEqual(102_400)
    expect(c).toBeLessThanOrEqual(102_450)
  })
})
