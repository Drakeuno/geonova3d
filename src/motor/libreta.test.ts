import { describe, expect, it } from 'vitest'
import {
  calcularRegistro,
  cantidadTachaduras,
  corregirEnLineaNueva,
  esperadoParaBorrador,
  filasVigentes,
  registrarFila,
  registroVacio,
  revisarCalculosJugador,
  revisarParaEntrega,
  sinErroresRegistro,
  tacharCelda,
  type DatosFila,
  type RegistroLibreta,
} from './libreta'

const PR = { punto: 'A', cotaMm: 100_000 }
const fila = (estacion: string, punto: string, tipo: 'LT' | 'LA', lecturaMm: number, extra: Partial<DatosFila> = {}): DatosFila => ({
  estacion,
  punto,
  tipo,
  lecturaMm,
  distanciaM: null,
  desnivelMm: null,
  cotaMm: null,
  observaciones: '',
  ...extra,
})

/** Circuito de la 1.2, con Δh y cotas escritos por el jugador (bien calculados). */
function circuitoManual(): RegistroLibreta {
  const filas = [
    fila('E1', 'A', 'LT', 1500),
    fila('E1', 'B', 'LA', 650, { distanciaM: 45, desnivelMm: 850, cotaMm: 100_850 }),
    fila('E2', 'B', 'LT', 1420),
    fila('E2', 'C', 'LA', 850, { distanciaM: 60, desnivelMm: 570, cotaMm: 101_420 }),
    fila('E3', 'C', 'LT', 900),
    fila('E3', 'D', 'LA', 1690, { distanciaM: 50, desnivelMm: -790, cotaMm: 100_630 }),
    fila('E4', 'D', 'LT', 1100),
    fila('E4', 'A', 'LA', 1734, { distanciaM: 55, desnivelMm: -634, cotaMm: 99_996 }),
  ]
  return filas.reduce((r, f, i) => registrarFila(r, f, i), registroVacio(PR))
}

describe('registro de la libreta (§6.1)', () => {
  it('numera las filas en el orden en que se escriben', () => {
    const r = circuitoManual()
    expect(r.filas.map((f) => f.id)).toEqual(['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'])
    expect(r.filas.every((f) => f.corrigeA === null && f.anuladaPor === null)).toBe(true)
  })

  it('el sistema calcula con el método de los desniveles sobre las filas vigentes', () => {
    const { calculo } = calcularRegistro(circuitoManual())
    expect(calculo.problemas).toEqual([])
    expect(calculo.filas.filter((f) => f.tipo === 'LA').map((f) => f.cotaMm)).toEqual([100_850, 101_420, 100_630, 99_996])
  })
})

describe('CP-03 · corregir sin tachar', () => {
  it('la corrección va en una línea nueva y anula la original, que sigue visible', () => {
    // El jugador anotó 0,560 en vez de 0,650 en la fila 2 y lo corrige al final.
    let r = registrarFila(registroVacio(PR), fila('E1', 'A', 'LT', 1500), 1)
    r = registrarFila(r, fila('E1', 'B', 'LA', 560, { distanciaM: 45 }), 2)
    r = registrarFila(r, fila('E2', 'B', 'LT', 1420), 3)
    r = corregirEnLineaNueva(r, 'f2', fila('E1', 'B', 'LA', 650, { distanciaM: 45, observaciones: 'Corrige lectura' }), 4)

    expect(r.filas).toHaveLength(4)
    expect(r.filas[1]).toMatchObject({ lecturaMm: 560, anuladaPor: 'f4' })
    expect(r.filas[3]).toMatchObject({ numero: 4, corrigeA: 'f2', lecturaMm: 650 })
    // En el cálculo, la corrección ocupa el lugar de la fila 2.
    expect(filasVigentes(r).map((f) => f.id)).toEqual(['f1', 'f4', 'f3'])
    expect(calcularRegistro(r).calculo.filas[1].cotaMm).toBe(100_850)
    expect(cantidadTachaduras(r)).toBe(0)
    expect(sinErroresRegistro(r)).toBe(false)
  })

  it('una corrección también se puede corregir; la anulada ya no', () => {
    let r = registrarFila(registroVacio(PR), fila('E1', 'A', 'LT', 1500), 1)
    r = corregirEnLineaNueva(r, 'f1', fila('E1', 'A', 'LT', 1510), 2)
    r = corregirEnLineaNueva(r, 'f2', fila('E1', 'A', 'LT', 1501), 3)
    expect(filasVigentes(r).map((f) => [f.id, f.lecturaMm])).toEqual([['f3', 1501]])
    expect(() => corregirEnLineaNueva(r, 'f1', fila('E1', 'A', 'LT', 1500), 4)).toThrow(/anulada/)
  })

  it('tachar deja constancia del valor anterior y cuenta como tachadura', () => {
    const r = tacharCelda(circuitoManual(), 'f2', 'lecturaMm', 651, 99)
    expect(r.filas[1].lecturaMm).toBe(651)
    expect(r.filas[1].tachaduras).toEqual([{ campo: 'lecturaMm', valorAnterior: 650, valorNuevo: 651, en: 99 }])
    expect(cantidadTachaduras(r)).toBe(1)
    expect(sinErroresRegistro(r)).toBe(false)
    expect(() => tacharCelda(r, 'f2', 'lecturaMm', null, 100)).toThrow()
  })

  it('una libreta limpia da el bonus "sin errores de registro"', () => {
    expect(sinErroresRegistro(circuitoManual())).toBe(true)
  })
})

