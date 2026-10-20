import { describe, expect, it } from 'vitest'
import parametrosJson from '../../public/datos/parametros.json'
import textos from '@/textos/es-CL.json'
import { CAMPOS_EDITABLES, aplicarAjustes, leerFormulario, leerNumeroCampo, textoDe, valorEn } from './configuracion'
import { esquemaParametros } from './parametros'

const base = esquemaParametros.parse(parametrosJson)
/** El formulario tal como se abre: cada campo con el valor del archivo. */
const formulario = (cambios: Record<string, string> = {}) => ({
  ...Object.fromEntries(CAMPOS_EDITABLES.map((c) => [c.ruta, textoDe(valorEn(base, c.ruta))])),
  ...cambios,
})

describe('configuración del docente (RF-08)', () => {
  it('cada campo editable existe en los parámetros y tiene su texto', () => {
    for (const c of CAMPOS_EDITABLES) {
      expect(valorEn(base, c.ruta), c.ruta).toBeDefined()
      expect((textos.configuracion.campos as Record<string, unknown>)[c.ruta], c.ruta).toBeDefined()
    }
  })

  it('los ajustes se aplican sobre el archivo; lo no ajustado sigue al archivo', () => {
    const { parametros, invalidos } = aplicarAjustes(base, { 'toleranciaCierre.coeficienteMm': 10, 'acto2.piel': 'cero-cota' })
    expect(invalidos).toBe(false)
    expect(parametros.toleranciaCierre.coeficienteMm).toBe(10)
    expect(parametros.acto2.piel).toBe('cero-cota')
    expect(parametros.acto2.presionMinimaMca).toBe(base.acto2.presionMinimaMca)
    expect(base.toleranciaCierre.coeficienteMm).toBe(12)
  })

  it('ignora lo que no es editable (el rango de lectura sigue fijo)', () => {
    expect(aplicarAjustes(base, { 'lectura.minimaM': 0.8 }).parametros.lectura.minimaM).toBe(0.5)
  })

  it('si los ajustes guardados no son válidos, rigen los del archivo', () => {
    const r = aplicarAjustes(base, { 'perfil.escalaVertical': 500, 'perfil.escalaHorizontal': 100 })
    expect(r.invalidos).toBe(true)
    expect(r.parametros).toBe(base)
  })

  it('el formulario guarda solo lo que cambió, con coma decimal', () => {
    const { ajustes, errores } = leerFormulario(base, formulario({ 'toleranciaCierre.coeficienteMm': '10,5', 'modoDesnivel.acto0': 'asistido' }))
    expect(errores).toEqual({})
    expect(ajustes).toEqual({ 'toleranciaCierre.coeficienteMm': 10.5, 'modoDesnivel.acto0': 'asistido' })
    expect(leerFormulario(base, formulario()).ajustes).toEqual({})
  })

  it('en los enteros, "1.000" es mil (punto de miles en Chile)', () => {
    expect(leerNumeroCampo('1.000', true)).toBe(1000)
    expect(leerNumeroCampo('1.5', false)).toBe(1.5)
    expect(leerFormulario(base, formulario({ 'xp.porInsignia.integrador': '1.000' })).ajustes).toEqual({ 'xp.porInsignia.integrador': 1000 })
  })

  it('marca errores de número, entero, rango, opción y escalas', () => {
    const { errores } = leerFormulario(
      base,
      formulario({
        'toleranciaCierre.coeficienteMm': 'doce',
        'xp.lecturaExacta': '100,5',
        'montaje.errorMaximoMm': '8',
        'acto2.piel': 'otra',
      }),
    )
    expect(errores).toEqual({
      'toleranciaCierre.coeficienteMm': 'numero',
      'xp.lecturaExacta': 'entero',
      'montaje.errorMaximoMm': 'rango',
      'acto2.piel': 'opcion',
    })
    expect(leerFormulario(base, formulario({ 'perfil.escalaVertical': '200' })).errores).toEqual({ 'perfil.escalaVertical': 'escalas' })
  })
})
