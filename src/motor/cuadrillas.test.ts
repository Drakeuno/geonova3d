import { describe, expect, it } from 'vitest'
import parametrosJson from '../../public/datos/parametros.json'
import cuadrillasJson from '../../public/datos/cuadrillas.json'
import { esquemaParametros } from '@/datos/parametros'
import { esquemaCuadrillas } from '@/datos/cuadrillas'
import { MISIONES } from '@/datos/misiones'
import {
  ayudaSimulada,
  buscarIntegrante,
  calcularCurso,
  proximoCambio,
  puedeAyudar,
  type AvanceJugador,
  type AyudaRegistrada,
  type DesempenoAprobacion,
} from './cuadrillas'
import { recompensaPorAprobacion, type MovimientoXp } from './puntaje'

const xp = esquemaParametros.parse(parametrosJson).xp
const roster = esquemaCuadrillas.parse(cuadrillasJson)
const ORDEN = MISIONES.map((m) => m.id)
const T0 = 1_000_000
const seg = (s: number) => T0 + s * 1000

/** Avance de Camila con las misiones dadas aprobadas, y el XP que le habría dado cada una. */
function avance(ids: string[], desempeno: Record<string, DesempenoAprobacion> = {}): AvanceJugador {
  const aprobadas = Object.fromEntries(ids.map((id) => [id, desempeno[id] ?? { lecturasExactas: 0 }]))
  const movimientos: MovimientoXp[] = ids.flatMap((id) =>
    recompensaPorAprobacion({ mision: MISIONES.find((m) => m.id === id)!, ...aprobadas[id] }, xp),
  )
  return { aprobadas, movimientos }
}

const curso = (ids: string[] = [], ayudas: AyudaRegistrada[] = [], ahora = T0, desempeno?: Record<string, DesempenoAprobacion>) =>
  calcularCurso({ roster, misiones: MISIONES, xp, jugadores: { 'est-1': avance(ids, desempeno) }, ayudas, ahora })

const integrante = (c: ReturnType<typeof curso>, id: string) => buscarIntegrante(c, id)!.integrante
const cuadrilla = (c: ReturnType<typeof curso>, id: string) => c.cuadrillas.find((x) => x.id === id)!
const ayudar = (companeroId: string, misionId: string, enviadaEn = T0) =>
  ayudaSimulada('est-1', companeroId, misionId, 'Revisa que LT − LA tenga el signo correcto en cada postura.', enviadaEn, roster.simulacion)

describe('curso simulado (RF-06, RF-10)', () => {
  it('cada cuadrilla tiene 3 o 4 integrantes y Camila está en la Cuadrilla 1', () => {
    for (const c of roster.cuadrillas) expect(c.integrantes.length).toBeGreaterThanOrEqual(3)
    expect(buscarIntegrante(curso(), 'est-1')?.cuadrilla.nombre).toBe('Cuadrilla 1')
  })

  it('el XP de un compañero simulado sale de las mismas reglas que el del jugador (§6.2)', () => {
    // Fernanda: 1.1 = 100 + 2·100 + 50; 1.2 = 100 + 4·100 + 200 (|e| = 3 mm); 1.3 = 100 + 7·100.
    expect(integrante(curso(), 'c5-fernanda').xp).toBe(350 + 700 + 800)
    // Las tachaduras restan 20 cada una.
    const joaquin = integrante(curso(), 'c4-joaquin')
    expect(joaquin.movimientos.filter((m) => m.tipo === 'penalizacion-tachadura')).toHaveLength(3)
  })

  it('puntaje de cuadrilla = promedio de XP individual + bonus grupal', () => {
    const c2 = cuadrilla(curso(), 'c2')
    const promedio = c2.integrantes.reduce((s, i) => s + i.xp, 0) / c2.integrantes.length
    // 2.3: 150 + 100 cooperativo; 3.3: 300 + 200 de precisión (|e| = 3 mm < 5).
    expect(c2.bonusXp).toBe(250 + 500)
    expect(c2.puntos).toBe(Math.round(promedio) + 750)
    expect(c2.promedioXp).toBe(Math.round(promedio))
  })

  it('% precisión del Ñielol con el cierre de la 3.3: máx(0, 100·(1 − |e|/T))', () => {
    const c = curso()
    expect(cuadrilla(c, 'c2').precisionNielolPct).toBeCloseTo(100 * (1 - 3 / 8.92), 6)
    expect(cuadrilla(c, 'c3').precisionNielolPct).toBeNull()
  })

  it('la cuadrilla completa una misión cuando la aprueban todos; las grupales, la cuadrilla', () => {
    const c = curso()
    expect(cuadrilla(c, 'c2').completadas).toEqual(ORDEN)
    // Cuadrilla 3: Martina sigue en la 3.1; la 2.3 la aprobaron juntos.
    expect(cuadrilla(c, 'c3').completadas).toEqual(['1.1', '1.2', '1.3', '2.1', '2.2', '2.3'])
  })

  it('cuenta las insignias de cada integrante, las grupales una vez', () => {
    const c4 = cuadrilla(curso(), 'c4')
    // 4 integrantes: 1.1 bronce, 1.2 y 1.3 plata, 2.1 oro; 3 de ellos con la 2.2 (oro).
    expect(c4.insignias).toEqual({ bronce: 4, plata: 8, oro: 7, platino: 0, especial: 0 })
    expect(c4.totalInsignias).toBe(19)
    expect(cuadrilla(curso(), 'c2').insignias.platino).toBe(1)
  })

  it('la clasificación ordena por puntos; al empezar, la cuadrilla de Camila va última', () => {
    const c = curso()
    expect(c.clasificacion.map((f) => f.id)).toEqual(['c2', 'c3', 'c4', 'c5', 'c1'])
    expect(cuadrilla(c, 'c1').puntos).toBe(0)
  })
})

