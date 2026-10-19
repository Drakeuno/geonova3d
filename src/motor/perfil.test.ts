import { describe, expect, it } from 'vitest'
import { aPapel, construirPerfil, exageracionVertical, progresivas, tramosQueExceden } from './perfil'

// Perfil de 100 m con estaciones cada 20 m (E0–E5), como en la Misión 1.3.
const cotas = [100_000, 100_240, 100_410, 100_350, 101_950, 102_050]
const estaciones = progresivas(6, 20).map((progresivaM, i) => ({ id: `E${i}`, progresivaM, cotaMm: cotas[i] }))

describe('perfil longitudinal (§3.6)', () => {
  const tramos = construirPerfil(estaciones)

  it('genera progresivas cada 20 m', () => {
    expect(progresivas(6, 20)).toEqual([0, 20, 40, 60, 80, 100])
  })

  it('calcula desnivel parcial, acumulado y pendiente por tramo', () => {
    expect(tramos.map((t) => t.desnivelMm)).toEqual([240, 170, -60, 1600, 100])
    expect(tramos.map((t) => t.desnivelAcumuladoMm)).toEqual([240, 410, 350, 1950, 2050])
    expect(tramos.map((t) => t.pendientePct)).toEqual([1.2, 0.85, -0.3, 8, 0.5])
  })

  it('identifica los tramos que superan una pendiente máxima', () => {
    expect(tramosQueExceden(tramos, 8)).toEqual([])
    expect(tramosQueExceden(tramos, 7.9).map((t) => `${t.desde}-${t.hasta}`)).toEqual(['E3-E4'])
  })
})

describe('perfil a escala (1:100 H / 1:20 V por defecto)', () => {
  const escalas = { horizontal: 100, vertical: 20 }

  it('la exageración vertical es ×5', () => {
    expect(exageracionVertical(escalas)).toBe(5)
  })

  it('100 m de eje son 1000 mm de papel y 1 m de desnivel son 50 mm', () => {
    const papel = aPapel(estaciones, escalas, 100_000)
    expect(papel[0]).toEqual({ id: 'E0', xMm: 0, yMm: 0 })
    expect(papel[5].xMm).toBe(1000)
    expect(papel[5].yMm).toBeCloseTo(102.5, 6)
  })
})
