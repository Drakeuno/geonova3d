import { describe, expect, it } from 'vitest'
import { aMm, dentroDeTolerancia, formatearMm, parsearMetrosAMm, redondearMedioArriba } from './numeros'
import { crearRng, enteroEntre } from './azar'

describe('redondeo medio arriba', () => {
  it('redondea la mitad alejándose de cero', () => {
    expect(redondearMedioArriba(2.5)).toBe(3)
    expect(redondearMedioArriba(-2.5)).toBe(-3)
    expect(redondearMedioArriba(2.4999)).toBe(2)
    expect(redondearMedioArriba(-0.4)).toBe(0)
    expect(Object.is(redondearMedioArriba(-0.4), -0)).toBe(false)
  })

  it('corrige artefactos de coma flotante', () => {
    expect(redondearMedioArriba(1.0005, 3)).toBe(1.001)
    expect(aMm(1.0005)).toBe(1001)
    expect(aMm(97.35)).toBe(97350)
  })
})

describe('lectura de valores escritos por el jugador', () => {
  it('acepta coma o punto decimal y devuelve milímetros', () => {
    expect(parsearMetrosAMm('1,523')).toBe(1523)
    expect(parsearMetrosAMm('1.523')).toBe(1523)
    expect(parsearMetrosAMm(' 2 ')).toBe(2000)
    expect(parsearMetrosAMm('0,75')).toBe(750)
    expect(parsearMetrosAMm('100,000')).toBe(100000)
  })

  it('acepta signo menos (guion o signo tipográfico) y más', () => {
    expect(parsearMetrosAMm('-0,750')).toBe(-750)
    expect(parsearMetrosAMm('−0,750')).toBe(-750)
    expect(parsearMetrosAMm('+1,200')).toBe(1200)
  })

  it('redondea a 0,001 m medio arriba si trae más decimales (§14)', () => {
    expect(parsearMetrosAMm('1,5235')).toBe(1524)
    expect(parsearMetrosAMm('1,52349')).toBe(1523)
    expect(parsearMetrosAMm('-1,5235')).toBe(-1524)
  })

  it('rechaza lo que no es un número', () => {
    for (const malo of ['', 'abc', '1,', ',5', '1,2,3', '1 523']) expect(parsearMetrosAMm(malo)).toBeNull()
  })
})

describe('formato con coma decimal', () => {
  it('muestra metros con tres decimales', () => {
    expect(formatearMm(1523)).toBe('1,523')
    expect(formatearMm(-750)).toBe('−0,750')
    expect(formatearMm(100000)).toBe('100,000')
    expect(formatearMm(5)).toBe('0,005')
  })

  it('agrega "+" a los desniveles positivos si se pide', () => {
    expect(formatearMm(750, { signo: true })).toBe('+0,750')
    expect(formatearMm(0, { signo: true })).toBe('0,000')
  })

  it('lo escrito y lo mostrado son reversibles', () => {
    for (const mm of [0, 1, 999, 1523, -2500, 130250]) expect(parsearMetrosAMm(formatearMm(mm))).toBe(mm)
  })
})

describe('tolerancia de comparación', () => {
  it('por defecto es ±1 mm', () => {
    expect(dentroDeTolerancia(1523, 1524)).toBe(true)
    expect(dentroDeTolerancia(1523, 1525)).toBe(false)
  })
})

describe('azar con semilla', () => {
  it('la misma semilla repite la secuencia', () => {
    const a = crearRng(42)
    const b = crearRng(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('enteroEntre respeta los extremos', () => {
    const rng = crearRng(7)
    const valores = Array.from({ length: 500 }, () => enteroEntre(rng, 3, 5))
    expect(new Set(valores)).toEqual(new Set([3, 4, 5]))
  })
})
