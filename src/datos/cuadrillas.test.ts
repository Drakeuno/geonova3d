import { describe, expect, it } from 'vitest'
import cuadrillasJson from '../../public/datos/cuadrillas.json'
import { esquemaCuadrillas } from './cuadrillas'
import { USUARIOS_DEMO } from './usuariosDemo'

/** El JSON tal como se edita, sin validar, para romperlo a propósito. */
type Crudo = {
  cuadrillas: { grupales?: Record<string, object>; integrantes: { id: string; aprobadas?: string[]; atasco?: { mision: string } }[] }[]
}
const copia = () => structuredClone(cuadrillasJson) as unknown as Crudo
const errores = (datos: unknown) => {
  const r = esquemaCuadrillas.safeParse(datos)
  return r.success ? [] : r.error.issues.map((i) => i.message)
}

describe('roster del curso (public/datos/cuadrillas.json)', () => {
  it('es válido y cada jugador es un estudiante de la demo', () => {
    const roster = esquemaCuadrillas.parse(cuadrillasJson)
    const jugadores = roster.cuadrillas.flatMap((c) => c.integrantes.filter((i) => i.jugador))
    expect(jugadores.length).toBeGreaterThan(0)
    for (const j of jugadores) expect(USUARIOS_DEMO.find((u) => u.id === j.id)?.rol).toBe('estudiante')
    expect(JSON.stringify(cuadrillasJson)).not.toMatch(/Cochayullero/i)
  })

  it('rechaza cuadrillas de menos de 3 o más de 4 integrantes (RF-06)', () => {
    const d = copia()
    d.cuadrillas[4].integrantes.pop()
    expect(errores(d).length).toBeGreaterThan(0)
  })

  it('rechaza integrantes repetidos, atascos en misiones grupales y grupales individuales', () => {
    const repetido = copia()
    repetido.cuadrillas[3].integrantes[0].id = 'c2-javiera'
    expect(errores(repetido).join()).toMatch(/repetidos/)

    const atascoGrupal = copia()
    atascoGrupal.cuadrillas[4].integrantes[2].atasco!.mision = '2.3'
    expect(errores(atascoGrupal).join()).toMatch(/grupal/)

    const aprobadaGrupal = copia()
    aprobadaGrupal.cuadrillas[4].integrantes[0].aprobadas!.push('2.3')
    expect(errores(aprobadaGrupal).join()).toMatch(/las aprueba la cuadrilla/)
  })

  it('las grupales de la cuadrilla del jugador salen de su viaje, no del roster', () => {
    const d = copia()
    d.cuadrillas[0].grupales = { '2.3': {} }
    expect(errores(d).join()).toMatch(/salen de su viaje/)
  })
})