describe('compañeros que siguen al jugador', () => {
  it('aprueban lo mismo que Camila hasta la misión en que se atascan, y ahí piden ayuda', () => {
    const c = curso(['1.1', '1.2', '1.3'])
    const diego = integrante(c, 'c1-diego')
    expect(diego.aprobadas).toEqual(['1.1'])
    expect(diego.situacion).toEqual({ tipo: 'atascado', mision: '1.2' })
    expect(diego.pedido).toMatch(/circuito/)
    expect(integrante(c, 'c1-antonia').situacion).toEqual({ tipo: 'atascado', mision: '1.3' })
    expect(integrante(c, 'c1-matias').situacion).toEqual({ tipo: 'atascado', mision: '2.1' })
    expect(integrante(curso(['1.1', '1.2']), 'c1-matias').situacion).toEqual({ tipo: 'en', mision: '1.3' })
    expect(cuadrilla(c, 'c1').completadas).toEqual(['1.1'])
  })

  it('antes de llegar a su atasco no piden ayuda', () => {
    const diego = integrante(curso([]), 'c1-diego')
    expect(diego.situacion).toEqual({ tipo: 'en', mision: '1.1' })
    expect(diego.pedido).toBeNull()
  })

  it('reciben el XP de las misiones grupales que aprueba la cuadrilla con sus propias lecturas exactas', () => {
    const c = curso(['1.1', '1.2', '1.3', '2.1', '2.2', '2.3'])
    const matias = integrante(c, 'c1-matias')
    expect(matias.insignias).toContain('2.3')
    expect(matias.movimientos.some((m) => m.misionId === '2.3' && m.tipo === 'lecturas-exactas' && m.xp === 400)).toBe(true)
    // El XP de la misión grupal va una sola vez a la cuadrilla.
    expect(cuadrilla(c, 'c1').bonusXp).toBe(250)
  })
})

