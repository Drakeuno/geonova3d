import { describe, expect, it } from 'vitest'
import { corregirEnLineaNueva, registrarFila, registroVacio, tacharCelda } from '@/motor/libreta'
import { borradorDesdeFila, borradorVacio, leerBorrador } from './borrador'
import { COLUMNAS_PDF, filasParaPdf } from './exportarPdf'

const MIRA = 3000

describe('lectura del borrador', () => {
  it('convierte lo escrito en datos de fila', () => {
    const b = { ...borradorVacio({ estacion: 'E1', punto: 'B', tipo: 'LA' }), lectura: '0,650', distancia: '45', desnivel: '+0,850', cota: '100,850' }
    expect(leerBorrador(b, 'manual', MIRA)).toEqual({
      datos: { estacion: 'E1', punto: 'B', tipo: 'LA', lecturaMm: 650, distanciaM: 45, desnivelMm: 850, cotaMm: 100_850, observaciones: '' },
      errores: {},
    })
  })

  it('en modo automático no guarda Δh ni cota; en una LT no guarda distancia', () => {
    const la = { ...borradorVacio({ estacion: 'E1', punto: 'B', tipo: 'LA' }), lectura: '0,650', desnivel: '1', cota: '2' }
    expect(leerBorrador(la, 'automatico', MIRA).datos).toMatchObject({ desnivelMm: null, cotaMm: null })
    const lt = { ...borradorVacio({ estacion: 'E1', punto: 'A', tipo: 'LT' }), lectura: '1,5', distancia: '45' }
    expect(leerBorrador(lt, 'manual', MIRA).datos).toMatchObject({ lecturaMm: 1500, distanciaM: null })
  })

  it('informa cada error en su campo', () => {
    const b = { ...borradorVacio(), tipo: 'LA' as const, lectura: '3,2', distancia: '0', desnivel: 'abc' }
    expect(leerBorrador(b, 'manual', MIRA)).toEqual({
      datos: null,
      errores: {
        estacion: 'Falta la estación',
        punto: 'Falta el punto',
        lectura: 'La mira mide 3,000 m: la lectura no puede salirse de ella',
        distancia: 'La distancia debe ser mayor que cero',
        desnivel: 'Escribe un número en metros, por ejemplo 1,523',
      },
    })
  })

  it('una corrección parte de los valores de la fila corregida', () => {
    const r = registrarFila(
      registroVacio({ punto: 'A', cotaMm: 100_000 }),
      { estacion: 'E1', punto: 'B', tipo: 'LA', lecturaMm: 650, distanciaM: 45.5, desnivelMm: -850, cotaMm: 99_150, observaciones: 'x' },
      1,
    )
    expect(borradorDesdeFila(r.filas[0])).toEqual({
      estacion: 'E1',
      punto: 'B',
      tipo: 'LA',
      lectura: '0,650',
      distancia: '45,5',
      desnivel: '-0,850',
      cota: '99,150',
      observaciones: 'x',
      corrigeA: 'f1',
    })
  })
})

describe('filas del PDF', () => {
  it('lleva el PR, las anuladas con su referencia y las tachaduras, sin caracteres que el PDF no tiene', () => {
    const pr = { punto: 'A', cotaMm: 100_000 }
    let r = registrarFila(registroVacio(pr), { estacion: 'E1', punto: 'A', tipo: 'LT', lecturaMm: 1500, distanciaM: null, desnivelMm: null, cotaMm: null, observaciones: '' }, 1)
    r = registrarFila(r, { estacion: 'E1', punto: 'B', tipo: 'LA', lecturaMm: 2650, distanciaM: 45, desnivelMm: null, cotaMm: null, observaciones: '' }, 2)
    r = corregirEnLineaNueva(r, 'f2', { estacion: 'E1', punto: 'B', tipo: 'LA', lecturaMm: 2350, distanciaM: 45, desnivelMm: null, cotaMm: null, observaciones: '' }, 3)
    r = tacharCelda(r, 'f1', 'lecturaMm', 1510, 4)

    const filas = filasParaPdf(r, 'automatico')
    expect(filas[0]).toEqual(['', '', 'A', '', '', '', '100,000', '', 'PR · cota conocida'])
    expect(filas[1][3]).toBe('[tachado 1,500] 1,510')
    expect(filas[2][8]).toBe('ANULADA, ver fila 3')
    expect(filas[3]).toEqual(['3', 'E1', 'B', '', '2,350', '-0,840', '99,160', '45,00', 'Corrige fila 2'])
    expect(filas.every((f) => f.length === COLUMNAS_PDF.length)).toBe(true)
    expect(filas.flat().join(' ')).not.toMatch(/[ΔΣ−→]/)
  })
})
