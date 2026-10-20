import { describe, expect, it } from 'vitest'
import agua from '../../public/datos/escenarios/rural-red-del-agua.json'
import pehuen from '../../public/datos/escenarios/rural-pehuen.json'
import ceroCota from '../../public/datos/escenarios/rural-cero-cota.json'
import estanque from '../../public/datos/escenarios/rural-estanque.json'
import conduccion from '../../public/datos/escenarios/rural-conduccion.json'
import { crearRng } from './azar'
import { abastecimientoSuficiente, cotaOptimaTanqueMm, decidirAgua, evaluarTransitable, planoAlterado, viviendasBajoLinea } from './decisiones'
import { pendientePct, toleranciaCierreMm } from './desniveles'
import { cotaVerdaderaMm, distanciaEntre, leerEscenario, longitudRecorridoM, planificarRecorrido, puntosControl } from './escenarios'
import { rangoDesdeParametros } from './lecturas'
import { aMm } from './numeros'
import { alturaTerrenoMm } from './terreno'

// Terrenos del Acto 2 (F5). Las cotas se bajaron para que cada postura salve ≤ 2,0 m (decisión del
// 19-oct-2026): con lecturas de 0,500–2,500 m, la mira no alcanza más.

const rango = rangoDesdeParametros({ minimaM: 0.5, maximaM: 2.5 })
const escenarios = {
  agua: leerEscenario(agua, rango),
  pehuen: leerEscenario(pehuen, rango),
  ceroCota: leerEscenario(ceroCota, rango),
  estanque: leerEscenario(estanque, rango),
  conduccion: leerEscenario(conduccion, rango),
}
const cota = (e: keyof typeof escenarios, id: string) => cotaVerdaderaMm(escenarios[e], id)

describe('terrenos del Acto 2', () => {
  it('el instrumento queda a una altura creíble (1,2–1,8 m) en todas las posturas', () => {
    for (const e of Object.values(escenarios)) {
      const control = puntosControl(e)
      for (let semilla = 1; semilla <= 40; semilla++) {
        for (const r of e.recorridos) {
          const lecturas = planificarRecorrido(e, r.id, rango, crearRng(semilla))
          for (const est of r.estaciones) {
            const lt = lecturas.find((l) => l.estacion === est.id && l.tipo === 'LT')!
            const altura = cotaVerdaderaMm(e, lt.punto) + lt.verdaderaMm - alturaTerrenoMm(control, est.x, est.y)
            expect(altura, `${e.escenario} ${r.id} ${est.id}`).toBeGreaterThanOrEqual(1200)
            expect(altura, `${e.escenario} ${r.id} ${est.id}`).toBeLessThanOrEqual(1800)
          }
        }
      }
    }
  })

  it('las distancias de las aristas calzan con las coordenadas (±0,1 m)', () => {
    for (const e of Object.values(escenarios)) {
      for (const a of e.aristas) {
        const [p, q] = [e.puntos.find((x) => x.id === a.a)!, e.puntos.find((x) => x.id === a.b)!]
        expect(Math.abs(Math.hypot(p.x - q.x, p.y - q.y) - a.dist), `${e.escenario} ${a.a}–${a.b}`).toBeLessThan(0.1)
      }
    }
  })
})