describe('revisión de los cálculos del jugador (modos asistido y manual)', () => {
  it('con todo bien calculado no hay errores', () => {
    const rev = revisarCalculosJugador(circuitoManual())
    expect(rev.every((x) => x.desnivelOk && x.cotaOk)).toBe(true)
  })

  it('un Δh mal calculado se marca en su fila; la cota coherente con ese Δh no se marca', () => {
    const r = circuitoManual()
    r.filas[3] = { ...r.filas[3], desnivelMm: 750, cotaMm: 101_600 }
    r.filas[5] = { ...r.filas[5], cotaMm: 100_810 }
    r.filas[7] = { ...r.filas[7], cotaMm: 100_176 }
    const rev = revisarCalculosJugador(r)
    expect(rev.map((x) => [x.numero, x.desnivelOk, x.cotaOk])).toEqual([
      [2, true, true],
      [4, false, true],
      [6, true, true],
      [8, true, true],
    ])
  })

  it('una cota mal sumada se marca en su fila', () => {
    const r = circuitoManual()
    r.filas[5] = { ...r.filas[5], cotaMm: 100_640 }
    const rev = revisarCalculosJugador(r)
    expect(rev.find((x) => x.numero === 6)).toMatchObject({ desnivelOk: true, cotaOk: false })
    // La fila siguiente parte de la cota escrita (aunque esté mal) y se revisa contra ella.
    expect(rev.find((x) => x.numero === 8)?.cotaOk).toBe(false)
  })
})

describe('asistencia mientras se escribe', () => {
  it('propone el Δh desde la lectura anterior de la estación y la cota anterior escrita', () => {
    let r = registrarFila(registroVacio(PR), fila('E1', 'A', 'LT', 1500), 1)
    expect(esperadoParaBorrador(r, 'asistido', { estacion: 'E1', tipo: 'LA', lecturaMm: 650 })).toEqual({
      desnivelMm: 850,
      cotaAnteriorMm: 100_000,
    })
    r = registrarFila(r, fila('E1', 'B', 'LA', 650, { distanciaM: 45, desnivelMm: 850, cotaMm: 100_850 }), 2)
    r = registrarFila(r, fila('E2', 'B', 'LT', 1420), 3)
    expect(esperadoParaBorrador(r, 'asistido', { estacion: 'E2', tipo: 'LA', lecturaMm: 850 })).toEqual({
      desnivelMm: 570,
      cotaAnteriorMm: 100_850,
    })
  })

  it('en modo automático la cota anterior es la del sistema', () => {
    let r = registrarFila(registroVacio(PR), fila('E1', 'A', 'LT', 1500), 1)
    r = registrarFila(r, fila('E1', 'B', 'LA', 650, { distanciaM: 45 }), 2)
    r = registrarFila(r, fila('E2', 'B', 'LT', 1420), 3)
    expect(esperadoParaBorrador(r, 'automatico', { estacion: 'E2', tipo: 'LA', lecturaMm: 850 }).cotaAnteriorMm).toBe(100_850)
  })

  it('al corregir una fila, mira solo las filas anteriores a ella', () => {
    let r = registrarFila(registroVacio(PR), fila('E1', 'A', 'LT', 1500), 1)
    r = registrarFila(r, fila('E1', 'B', 'LA', 560, { distanciaM: 45 }), 2)
    r = registrarFila(r, fila('E2', 'B', 'LT', 1420), 3)
    expect(esperadoParaBorrador(r, 'asistido', { estacion: 'E1', tipo: 'LA', lecturaMm: 650 }, 'f2').desnivelMm).toBe(850)
  })
})

describe('revisión antes de entregar (§14)', () => {
  it('una libreta completa se puede entregar', () => {
    expect(revisarParaEntrega(circuitoManual(), 'manual')).toEqual({
      faltanDistancias: [],
      faltanCalculos: [],
      calculosErroneos: [],
      problemas: [],
      entregable: true,
    })
  })

  it('falta una distancia: se bloquea la entrega', () => {
    const r = circuitoManual()
    r.filas[3] = { ...r.filas[3], distanciaM: null }
    expect(revisarParaEntrega(r, 'manual')).toMatchObject({ faltanDistancias: [4], entregable: false })
  })

  it('en manual faltan Δh o cotas: se bloquea; en automático no se piden', () => {
    const r = circuitoManual()
    r.filas[5] = { ...r.filas[5], desnivelMm: null }
    expect(revisarParaEntrega(r, 'manual')).toMatchObject({ faltanCalculos: [6], entregable: false })
    expect(revisarParaEntrega(r, 'automatico').entregable).toBe(true)
  })

  it('los cálculos erróneos se informan pero no bloquean: los evalúa la misión', () => {
    const r = circuitoManual()
    r.filas[5] = { ...r.filas[5], cotaMm: 100_640 }
    expect(revisarParaEntrega(r, 'manual')).toMatchObject({ calculosErroneos: [6, 8], entregable: true })
  })

  it('una libreta vacía o con la secuencia rota no se entrega', () => {
    expect(revisarParaEntrega(registroVacio(PR), 'automatico').entregable).toBe(false)
    const r = registrarFila(registroVacio(PR), fila('E1', 'B', 'LA', 650, { distanciaM: 45 }), 1)
    expect(revisarParaEntrega(r, 'automatico')).toMatchObject({
      problemas: ['Fila 1: lectura adelante sin lectura atrás en la estación E1'],
      entregable: false,
    })
  })
})
