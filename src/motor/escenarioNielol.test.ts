import { describe, expect, it } from 'vitest'
import nielolJson from '../../public/datos/escenarios/nielol.json'
import { crearRng } from './azar'
import { calcularLibreta, sumaDesnivelesMm, toleranciaCierreMm } from './desniveles'
import { cotaVerdaderaMm, distanciaEntre, estacionesDelEje, leerEscenario, longitudRecorridoM, planificarRecorrido, puntosControl } from './escenarios'
import { rangoDesdeParametros } from './lecturas'
import { construirPerfil, tramosQueExceden } from './perfil'
import { alturaTerrenoMm } from './terreno'

// Cerro Ñielol simulado (Misión 3.3, §5): circuito de 5 puntos (E, B, L, M, R) con tramos de 80 a
// 250 m, y el sendero principal de 240 m con 13 estaciones cada 20 m y un tramo sobre 8 %.

const rango = rangoDesdeParametros({ minimaM: 0.5, maximaM: 2.5 })
const nielol = leerEscenario(nielolJson, rango)

describe('Cerro Ñielol (Acto 3)', () => {
  it('las cotas van en una franja estrecha dentro de 90–130 msnm', () => {
    for (const p of nielol.puntos) {
      expect(p.cota).toBeGreaterThanOrEqual(90)
      expect(p.cota).toBeLessThanOrEqual(130)
    }
  })

  it('el circuito pasa por E, B, L, M y R con tramos entre 80 y 250 m, y cierra en 0', () => {
    const lecturas = planificarRecorrido(nielol, '3.3-circuito', rango, crearRng(3))
    expect(lecturas.filter((l) => l.tipo === 'LA').map((l) => l.punto)).toEqual(['B', 'L', 'M', 'R', 'Q', 'E'])
    const tramos = [['E', 'B'], ['B', 'L'], ['L', 'M'], ['M', 'R'], ['R', 'E']].map(([a, b]) =>
      a === 'R' ? distanciaEntre(nielol, 'R', 'Q') + distanciaEntre(nielol, 'Q', 'E') : distanciaEntre(nielol, a, b),
    )
    for (const d of tramos) {
      expect(d).toBeGreaterThanOrEqual(80)
      expect(d).toBeLessThanOrEqual(250)
    }
    const visadas = lecturas.map((l) => ({ ...l, lecturaMm: l.verdaderaMm }))
    expect(sumaDesnivelesMm(calcularLibreta(visadas, 112_400).filas)).toBe(0)
    expect(toleranciaCierreMm(longitudRecorridoM(lecturas))).toBeGreaterThan(8)
  })

  it('el sendero principal mide 240 m, de E a M, con 13 estaciones cada 20 m', () => {
    const eje = estacionesDelEje(nielol)
    expect(eje).toHaveLength(13)
    expect(eje[0].id).toBe('E')
    expect(eje[12]).toMatchObject({ id: 'M', progresivaM: 240 })
    for (let i = 1; i < eje.length; i++) expect(distanciaEntre(nielol, eje[i - 1].id, eje[i].id)).toBe(20)
  })

  it('un solo tramo del sendero pasa de 8 % (criterio de accesibilidad)', () => {
    const excedidos = tramosQueExceden(construirPerfil(estacionesDelEje(nielol)), 8)
    expect(excedidos.map((t) => `${t.desde}–${t.hasta}`)).toEqual(['S07–S08'])
  })

  it('el perfil parte del PR en E y llega a M, la cota del mirador del circuito', () => {
    const lecturas = planificarRecorrido(nielol, '3.3-perfil', rango, crearRng(4))
    const visadas = lecturas.map((l) => ({ ...l, lecturaMm: l.verdaderaMm }))
    const filas = calcularLibreta(visadas, 112_400).filas
    expect(filas[filas.length - 1]).toMatchObject({ punto: 'M', cotaMm: cotaVerdaderaMm(nielol, 'M') })
  })

  it('el instrumento queda a una altura creíble (1,2–1,8 m) en todas las posturas', () => {
    const control = puntosControl(nielol)
    for (let semilla = 1; semilla <= 40; semilla++) {
      for (const r of nielol.recorridos) {
        const lecturas = planificarRecorrido(nielol, r.id, rango, crearRng(semilla))
        for (const est of r.estaciones) {
          const lt = lecturas.find((l) => l.estacion === est.id && l.tipo === 'LT')!
          const altura = cotaVerdaderaMm(nielol, lt.punto) + lt.verdaderaMm - alturaTerrenoMm(control, est.x, est.y)
          expect(altura, `${r.id} ${est.id}`).toBeGreaterThanOrEqual(1200)
          expect(altura, `${r.id} ${est.id}`).toBeLessThanOrEqual(1800)
        }
      }
    }
  })
})
