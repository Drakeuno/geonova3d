import { describe, expect, it } from 'vitest'
import { crearRng } from './azar'
import { calcularLibreta, sumaDesnivelesMm } from './desniveles'
import campusJson from '../../public/datos/escenarios/campus-uct.json'
import {
  cotaVerdaderaMm,
  distanciaEntre,
  esquemaEscenario,
  estacionesDelEje,
  leerEscenario,
  longitudRecorridoM,
  planificarRecorrido,
  puntosControl,
  validarEscenario,
} from './escenarios'
import { rangoDesdeParametros } from './lecturas'
import { alturaTerrenoMm } from './terreno'

const rango = rangoDesdeParametros({ minimaM: 0.5, maximaM: 2.5 })

// Escenario de prueba con el formato de la §7: el circuito de la 1.2 en 3 estaciones y un sendero.
const json = {
  escenario: 'prueba-campus',
  puntos: [
    { id: 'A', x: 0, y: 0, cota: 100.0, pr: true },
    { id: 'B', x: 45, y: 0, cota: 100.85 },
    { id: 'C', x: 45, y: 60, cota: 101.42 },
    { id: 'D', x: 0, y: 55, cota: 100.63 },
    { id: 'S0', x: 0, y: -20, cota: 99.8 },
    { id: 'S1', x: 20, y: -20, cota: 99.95 },
  ],
  aristas: [
    { a: 'A', b: 'B', dist: 45 },
    { a: 'B', b: 'C', dist: 60 },
    { a: 'C', b: 'D', dist: 50 },
    { a: 'D', b: 'A', dist: 55 },
  ],
  sendero: { eje: ['S0', 'S1'], estacionamiento_m: 20 },
  recorridos: [
    {
      id: 'circuito',
      tipo: 'circuito',
      estaciones: [
        { id: 'E1', x: 22, y: 5, visadas: ['A', 'B'] },
        { id: 'E2', x: 40, y: 35, visadas: ['B', 'C', 'D'] },
        { id: 'E3', x: 5, y: 30, visadas: ['D', 'A'] },
      ],
    },
  ],
}

describe('formato de escenario (§7)', () => {
  it('lee un escenario válido', () => {
    const e = leerEscenario(json, rango)
    expect(e.puntos).toHaveLength(6)
    expect(e.puntos[1].pr).toBe(false)
  })

  it('usa la distancia de la arista y, si no hay, la de las coordenadas', () => {
    const e = leerEscenario(json, rango)
    expect(distanciaEntre(e, 'B', 'A')).toBe(45)
    expect(distanciaEntre(e, 'S0', 'S1')).toBe(20)
  })

  it('entrega las estaciones del eje con su progresiva', () => {
    expect(estacionesDelEje(leerEscenario(json, rango))).toEqual([
      { id: 'S0', progresivaM: 0, cotaMm: 99_800 },
      { id: 'S1', progresivaM: 20, cotaMm: 99_950 },
    ])
  })
})

describe('validación de escenarios', () => {
  const conCambios = (cambiar: (j: typeof json) => void) => {
    const copia = structuredClone(json)
    cambiar(copia)
    return validarEscenario(esquemaEscenario.parse(copia), rango)
  }

  it('el escenario de prueba no tiene problemas', () => {
    expect(conCambios(() => {})).toEqual([])
  })

  it('rechaza una estación con más de 2,000 m de desnivel (decisión del 19-oct-2026)', () => {
    expect(conCambios((j) => (j.puntos[2].cota = 103.0))).toContain(
      'Recorrido circuito: la estación E2 visa puntos con más desnivel del que cubre la mira',
    )
  })

  it('exige partir de un PR, continuidad en los puntos de cambio y cierre del circuito', () => {
    expect(conCambios((j) => (j.puntos[0].pr = false))).toContain('Recorrido circuito: debe partir de un PR (parte de A)')
    expect(conCambios((j) => (j.recorridos[0].estaciones[1].visadas[0] = 'A'))).toContain(
      'Recorrido circuito: la estación E2 debe partir del punto de cambio B',
    )
    expect(conCambios((j) => (j.recorridos[0].estaciones[2].visadas = ['D', 'C']))).toContain(
      'Recorrido circuito: es circuito pero termina en C, no en A',
    )
  })

  it('detecta puntos inexistentes y repetidos', () => {
    expect(conCambios((j) => (j.aristas[0].b = 'Z'))).toContain('Arista: el punto Z no existe')
    expect(conCambios((j) => (j.puntos[1].id = 'A'))).toContain('Punto repetido: A')
  })

  it('leerEscenario lanza error con la lista de problemas', () => {
    const malo = structuredClone(json)
    malo.puntos[0].pr = false
    expect(() => leerEscenario(malo, rango)).toThrow(/debe partir de un PR/)
  })
})

