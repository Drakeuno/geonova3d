import { describe, expect, it } from 'vitest'
import { crearRng } from './azar'
import { EVENTOS, cierreTramo, hayDiscrepancia, sembrarEvento, tramoConError, validarResolucion } from './cooperativa'
import { toleranciaCierreMm } from './desniveles'

// Línea de 400 m: C (cota conocida 100,000) → M ← R (cota conocida 99,200). M verdadera = 100,640.
// Cada tramo mide 200 m de ida y otros 200 de vuelta: K = 0,4 km.
const T = toleranciaCierreMm(400)
const COTA_C = 100_000
const COTA_R = 99_200
const M = 100_640

describe('evento sembrado (§14)', () => {
  // Ida de cada tramo: dos posturas, LT y LA en cada una.
  const ida = { A: ['LT', 'LA', 'LT', 'LA'], B: ['LT', 'LA', 'LT', 'LA'] } as const
  const idaCopia = { A: [...ida.A], B: [...ida.B] }

  it('siempre introduce un error grosero mayor que 30 mm en la ida de un tramo', () => {
    const rng = crearRng(2)
    for (let i = 0; i < 300; i++) {
      const ev = sembrarEvento(rng, idaCopia)
      expect(Math.abs(ev.desplazamientoMm)).toBeGreaterThan(30)
      expect(ev.indiceLectura).toBeGreaterThanOrEqual(0)
      expect(ev.indiceLectura).toBeLessThan(4)
      expect(ev.causa).toBe(EVENTOS[ev.tipo].causa)
    }
  })

  it('reparte el evento entre ambos tramos y los tres tipos', () => {
    const rng = crearRng(3)
    const eventos = Array.from({ length: 300 }, () => sembrarEvento(rng, idaCopia))
    expect(new Set(eventos.map((e) => e.tramo))).toEqual(new Set(['A', 'B']))
    expect(new Set(eventos.map((e) => e.tipo))).toEqual(new Set(Object.keys(EVENTOS)))
  })

  it('el trípode golpeado siempre cae en una lectura adelante', () => {
    const rng = crearRng(4)
    const golpes = Array.from({ length: 300 }, () => sembrarEvento(rng, idaCopia)).filter((e) => e.tipo === 'tripode-golpeado')
    expect(golpes.length).toBeGreaterThan(0)
    expect(golpes.every((e) => idaCopia[e.tramo][e.indiceLectura] === 'LA')).toBe(true)
  })

  it('a un tramo que juega una persona no le toca la libreta mojada', () => {
    const rng = crearRng(5)
    const eventos = Array.from({ length: 300 }, () => sembrarEvento(rng, idaCopia, ['A']))
    expect(eventos.some((e) => e.tramo === 'A' && e.tipo === 'libreta-mojada')).toBe(false)
    expect(eventos.some((e) => e.tramo === 'B' && e.tipo === 'libreta-mojada')).toBe(true)
  })
})

describe('CP-05 · dos cuadrillas con cota de M discrepante', () => {
  // A va de C a M bien (+0,640) y vuelve bien. B sufre el evento: +45 mm en una lectura de la ida.
  const a = cierreTramo('A', COTA_C, [300, 340], [-340, -301], T)
  const b = cierreTramo('B', COTA_R, [700, 740 - 45], [-740, -700], T)

  it('cada cuadrilla obtiene su cota de M y su cierre de ida y vuelta', () => {
    expect(a).toMatchObject({ cotaMMm: 100_640, errorMm: -1, cierra: true })
    expect(b).toMatchObject({ cotaMMm: 100_595, errorMm: -45, cierra: false })
  })

  it('se activa el diagnóstico y el tramo que no cierra es el que tiene el error', () => {
    expect(hayDiscrepancia(a, b, T)).toBe(true)
    expect(tramoConError(a, b)).toBe('B')
  })

  it('valida la resolución contra el evento sembrado', () => {
    const evento = { tramo: 'B', tipo: 'mira-danada', causa: 'lectura', indiceLectura: 1, desplazamientoMm: -45 } as const
    const base = {
      tramo: 'B' as const,
      estacion: 'S1',
      causa: 'lectura' as const,
      cotaComunMm: 100_640,
      procedimiento: 'Repetimos la lectura adelante de la estación 2 del tramo B con la mira revisada.',
    }
    expect(validarResolucion(base, evento, 'S1', M, T).aprobada).toBe(true)
    expect(validarResolucion({ ...base, estacion: 'S2' }, evento, 'S1', M, T)).toMatchObject({ estacionOk: false, aprobada: false })
    expect(validarResolucion({ ...base, tramo: 'A' }, evento, 'S1', M, T)).toMatchObject({ tramoOk: false, estacionOk: false })
    expect(validarResolucion({ ...base, causa: 'cinta-mal-tensada' }, evento, 'S1', M, T)).toMatchObject({ causaOk: false, aprobada: false })
    expect(validarResolucion({ ...base, cotaComunMm: 100_595 }, evento, 'S1', M, T)).toMatchObject({ cotaOk: false, aprobada: false })
    expect(validarResolucion({ ...base, procedimiento: 'error' }, evento, 'S1', M, T)).toMatchObject({ documentada: false, aprobada: false })
  })
})
