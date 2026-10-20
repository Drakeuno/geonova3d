import { describe, expect, it } from 'vitest'
import parametrosJson from '../../public/datos/parametros.json'
import cuadrillasJson from '../../public/datos/cuadrillas.json'
import { esquemaCuadrillas } from '@/datos/cuadrillas'
import { MISIONES } from '@/datos/misiones'
import { esquemaParametros } from '@/datos/parametros'
import { aCsv } from '@/componentes/docente/csv'
import { buscarIntegrante, calcularCurso } from './cuadrillas'
import { viajeInicial, type Viaje } from './progreso'
import { alertas, celda } from './seguimiento'

const xp = esquemaParametros.parse(parametrosJson).xp
const roster = esquemaCuadrillas.parse(cuadrillasJson)
const mision = (id: string) => MISIONES.find((m) => m.id === id)!

// Camila: 1.1 a 3.1 aprobadas, la 3.2 en evaluación ante la comisión, y la 1.2 aprobada tras 2 fallas.
const viaje: Viaje = viajeInicial(MISIONES.map((m) => m.id))
for (const id of ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1']) viaje[id] = { estado: 'aprobada', fallas: id === '1.2' ? 2 : 0, aprobadaEn: 1 }
viaje['3.2'] = { estado: 'en_evaluacion', fallas: 0, aprobadaEn: null }
const aprobadas = Object.fromEntries(['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1'].map((id) => [id, { lecturasExactas: 0 }]))
const curso = calcularCurso({ roster, misiones: MISIONES, xp, jugadores: { 'est-1': { aprobadas, movimientos: [] } }, ayudas: [], ahora: 0 })
const de = (id: string) => buscarIntegrante(curso, id)!

describe('seguimiento por cuadrilla (RF-08)', () => {
  it('del jugador muestra su viaje: aprobadas (con sus fallas), en evaluación y pendientes', () => {
    const { cuadrilla, integrante } = de('est-1')
    expect(celda(integrante, cuadrilla, mision('1.2'), viaje)).toEqual({ estado: 'aprobada', fallas: 2 })
    expect(celda(integrante, cuadrilla, mision('3.2'), viaje)).toEqual({ estado: 'en_evaluacion', fallas: 0 })
    expect(celda(integrante, cuadrilla, mision('3.3'), viaje)).toEqual({ estado: 'pendiente', fallas: 0 })
  })

  it('una entrega rechazada queda por reintentar, con sus fallas', () => {
    const conFallas: Viaje = { ...viaje, '3.3': { estado: 'a_reintentar', fallas: 3, aprobadaEn: null } }
    const { cuadrilla, integrante } = de('est-1')
    expect(celda(integrante, cuadrilla, mision('3.3'), conFallas)).toEqual({ estado: 'a_reintentar', fallas: 3 })
  })

  it('de los simulados: aprobadas, atascados y la misión en curso; las grupales las aprueba la cuadrilla', () => {
    const diego = de('c1-diego')
    expect(celda(diego.integrante, diego.cuadrilla, mision('1.1'), undefined).estado).toBe('aprobada')
    expect(celda(diego.integrante, diego.cuadrilla, mision('1.2'), undefined).estado).toBe('atascado')
    // La 2.3 la aprobó la cuadrilla (con Camila), aunque Diego siga en la 1.2.
    expect(celda(diego.integrante, diego.cuadrilla, mision('2.3'), undefined).estado).toBe('aprobada')
    const sebastian = de('c4-sebastian')
    expect(celda(sebastian.integrante, sebastian.cuadrilla, mision('2.3'), undefined).estado).toBe('en_curso')
  })

  it('avisa primero las defensas, luego las pistas y los pedidos de ayuda', () => {
    const conPista: Viaje = { ...viaje, '3.3': { estado: 'a_reintentar', fallas: 2, aprobadaEn: null } }
    const lista = alertas(curso, MISIONES, { 'est-1': conPista }, 2)
    expect(lista.slice(0, 2)).toMatchObject([
      { motivo: 'defensa', misionId: '3.2' },
      { motivo: 'pista', misionId: '3.3', fallas: 2 },
    ])
    expect(lista.slice(2).every((a) => a.motivo === 'atascado')).toBe(true)
    const conDefensa = alertas(curso, MISIONES, { 'est-1': viaje }, 2)
    expect(conDefensa[0]).toMatchObject({ motivo: 'defensa', misionId: '3.2' })
    expect(conDefensa.filter((a) => a.motivo === 'atascado').map((a) => `${a.integrante.id}@${a.misionId}`)).toEqual([
      'c1-diego@1.2',
      'c1-antonia@1.3',
      'c1-matias@2.1',
      'c3-martina@3.1',
      'c4-valentina@2.2',
      'c5-constanza@1.3',
    ])
    // Con una sola falla todavía no hay pista.
    expect(alertas(curso, MISIONES, { 'est-1': { ...viaje, '3.3': { estado: 'a_reintentar', fallas: 1, aprobadaEn: null } } }, 2).some((a) => a.motivo === 'pista')).toBe(false)
  })
})

describe('CSV del seguimiento', () => {
  it('entrecomilla las celdas con coma, comilla o salto de línea (RFC 4180)', () => {
    expect(aCsv(['Nombre', 'XP'], [['Reyes, Camila', 2350], ['Dice "hola"', null]])).toBe('Nombre,XP\r\n"Reyes, Camila",2350\r\n"Dice ""hola""",')
  })
})