describe('escenario del campus UCT (Acto 0)', () => {
  const campus = leerEscenario(campusJson, rango)

  it('es válido y tiene los recorridos de 1.1 y 1.2', () => {
    expect(campus.recorridos.map((r) => r.id)).toEqual(['1.1', '1.2'])
  })

  it('el circuito de 1.2 mide 210 m (45 + 60 + 50 + 55) y se hace en 2 estaciones', () => {
    const lecturas = planificarRecorrido(campus, '1.2', rango, crearRng(1))
    expect(longitudRecorridoM(lecturas)).toBe(210)
    expect(new Set(lecturas.map((l) => l.estacion)).size).toBe(2)
  })

  it('las coordenadas son coherentes con las distancias de las aristas (±0,1 m)', () => {
    for (const a of campus.aristas) {
      const [p, q] = [campus.puntos.find((x) => x.id === a.a)!, campus.puntos.find((x) => x.id === a.b)!]
      expect(Math.abs(Math.hypot(p.x - q.x, p.y - q.y) - a.dist)).toBeLessThan(0.1)
    }
  })

  it('el instrumento queda a una altura creíble sobre el suelo (1,2–1,8 m) en cada estación', () => {
    const control = puntosControl(campus)
    for (let semilla = 1; semilla <= 50; semilla++) {
      for (const r of campus.recorridos) {
        const lecturas = planificarRecorrido(campus, r.id, rango, crearRng(semilla))
        for (const est of r.estaciones) {
          const lt = lecturas.find((l) => l.estacion === est.id && l.tipo === 'LT')!
          const colimacion = cotaVerdaderaMm(campus, lt.punto) + lt.verdaderaMm
          const altura = colimacion - alturaTerrenoMm(control, est.x, est.y)
          expect(altura).toBeGreaterThanOrEqual(1200)
          expect(altura).toBeLessThanOrEqual(1800)
        }
      }
    }
  })
})

describe('lecturas planificadas de un recorrido', () => {
  const e = leerEscenario(json, rango)
  const lecturas = planificarRecorrido(e, 'circuito', rango, crearRng(21))

  it('sigue el orden de las visadas: LT al comienzo de cada estación y luego LA', () => {
    expect(lecturas.map((l) => `${l.estacion}:${l.tipo}:${l.punto}`)).toEqual([
      'E1:LT:A',
      'E1:LA:B',
      'E2:LT:B',
      'E2:LA:C',
      'E2:LA:D',
      'E3:LT:D',
      'E3:LA:A',
    ])
    expect(longitudRecorridoM(lecturas)).toBe(210)
  })

  it('todas las lecturas caen en 0,500–2,500 m y no exponen la colimación', () => {
    for (const l of lecturas) {
      expect(l.verdaderaMm).toBeGreaterThanOrEqual(500)
      expect(l.verdaderaMm).toBeLessThanOrEqual(2500)
      expect(Object.keys(l).sort()).toEqual(
        l.tipo === 'LT' ? ['estacion', 'punto', 'tipo', 'verdaderaMm'] : ['distanciaM', 'estacion', 'punto', 'tipo', 'verdaderaMm'],
      )
    }
  })

  it('con las lecturas verdaderas la libreta reproduce las cotas y el circuito cierra en 0', () => {
    const visadas = lecturas.map((l) => ({ ...l, lecturaMm: l.verdaderaMm }))
    const { filas, problemas } = calcularLibreta(visadas, 100_000)
    expect(problemas).toEqual([])
    expect(filas.filter((f) => f.tipo === 'LA').map((f) => f.cotaMm)).toEqual([100_850, 101_420, 100_630, 100_000])
    expect(sumaDesnivelesMm(filas)).toBe(0)
  })
})
