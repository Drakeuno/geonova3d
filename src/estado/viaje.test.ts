import { beforeEach, describe, expect, it } from 'vitest'
import type { MovimientoXp } from '@/motor/puntaje'
import type { Evaluacion } from '@/misiones/tipos'
import { useJuego } from './juego'
import { claveMision, estadoVisible, useViaje } from './viaje'

const evaluacion = (aprobada: boolean): Evaluacion => ({
  aprobada,
  criterios: [],
  motivo: aprobada ? null : 'cota',
  desempeno: { lecturasExactas: 0, sinErroresRegistro: true },
})
const recompensa: MovimientoXp[] = [{ tipo: 'mision', xp: 100, ambito: 'individual', misionId: '1.1' }]
const v = () => useViaje.getState()

describe('avance del viaje (§14)', () => {
  beforeEach(() => {
    useViaje.setState({ viajes: {}, intentos: {}, evaluaciones: {}, todasAbiertas: false })
    useJuego.setState({ movimientos: {} })
  })

  it('al abrir la 1.1 queda en curso, con un intento y su semilla', () => {
    v().comenzar('u', '1.1')
    expect(v().viajes.u['1.1'].estado).toBe('en_curso')
    expect(v().viajes.u['1.2'].estado).toBe('bloqueada')
    expect(v().intentos[claveMision('u', '1.1')]).toMatchObject({ numero: 1, niveladas: {} })
  })

  it('una entrega fallida deja la misión por reintentar y suma una falla; al volver, sigue el mismo intento', () => {
    v().comenzar('u', '1.1')
    const semilla = v().intentos['u:1.1'].semilla
    expect(v().resolverEntrega('u', '1.1', evaluacion(false), recompensa)).toBe(false)
    expect(v().viajes.u['1.1']).toMatchObject({ estado: 'a_reintentar', fallas: 1 })
    v().comenzar('u', '1.1')
    expect(v().viajes.u['1.1'].estado).toBe('en_curso')
    expect(v().intentos['u:1.1'].semilla).toBe(semilla)
  })

  it('la primera aprobación otorga el XP y desbloquea la siguiente; las demás no repiten recompensa', () => {
    v().comenzar('u', '1.1')
    expect(v().resolverEntrega('u', '1.1', evaluacion(true), recompensa)).toBe(true)
    expect(v().viajes.u['1.1'].estado).toBe('aprobada')
    expect(v().viajes.u['1.2'].estado).toBe('disponible')
    expect(useJuego.getState().movimientos.u).toEqual(recompensa)

    v().nuevoIntento('u', '1.1')
    expect(v().intentos['u:1.1'].numero).toBe(2)
    expect(v().resolverEntrega('u', '1.1', evaluacion(true), recompensa)).toBe(false)
    expect(useJuego.getState().movimientos.u).toHaveLength(1)
    expect(v().evaluaciones['u:1.1'].recompensa).toEqual([])
  })

  it('el interruptor docente abre las misiones bloqueadas', () => {
    expect(estadoVisible(undefined, false)).toBe('bloqueada')
    v().alternarTodasAbiertas()
    v().comenzar('u', '1.3')
    expect(v().viajes.u['1.3'].estado).toBe('en_curso')
    expect(estadoVisible(v().viajes.u['1.2'], true)).toBe('disponible')
    expect(estadoVisible(v().viajes.u['1.2'], false)).toBe('bloqueada')
  })
})
