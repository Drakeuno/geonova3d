import { describe, expect, it } from 'vitest'
import json from '../../public/datos/parametros.json'
import { esquemaParametros } from './parametros'

describe('parametros.json', () => {
  const p = esquemaParametros.parse(json)

  it('trae los valores por defecto de la §11 de la especificación', () => {
    expect(p.toleranciaCierre.coeficienteMm).toBe(12)
    expect(p.acto2.piel).toBe('red-del-agua')
    expect(p.acto2.pendienteMinimaGravedadPct).toBe(0.5)
    expect(p.acto2.pendienteMaximaTransitablePct).toBe(8)
    expect(p.acto2.presionMinimaMca).toBe(10)
    expect(p.perfil).toEqual({ estacionamientoM: 20, escalaHorizontal: 100, escalaVertical: 20 })
    expect([p.lectura.minimaM, p.lectura.maximaM]).toEqual([0.5, 2.5])
  })

  it('usa los modos de cálculo y XP acordados (§6.2, §14)', () => {
    expect(p.modoDesnivel).toEqual({ acto0: 'manual', acto2: 'asistido', acto3: 'asistido' })
    expect(p.xp.lecturaExacta).toBe(100)
    expect(p.xp.porInsignia).toEqual({ bronce: 100, plata: 100, oro: 150, integrador: 300 })
    expect(p.xp.penalizacionTachadura).toBe(20)
  })

  it('rechaza un rango de lectura incoherente', () => {
    const malo = { ...json, lectura: { ...json.lectura, minimaM: 2.6 } }
    expect(esquemaParametros.safeParse(malo).success).toBe(false)
  })

  it('rechaza una piel del Acto 2 desconocida', () => {
    const malo = { ...json, acto2: { ...json.acto2, piel: 'otra' } }
    expect(esquemaParametros.safeParse(malo).success).toBe(false)
  })
})
