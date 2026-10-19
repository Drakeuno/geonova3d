import { describe, expect, it } from 'vitest'
import parametrosJson from '../../public/datos/parametros.json'
import { esquemaParametros } from '@/datos/parametros'
import { MISIONES } from '@/datos/misiones'
import {
  bonusAyuda,
  clasificar,
  companerosAyudados,
  cumpleInsigniaEspecial,
  penalizacionTachadura,
  precisionNielolPct,
  puntajeCuadrilla,
  recompensaPorAprobacion,
  xpIndividual,
  type MovimientoXp,
} from './puntaje'

const xp = esquemaParametros.parse(parametrosJson).xp
const mision = (id: string) => MISIONES.find((m) => m.id === id)!
const total = (movs: MovimientoXp[]) => movs.reduce((s, m) => s + m.xp, 0)

describe('recompensa por misión aprobada (§6.2)', () => {
  it('1.1: Bronce 100 + 100 por lectura exacta + 50 sin errores de registro', () => {
    const movs = recompensaPorAprobacion({ mision: mision('1.1'), lecturasExactas: 2, sinErroresRegistro: true }, xp)
    expect(movs.map((m) => [m.tipo, m.xp])).toEqual([
      ['mision', 100],
      ['lecturas-exactas', 200],
      ['bonus-primera-sin-errores', 50],
    ])
    expect(movs.every((m) => m.ambito === 'individual')).toBe(true)
  })

  it('1.2: bonus de precisión +200 si |e| < 5 mm y +100 si < 10 mm', () => {
    const conError = (e: number) => total(recompensaPorAprobacion({ mision: mision('1.2'), lecturasExactas: 0, errorCierreMm: e }, xp))
    expect(conError(-4)).toBe(300)
    expect(conError(5)).toBe(200)
    expect(conError(-9)).toBe(200)
    expect(conError(10)).toBe(100)
  })

  it('el bonus de precisión solo corre en las misiones de circuito', () => {
    expect(total(recompensaPorAprobacion({ mision: mision('2.1'), lecturasExactas: 0, errorCierreMm: 0 }, xp))).toBe(150)
  })

  it('2.3: 250 XP a la cuadrilla (Oro 150 + bonus cooperativo 100, decisión del 19-oct-2026)', () => {
    const movs = recompensaPorAprobacion({ mision: mision('2.3'), lecturasExactas: 0 }, xp)
    expect(total(movs)).toBe(250)
    expect(movs.every((m) => m.ambito === 'cuadrilla')).toBe(true)
  })

  it('3.3: integrador 300 a la cuadrilla; las lecturas exactas son de cada persona', () => {
    const movs = recompensaPorAprobacion({ mision: mision('3.3'), lecturasExactas: 3, errorCierreMm: 3 }, xp)
    expect(movs.map((m) => [m.tipo, m.xp, m.ambito])).toEqual([
      ['mision', 300, 'cuadrilla'],
      ['lecturas-exactas', 300, 'individual'],
      ['bonus-precision', 200, 'cuadrilla'],
    ])
  })
})

describe('penalizaciones y XP individual', () => {
  it('cada tachadura forzada resta 20 XP', () => {
    expect(penalizacionTachadura(xp, '1.2')).toEqual({ tipo: 'penalizacion-tachadura', xp: -20, ambito: 'individual', misionId: '1.2' })
  })

  it('el XP individual no baja de cero y no incluye lo grupal', () => {
    expect(xpIndividual([penalizacionTachadura(xp), penalizacionTachadura(xp)])).toBe(0)
    expect(xpIndividual([{ tipo: 'mision', xp: 100, ambito: 'individual' }, bonusAyuda(xp), penalizacionTachadura(xp)])).toBe(80)
  })
})

describe('puntaje de cuadrilla (RF-06)', () => {
  it('promedio de XP individuales + bonus grupales', () => {
    const grupales = [...recompensaPorAprobacion({ mision: mision('2.3'), lecturasExactas: 0 }, xp), bonusAyuda(xp)]
    expect(puntajeCuadrilla([300, 420, 380], grupales)).toBe(367 + 300)
    expect(puntajeCuadrilla([300, 420, 380, 500], [])).toBe(400)
  })

  it('solo admite cuadrillas de 3 o 4', () => {
    expect(() => puntajeCuadrilla([100, 200], [])).toThrow(RangeError)
    expect(() => puntajeCuadrilla([1, 2, 3, 4, 5], [])).toThrow(RangeError)
  })
})

describe('tabla de clasificación e insignia especial (§14)', () => {
  it('% precisión Ñielol = máx(0, 100 · (1 − |e|/T))', () => {
    expect(precisionNielolPct(-2, 8)).toBe(75)
    expect(precisionNielolPct(0, 8)).toBe(100)
    expect(precisionNielolPct(10, 8)).toBe(0)
  })

  it('ordena por puntos y desempata por misiones, insignias y precisión', () => {
    const fila = (id: string, puntos: number, misiones: number, insignias: number, precision: number | null) => ({
      id,
      nombre: id,
      puntos,
      misionesCompletadas: misiones,
      insignias,
      precisionNielolPct: precision,
    })
    const orden = clasificar([
      fila('c1', 900, 5, 5, null),
      fila('c2', 1200, 6, 6, 80),
      fila('c3', 900, 5, 5, 60),
      fila('c4', 900, 6, 4, null),
    ]).map((f) => f.id)
    expect(orden).toEqual(['c2', 'c4', 'c3', 'c1'])
  })

  it('ayuda válida = mensaje aceptado + el compañero aprobó esa misión; cuenta compañeros distintos', () => {
    const ayudas = [
      { ayudanteId: 'yo', companeroId: 'p1', misionId: '1.2', aceptada: true },
      { ayudanteId: 'yo', companeroId: 'p1', misionId: '1.3', aceptada: true },
      { ayudanteId: 'yo', companeroId: 'p2', misionId: '1.2', aceptada: false },
      { ayudanteId: 'yo', companeroId: 'p3', misionId: '2.1', aceptada: true },
      { ayudanteId: 'otro', companeroId: 'p4', misionId: '1.2', aceptada: true },
    ]
    const aprobaciones = [
      { usuarioId: 'p1', misionId: '1.2' },
      { usuarioId: 'p1', misionId: '1.3' },
      { usuarioId: 'p2', misionId: '1.2' },
      { usuarioId: 'p4', misionId: '1.2' },
    ]
    expect(companerosAyudados('yo', ayudas, aprobaciones)).toBe(1)
  })

  it('la insignia especial exige todas las insignias y 3 compañeros ayudados', () => {
    const todas = MISIONES.map((m) => m.id)
    expect(cumpleInsigniaEspecial(todas, todas, 3)).toBe(true)
    expect(cumpleInsigniaEspecial(todas, todas, 2)).toBe(false)
    expect(cumpleInsigniaEspecial(todas.slice(1), todas, 5)).toBe(false)
  })
})