describe('ayuda entre compañeros (§14)', () => {
  it('sin aprobar la misión no se puede ayudar; tras enviar, no se repite', () => {
    const sinAprobar = curso(['1.1'])
    expect(puedeAyudar(sinAprobar, [], 'est-1', 'c1-diego')).toEqual({ ok: false, motivo: 'sin-aprobar', mision: '1.2' })
    const c = curso(['1.1', '1.2'])
    expect(puedeAyudar(c, [], 'est-1', 'c1-diego')).toEqual({ ok: true, mision: '1.2' })
    expect(puedeAyudar(c, [ayudar('c1-diego', '1.2')], 'est-1', 'c1-diego')).toMatchObject({ ok: false, motivo: 'ya-enviada' })
    expect(puedeAyudar(c, [], 'est-1', 'c1-matias')).toMatchObject({ ok: false, motivo: 'no-atascado' })
  })

  it('vale cuando el compañero acepta y aprueba esa misión; antes no cuenta', () => {
    const ayudas = [ayudar('c1-diego', '1.2')]
    const en = (s: number) => curso(['1.1', '1.2', '1.3'], ayudas, seg(s))
    expect(en(1).ayudas[ayudas[0].id]).toBe('enviada')
    expect(en(roster.simulacion.aceptaTrasSegundos).ayudas[ayudas[0].id]).toBe('aceptada')
    expect(integrante(en(roster.simulacion.aceptaTrasSegundos), 'c1-diego').situacion.tipo).toBe('atascado')
    expect(integrante(en(roster.simulacion.aceptaTrasSegundos), 'est-1').ayudados).toBe(0)

    const despues = en(roster.simulacion.apruebaTrasSegundos)
    expect(despues.ayudas[ayudas[0].id]).toBe('valida')
    // Destrabado, Diego vuelve a seguir a Camila.
    expect(integrante(despues, 'c1-diego').aprobadas).toEqual(['1.1', '1.2', '1.3'])
    expect(integrante(despues, 'est-1').ayudados).toBe(1)
    expect(cuadrilla(despues, 'c1').completadas).toEqual(['1.1', '1.2'])
  })

  it('+50 XP a la cuadrilla solo por ayuda válida a otra cuadrilla', () => {
    const tarde = seg(roster.simulacion.apruebaTrasSegundos)
    const c = curso(['1.1', '1.2', '1.3'], [ayudar('c1-diego', '1.2'), ayudar('c5-constanza', '1.3')], tarde)
    expect(cuadrilla(c, 'c1').movimientos).toEqual([{ tipo: 'bonus-ayuda', xp: 50, ambito: 'cuadrilla', misionId: '1.3' }])
    // Constanza aprueba la 1.3 y su cuadrilla la completa.
    expect(cuadrilla(c, 'c5').completadas).toEqual(['1.1', '1.2', '1.3'])
  })

  it('insignia especial: las 9 insignias y 3 compañeros ayudados', () => {
    const tarde = seg(roster.simulacion.apruebaTrasSegundos)
    const ayudas = [ayudar('c1-diego', '1.2'), ayudar('c1-antonia', '1.3'), ayudar('c5-constanza', '1.3')]
    expect(integrante(curso(ORDEN, ayudas.slice(0, 2), tarde), 'est-1').especial).toBe(false)
    expect(integrante(curso(ORDEN.slice(0, -1), ayudas, tarde), 'est-1').especial).toBe(false)
    const c = curso(ORDEN, ayudas, tarde)
    expect(integrante(c, 'est-1')).toMatchObject({ ayudados: 3, especial: true })
    expect(cuadrilla(c, 'c1').insignias.especial).toBe(1)
  })

  it('el reloj despierta en la próxima aceptación o aprobación pendiente', () => {
    const ayudas = [ayudar('c1-diego', '1.2')]
    expect(proximoCambio(ayudas, T0)).toBe(ayudas[0].aceptadaEn)
    expect(proximoCambio(ayudas, ayudas[0].aceptadaEn!)).toBe(ayudas[0].apruebaEn)
    expect(proximoCambio(ayudas, ayudas[0].apruebaEn!)).toBeNull()
  })
})

describe('cuadrilla del jugador', () => {
  it('su % de precisión del Ñielol sale de la primera aprobación de la 3.3', () => {
    const c = curso(ORDEN, [], T0, { '3.3': { lecturasExactas: 28, errorCierreMm: -2, toleranciaCierreMm: 8 } })
    expect(cuadrilla(c, 'c1').precisionNielolPct).toBe(75)
    // Sin la tolerancia (aprobaciones anteriores a F7) no se inventa el dato.
    expect(cuadrilla(curso(ORDEN, [], T0, { '3.3': { lecturasExactas: 0, errorCierreMm: -2 } }), 'c1').precisionNielolPct).toBeNull()
  })

  it('con el viaje completo y buenas lecturas, la Cuadrilla 1 sube en la tabla', () => {
    const exactas = { '1.1': 2, '1.2': 6, '1.3': 10, '2.1': 9, '2.2': 9, '2.3': 8, '3.3': 28 } as Record<string, number>
    const desempeno = Object.fromEntries(ORDEN.map((id) => [id, { lecturasExactas: exactas[id] ?? 0, errorCierreMm: 1, toleranciaCierreMm: 8.92 }]))
    const c = curso(ORDEN, [], T0, desempeno)
    const posicion = c.clasificacion.findIndex((f) => f.id === 'c1')
    expect(posicion).toBeLessThan(4)
    // Sin ayudar a nadie: Diego, Antonia y Matías quedan en sus atascos.
    expect(cuadrilla(c, 'c1').completadas).toEqual(['1.1', '2.3', '3.3'])
  })
})