describe('2.1 · tres pieles con 3 a 4 posturas (2–3 cambios de estación)', () => {
  it('Red del Agua: fuente ~4 m bajo V4 en 400 m de trazado: hay que bombear', () => {
    const e = escenarios.agua
    expect(e.recorridos[0].estaciones).toHaveLength(4)
    const trazado = ['F', 'V1', 'V2', 'V3', 'V4'].slice(1).reduce((s, id, i, ids) => s + distanciaEntre(e, i === 0 ? 'F' : ids[i - 1], id), 0)
    expect(trazado).toBe(400)
    expect(cota('agua', 'V4') - cota('agua', 'F')).toBe(4031)
    expect(decidirAgua(cota('agua', 'F'), cota('agua', 'V4'), trazado, 0.5).decision).toBe('bombeo')
  })

  it('Camino del Pehuén: solo el tramo K2–K3 pasa de 8 %', () => {
    const ids = ['K0', 'K1', 'K2', 'K3', 'K4']
    const tramos = ids.slice(1).map((id, i) => ({
      tramo: `${ids[i]}–${id}`,
      pendientePct: pendientePct(cota('pehuen', id) - cota('pehuen', ids[i]), distanciaEntre(escenarios.pehuen, ids[i], id)),
    }))
    const r = evaluarTransitable(tramos, 8)
    expect(r.transitable).toBe(false)
    expect(r.excedidos.map((i) => tramos[i].tramo)).toEqual(['K2–K3'])
  })

  it('Operación Cero Cota: C1 y C3 quedan bajo la línea de seguridad (99,500 m)', () => {
    const e = escenarios.ceroCota
    const casas = ['C1', 'C2', 'C3', 'C4'].map((id) => ({ id, cotaMm: cota('ceroCota', id) }))
    expect(viviendasBajoLinea(casas, aMm(e.datos.lineaSeguridad))).toEqual(['C1', 'C3'])
    // La más justa (C3) queda bajo la línea por más que la tolerancia del levantamiento.
    const t = toleranciaCierreMm(longitudRecorridoM(planificarRecorrido(e, '2.1', rango, crearRng(1))))
    expect(aMm(e.datos.lineaSeguridad) - cota('ceroCota', 'C3')).toBeGreaterThan(t)
  })
})

describe('2.2 · estanque elevado con el plano alterado en +3,500 m', () => {
  const e = escenarios.estanque
  const viviendas = ['V1', 'V2', 'V3', 'V4'].map((id) => ({ id, cotaMm: cota('estanque', id) }))
  const real = cota('estanque', 'T') + aMm(e.datos.alturaTorre)

  it('el radier del plano está 3,500 m sobre el real', () => {
    expect(aMm(e.datos.cotaRadierPlano) - cota('estanque', 'T')).toBe(3500)
    expect(planoAlterado(aMm(e.datos.cotaRadierPlano), cota('estanque', 'T'), 7)).toBe(true)
  })

  it('con el estanque real, las viviendas más alejadas (V2 y V3) no llegan a 10 m.c.a.', () => {
    expect(viviendas.filter((v) => real - v.cotaMm < 10_000).map((v) => v.id)).toEqual(['V2', 'V3'])
    // En el plano, en cambio, todas llegaban: por eso el proyecto anterior lo dio por bueno.
    expect(abastecimientoSuficiente(real + 3500, viviendas, 10)).toBe(true)
  })

  it('la cota óptima es 110,980 m: máx(Vᵢ) + 10', () => {
    expect(cotaOptimaTanqueMm(viviendas.map((v) => v.cotaMm), 10)).toBe(110_980)
    expect(abastecimientoSuficiente(110_980, viviendas, 10)).toBe(true)
  })
})

describe('2.3 · línea de conducción de 400 m con M al medio', () => {
  const e = escenarios.conduccion

  it('cada cuadrilla va y vuelve por su tramo (400 m), en 4 posturas, y vuelve a su cota conocida', () => {
    for (const id of ['2.3-A', '2.3-B']) {
      const lecturas = planificarRecorrido(e, id, rango, crearRng(9))
      expect(longitudRecorridoM(lecturas)).toBe(400)
      expect(lecturas.filter((l) => l.tipo === 'LA').map((l) => l.punto)).toEqual(id.endsWith('A') ? ['P1', 'M', 'P1', 'C'] : ['Q1', 'M', 'Q1', 'R'])
    }
    expect(distanciaEntre(e, 'C', 'M')).toBe(200)
    expect(distanciaEntre(e, 'R', 'M')).toBe(200)
  })
})
