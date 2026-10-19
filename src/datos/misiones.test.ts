import { describe, expect, it } from 'vitest'
import { MISIONES, type Ra } from './misiones'

describe('catálogo de misiones', () => {
  it('tiene las 9 misiones jugables, sin ids repetidos', () => {
    const ids = MISIONES.map((m) => m.id)
    expect(ids).toEqual(['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3'])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('cada misión cae en el acto que indica su número', () => {
    const actoPorPrefijo: Record<string, number> = { '1': 0, '2': 2, '3': 3 }
    for (const m of MISIONES) expect(m.acto).toBe(actoPorPrefijo[m.id[0]])
  })

  it('la tabla de RA coincide con la §4 de la especificación', () => {
    const porRa = (ra: Ra) => MISIONES.filter((m) => m.ra.includes(ra)).map((m) => m.id)
    expect(porRa('RA1')).toEqual(['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.3'])
    expect(porRa('RA2')).toEqual(['2.2', '3.1', '3.3'])
    expect(porRa('RA3')).toEqual(['1.3', '2.3', '3.2', '3.3'])
  })

  it('las insignias grupales son la cooperativa (2.3) y la integradora (3.3)', () => {
    expect(MISIONES.filter((m) => m.insignia.grupal).map((m) => m.id)).toEqual(['2.3', '3.3'])
  })
})
