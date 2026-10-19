import { describe, expect, it } from 'vitest'
import { MISIONES } from '@/datos/misiones'
import { abrirTodas, entregar, estaAprobada, iniciar, ofrecePista, resolver, TransicionInvalida, viajeInicial } from './progreso'

const ORDEN = MISIONES.map((m) => m.id)

const jugar = (viaje: ReturnType<typeof viajeInicial>, id: string, aprobada: boolean, ahora = 1) =>
  resolver(entregar(iniciar(viaje, id), id), ORDEN, id, aprobada, ahora)

describe('estados de misión (§14)', () => {
  it('el viaje parte con la 1.1 disponible y el resto bloqueado', () => {
    const v = viajeInicial(ORDEN)
    expect(v['1.1'].estado).toBe('disponible')
    expect(ORDEN.slice(1).every((id) => v[id].estado === 'bloqueada')).toBe(true)
  })

  it('disponible → en_curso → en_evaluación → aprobada, y desbloquea la siguiente', () => {
    let v = iniciar(viajeInicial(ORDEN), '1.1')
    expect(v['1.1'].estado).toBe('en_curso')
    v = entregar(v, '1.1')
    expect(v['1.1'].estado).toBe('en_evaluacion')
    const r = resolver(v, ORDEN, '1.1', true, 1000)
    expect(r.otorgaRecompensa).toBe(true)
    expect(r.viaje['1.1']).toEqual({ estado: 'aprobada', fallas: 0, aprobadaEn: 1000 })
    expect(r.viaje['1.2'].estado).toBe('disponible')
  })

  it('rechaza transiciones que no corresponden', () => {
    const v = viajeInicial(ORDEN)
    expect(() => iniciar(v, '1.2')).toThrow(TransicionInvalida)
    expect(() => entregar(v, '1.1')).toThrow(TransicionInvalida)
    expect(() => resolver(v, ORDEN, '1.1', true, 1)).toThrow(TransicionInvalida)
    expect(() => iniciar(v, '9.9')).toThrow(TransicionInvalida)
  })

  it('XP e insignias solo en la primera aprobación; volver a jugar no las repite', () => {
    const primera = jugar(viajeInicial(ORDEN), '1.1', true, 100)
    const replay = jugar(primera.viaje, '1.1', true, 200)
    expect(replay.otorgaRecompensa).toBe(false)
    expect(replay.viaje['1.1'].aprobadaEn).toBe(100)
  })

  it('fallar al volver a jugar una misión aprobada no le quita la aprobación', () => {
    const primera = jugar(viajeInicial(ORDEN), '1.1', true, 100)
    const fallida = jugar(primera.viaje, '1.1', false)
    expect(fallida.viaje['1.1'].estado).toBe('a_reintentar')
    expect(estaAprobada(fallida.viaje['1.1'])).toBe(true)
  })

  it('el interruptor docente abre todas las misiones bloqueadas', () => {
    const v = abrirTodas(viajeInicial(ORDEN))
    expect(ORDEN.every((id) => v[id].estado === 'disponible')).toBe(true)
  })
})

describe('CP-04 · decisión incorrecta en la 2.1', () => {
  it('se rechaza, se puede reintentar y tras 2 entregas fallidas hay pista', () => {
    let v = abrirTodas(viajeInicial(ORDEN))
    v = jugar(v, '2.1', false).viaje
    expect(v['2.1']).toMatchObject({ estado: 'a_reintentar', fallas: 1 })
    expect(ofrecePista(v['2.1'])).toBe(false)
    v = jugar(v, '2.1', false).viaje
    expect(ofrecePista(v['2.1'])).toBe(true)
    const r = jugar(v, '2.1', true)
    expect(r.viaje['2.1'].estado).toBe('aprobada')
    expect(r.otorgaRecompensa).toBe(true)
  })
})
