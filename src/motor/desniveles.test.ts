import { describe, expect, it } from 'vitest'
import {
  calcularLibreta,
  compensar,
  comprobacionLecturasMm,
  diferenciasDeCota,
  errorCierreMm,
  evaluarCierre,
  pendientePct,
  puntosDelRecorrido,
  sumaDesnivelesMm,
  toleranciaCierreMm,
  type Visada,
} from './desniveles'

// Circuito de la Misión 1.2 (§5): A–B 45 m, B–C 60 m, C–D 50 m, D–A 55 m; A = PR de 100,000 m.
// Cotas verdaderas: B 100,850 · C 101,420 · D 100,630. Una estación por tramo.
const PR_A = 100_000
const circuito = (laFinalMm: number): Visada[] => [
  { estacion: 'E1', punto: 'A', tipo: 'LT', lecturaMm: 1500 },
  { estacion: 'E1', punto: 'B', tipo: 'LA', lecturaMm: 650, distanciaM: 45 },
  { estacion: 'E2', punto: 'B', tipo: 'LT', lecturaMm: 1420 },
  { estacion: 'E2', punto: 'C', tipo: 'LA', lecturaMm: 850, distanciaM: 60 },
  { estacion: 'E3', punto: 'C', tipo: 'LT', lecturaMm: 900 },
  { estacion: 'E3', punto: 'D', tipo: 'LA', lecturaMm: 1690, distanciaM: 50 },
  { estacion: 'E4', punto: 'D', tipo: 'LT', lecturaMm: 1100 },
  { estacion: 'E4', punto: 'A', tipo: 'LA', lecturaMm: laFinalMm, distanciaM: 55 },
]

describe('desniveles y cotas por suma acumulada (§3.1–3.2)', () => {
  it('Δh = LT − LA y cota = cota anterior + Δh', () => {
    const { filas, problemas } = calcularLibreta(circuito(1730), PR_A)
    expect(problemas).toEqual([])
    const la = filas.filter((f) => f.tipo === 'LA')
    expect(la.map((f) => f.desnivelMm)).toEqual([850, 570, -790, -630])
    expect(la.map((f) => f.cotaMm)).toEqual([100_850, 101_420, 100_630, 100_000])
    expect(la.map((f) => f.distanciaAcumuladaM)).toEqual([45, 105, 155, 210])
  })

  it('el punto de cambio repite la cota en la fila LT siguiente', () => {
    const { filas } = calcularLibreta(circuito(1730), PR_A)
    expect(filas[2]).toMatchObject({ punto: 'B', tipo: 'LT', cotaMm: 100_850 })
    expect(filas[2].desnivelMm).toBeUndefined()
  })

  it('las lecturas intermedias encadenan el desnivel desde el punto anterior', () => {
    const { filas } = calcularLibreta(
      [
        { estacion: 'E1', punto: 'E0', tipo: 'LT', lecturaMm: 1500 },
        { estacion: 'E1', punto: 'E1', tipo: 'LA', lecturaMm: 1200, distanciaM: 20 },
        { estacion: 'E1', punto: 'E2', tipo: 'LA', lecturaMm: 1050, distanciaM: 20 },
      ],
      PR_A,
    )
    expect(filas.map((f) => f.desnivelMm)).toEqual([undefined, 300, 150])
    // Equivale a LT − última LA de la estación: 1,500 − 1,050 = 0,450.
    expect(filas[2].cotaMm).toBe(PR_A + 450)
  })
})

