import { describe, expect, it } from 'vitest'
import { crearRng } from './azar'
import { desnivelMm } from './desniveles'
import {
  elegirColimacion,
  errorMontajeMm,
  erroresDeLectura,
  esLecturaExacta,
  intervaloColimacion,
  lecturaVerdaderaMm,
  rangoDesdeParametros,
} from './lecturas'

const rango = rangoDesdeParametros({ minimaM: 0.5, maximaM: 2.5 })

describe('lecturas simuladas dentro del rango de la mira (§14)', () => {
  it('el rango por defecto es 0,500–2,500 m', () => {
    expect(rango).toEqual({ minimaMm: 500, maximaMm: 2500 })
  })

  it('todas las lecturas de una estación caen en el rango', () => {
    const rng = crearRng(1)
    for (let i = 0; i < 500; i++) {
      const cotas = [100_000 + Math.floor(rng() * 1000), 100_000 + Math.floor(rng() * 1000)]
      const col = elegirColimacion(cotas, rango, rng)
      for (const c of cotas) {
        const l = lecturaVerdaderaMm(col, c)
        expect(l).toBeGreaterThanOrEqual(500)
        expect(l).toBeLessThanOrEqual(2500)
      }
    }
  })

  it('una estación puede salvar hasta 2,000 m de desnivel, no más', () => {
    expect(intervaloColimacion([100_000, 102_000], rango)).toEqual({ desdeMm: 102_500, hastaMm: 102_500 })
    expect(intervaloColimacion([100_000, 102_001], rango)).toBeNull()
    expect(() => elegirColimacion([100_000, 102_001], rango, crearRng(1))).toThrow()
  })

  it('la lectura verdadera reproduce el desnivel verdadero', () => {
    const col = elegirColimacion([100_000, 100_850], rango, crearRng(3))
    expect(desnivelMm(lecturaVerdaderaMm(col, 100_000), lecturaVerdaderaMm(col, 100_850))).toBe(850)
  })
})

describe('CP-01 · instrumento desnivelado', () => {
  it('con la burbuja centrada no hay error de montaje', () => {
    const rng = crearRng(5)
    for (let i = 0; i < 200; i++) expect(errorMontajeMm(0.05, 5, rng)).toBe(0)
  })

  it('con la burbuja descentrada el error aparece, sin pasar del máximo configurado', () => {
    const rng = crearRng(5)
    const errores = Array.from({ length: 500 }, () => errorMontajeMm(1, 5, rng))
    expect(errores.every((e) => Math.abs(e) <= 5)).toBe(true)
    expect(errores.filter((e) => e !== 0).length).toBeGreaterThan(400)
  })

  it('más desviación produce más error medio', () => {
    const medio = (desviacion: number) => {
      const rng = crearRng(9)
      const e = Array.from({ length: 2000 }, () => Math.abs(errorMontajeMm(desviacion, 5, rng)))
      return e.reduce((a, b) => a + b, 0) / e.length
    }
    expect(medio(1)).toBeGreaterThan(medio(0.4) * 1.5)
  })

  it('el desnivel final arrastra el error del montaje aunque el jugador lea perfecto la cruz', () => {
    const rng = crearRng(11)
    const col = elegirColimacion([100_000, 100_850], rango, rng)
    const vLt = lecturaVerdaderaMm(col, 100_000)
    const vLa = lecturaVerdaderaMm(col, 100_850)
    const mLt = vLt + 3 // cruz desplazada por la burbuja
    const mLa = vLa - 2
    // El jugador lee exactamente donde ve la cruz.
    const lt = erroresDeLectura(mLt, { verdaderaMm: vLt, mostradaMm: mLt })
    const la = erroresDeLectura(mLa, { verdaderaMm: vLa, mostradaMm: mLa })
    expect(lt).toEqual({ lecturaMm: 0, montajeMm: 3, totalMm: 3 })
    expect(la).toEqual({ lecturaMm: 0, montajeMm: -2, totalMm: -2 })
    expect(desnivelMm(mLt, mLa) - 850).toBe(5)
    expect(esLecturaExacta(lt.totalMm)).toBe(false)
  })
})

describe('lectura exacta para el XP (§6.2)', () => {
  it('cuenta si el error total está dentro de ±1 mm', () => {
    expect(esLecturaExacta(1)).toBe(true)
    expect(esLecturaExacta(-1)).toBe(true)
    expect(esLecturaExacta(2)).toBe(false)
  })
})