describe('CP-02 · circuito de 4 puntos (§3.3–3.5)', () => {
  // Una lectura 4 mm alta en la última LA deja e = −4 mm.
  const visadas = circuito(1734)
  const { filas } = calcularLibreta(visadas, PR_A)
  const e = errorCierreMm(PR_A, sumaDesnivelesMm(filas), PR_A)

  it('e = ΣΔh y coincide con ΣLT − ΣLA', () => {
    expect(e).toBe(-4)
    expect(sumaDesnivelesMm(filas)).toBe(-4)
    expect(comprobacionLecturasMm(visadas)).toBe(-4)
  })

  it('T = 12√K mm con K = 0,21 km, y el circuito aprueba con |e| ≤ T', () => {
    expect(toleranciaCierreMm(210)).toBeCloseTo(5.499, 3)
    expect(evaluarCierre(e, 210)).toMatchObject({ errorMm: -4, aprobado: true })
    expect(evaluarCierre(-6, 210).aprobado).toBe(false)
  })

  it('la compensación reparte −e en proporción a la distancia acumulada', () => {
    const compensados = compensar(puntosDelRecorrido(filas), e)
    // cᵢ = +4 · dᵢ / 210 → 0 · 0,857 · 2 · 2,952 · 4, redondeadas al mm.
    expect(compensados.map((p) => p.correccionMm)).toEqual([0, 1, 2, 3, 4])
    expect(compensados.map((p) => p.cotaCompensadaMm)).toEqual([100_000, 100_851, 101_422, 100_633, 100_000])
  })

  it('con lecturas correctas el cierre es exacto y no hay corrección', () => {
    const exacto = calcularLibreta(circuito(1730), PR_A).filas
    expect(sumaDesnivelesMm(exacto)).toBe(0)
    expect(compensar(puntosDelRecorrido(exacto), 0).every((p) => p.correccionMm === 0)).toBe(true)
  })
})

describe('recorrido abierto contra cota conocida', () => {
  it('e = cota inicial + ΣΔh − cota final conocida', () => {
    expect(errorCierreMm(100_000, 1_253, 101_250)).toBe(3)
  })
})

describe('problemas de la libreta', () => {
  it('detecta una LT que no va sobre el último punto con cota', () => {
    const v = circuito(1730)
    v[2] = { ...v[2], punto: 'C' }
    expect(calcularLibreta(v, PR_A).problemas).toEqual(['Fila 3: la lectura atrás va sobre B, el último punto con cota'])
  })

  it('detecta una LA sin LT en su estación y una distancia faltante', () => {
    const { problemas } = calcularLibreta(
      [
        { estacion: 'E1', punto: 'A', tipo: 'LT', lecturaMm: 1500 },
        { estacion: 'E1', punto: 'B', tipo: 'LA', lecturaMm: 650 },
        { estacion: 'E2', punto: 'C', tipo: 'LA', lecturaMm: 850, distanciaM: 60 },
      ],
      PR_A,
    )
    expect(problemas).toEqual([
      'Fila 2: falta la distancia desde el punto anterior',
      'Fila 3: lectura adelante sin lectura atrás en la estación E2',
    ])
  })
})

describe('pendiente y comparación de cotas', () => {
  it('P% = Δh / distancia × 100', () => {
    expect(pendientePct(1600, 20)).toBe(8)
    expect(pendientePct(-100, 20)).toBe(-0.5)
  })

  it('reporta cotas faltantes o fuera de tolerancia', () => {
    const ref = [
      { punto: 'B', cotaMm: 100_851 },
      { punto: 'C', cotaMm: 101_422 },
      { punto: 'D', cotaMm: 100_633 },
    ]
    expect(diferenciasDeCota({ B: 100_852, C: 101_425 }, ref, 2)).toEqual([
      { punto: 'C', esperadaMm: 101_422, propuestaMm: 101_425 },
      { punto: 'D', esperadaMm: 100_633, propuestaMm: null },
    ])
  })
})

describe('nombres de estación y punto escritos a mano', () => {
  it('no distinguen mayúsculas, espacios ni guiones', () => {
    const visadas: Visada[] = [
      { estacion: 'e1', punto: 'pr 1', tipo: 'LT', lecturaMm: 1500 },
      { estacion: 'E1 ', punto: 'C', tipo: 'LA', lecturaMm: 1200, distanciaM: 30 },
      { estacion: 'E-2', punto: 'c', tipo: 'LT', lecturaMm: 1400 },
      { estacion: 'e2', punto: 'D', tipo: 'LA', lecturaMm: 1100, distanciaM: 25 },
    ]
    const { filas, problemas } = calcularLibreta(visadas, 100_000)
    expect(problemas).toEqual([])
    expect(filas.map((f) => f.cotaMm)).toEqual([100_000, 100_300, 100_300, 100_600])
    expect(comprobacionLecturasMm(visadas)).toBe(600)
  })
})
