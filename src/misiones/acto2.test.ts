import { describe, expect, it } from 'vitest'
import parametrosJson from '../../public/datos/parametros.json'
import aguaJson from '../../public/datos/escenarios/rural-red-del-agua.json'
import pehuenJson from '../../public/datos/escenarios/rural-pehuen.json'
import ceroCotaJson from '../../public/datos/escenarios/rural-cero-cota.json'
import estanqueJson from '../../public/datos/escenarios/rural-estanque.json'
import conduccionJson from '../../public/datos/escenarios/rural-conduccion.json'
import { esquemaParametros, type PielActo2 } from '@/datos/parametros'
import { crearRng } from '@/motor/azar'
import { pendientePct } from '@/motor/desniveles'
import { cotaVerdaderaMm, leerEscenario, planificarRecorrido, type Escenario, type LecturaPlanificada } from '@/motor/escenarios'
import { rangoDesdeParametros } from '@/motor/lecturas'
import { registrarFila, registroVacio, type RegistroLibreta } from '@/motor/libreta'
import { formatearMm, formatearNumero, type Mm } from '@/motor/numeros'
import { claveTramo, emparejar, puntosDeLibreta } from './comunes'
import { configMision, entregarMision } from './definiciones'
import { CASAS_CERO_COTA, PUNTOS_AGUA, PUNTOS_PEHUEN } from './m21'
import { VIVIENDAS_2_2 } from './m22'
import { cierreDeTramo, cotaDeM, libretaSimulada, prepararSesion } from './m23'
import { perfilVacio, type ContextoEntrega, type Evaluacion, type Formulario, type IdMisionJugable } from './tipos'

const parametros = esquemaParametros.parse(parametrosJson)
const rango = rangoDesdeParametros(parametros.lectura)
const esc = {
  agua: leerEscenario(aguaJson, rango),
  pehuen: leerEscenario(pehuenJson, rango),
  ceroCota: leerEscenario(ceroCotaJson, rango),
  estanque: leerEscenario(estanqueJson, rango),
  conduccion: leerEscenario(conduccionJson, rango),
}

/** Libreta asistida escrita a partir de las lecturas, con errores de lectura opcionales por índice. */
function libretaDe(lecturas: LecturaPlanificada[], pr: RegistroLibreta['pr'], errores: Record<number, Mm> = {}) {
  let registro = registroVacio(pr)
  let anterior = 0
  let cota = pr.cotaMm
  lecturas.forEach((l, i) => {
    const lecturaMm = l.verdaderaMm + (errores[i] ?? 0)
    const base = { estacion: l.estacion, punto: l.punto, tipo: l.tipo, lecturaMm, observaciones: '' }
    if (l.tipo === 'LT') registro = registrarFila(registro, { ...base, distanciaM: null, desnivelMm: null, cotaMm: null }, i)
    else {
      const dh = anterior - lecturaMm
      cota += dh
      registro = registrarFila(registro, { ...base, distanciaM: l.distanciaM!, desnivelMm: dh, cotaMm: cota }, i)
    }
    anterior = lecturaMm
  })
  return registro
}

function preparar(e: Escenario, recorrido: string, semilla: number, errores: Record<number, Mm> = {}) {
  const lecturas = planificarRecorrido(e, recorrido, rango, crearRng(semilla))
  const pr = { punto: lecturas[0].punto, cotaMm: cotaVerdaderaMm(e, lecturas[0].punto) }
  const registro = libretaDe(lecturas, pr, errores)
  return { lecturas, registro, lib: puntosDeLibreta(emparejar(registro, lecturas), pr) }
}

const ctx = (e: Escenario, registro: RegistroLibreta, lecturas: LecturaPlanificada[], formulario: Formulario, extra: Partial<ContextoEntrega> = {}): ContextoEntrega => ({
  escenario: e,
  parametros,
  registro,
  modo: 'asistido',
  lecturas,
  compensacion: {},
  perfil: perfilVacio(),
  formulario,
  cooperativa: null,
  ...extra,
})

function evaluar(id: IdMisionJugable, c: ContextoEntrega, piel: PielActo2 = 'red-del-agua'): Evaluacion {
  const r = entregarMision(configMision(id, { piel }), c)
  if (r.tipo !== 'evaluada') throw new Error(`Bloqueada: ${r.motivos.join(' | ')}`)
  return r.evaluacion
}

const m = (mm: Mm) => formatearMm(mm)
const tramos = (ids: string[]) => ids.slice(1).map((b, i) => [ids[i], b] as const)

describe('2.1 · piel La Red del Agua', () => {
  const { lecturas, registro, lib } = preparar(esc.agua, '2.1', 11)
  const cota = (id: string) => lib.get(id)!.cotaMm
  const dist = lib.get('V4')!.distanciaAcumuladaM - lib.get('F')!.distanciaAcumuladaM
  const correcto: Formulario = {
    ...Object.fromEntries(tramos(PUNTOS_AGUA).map(([a, b]) => [claveTramo('dh', a, b), formatearMm(cota(b) - cota(a), { signo: true })])),
    'cota:F': m(cota('F')),
    'cota:V4': m(cota('V4')),
    dist: String(dist),
    pendiente: formatearNumero(pendientePct(cota('F') - cota('V4'), dist), 3),
    decision: 'bombeo',
    justificacion: 'La fuente queda más baja que V4: la pendiente es negativa y no alcanza 0,5 %.',
  }

  it('con lecturas exactas y la decisión de bombear, aprueba (escenario base del documento)', () => {
    const e = evaluar('2.1', ctx(esc.agua, registro, lecturas, correcto))
    expect(e.criterios.filter((c) => !c.ok)).toEqual([])
    expect(e.desempeno.lecturasExactas).toBe(9)
  })

  it('rechaza la decisión de gravedad (CP-04)', () => {
    expect(evaluar('2.1', ctx(esc.agua, registro, lecturas, { ...correcto, decision: 'gravedad' })).motivo).toBe('decision')
  })

  it('exige que la justificación cite los números de la libreta, no valores genéricos', () => {
    const e = evaluar('2.1', ctx(esc.agua, registro, lecturas, { ...correcto, 'cota:F': '96,000' }))
    expect(e.motivo).toBe('justificacion')
    expect(e.criterios.find((c) => c.id === 'justificacion')?.texto).toContain('la cota de F')
    expect(evaluar('2.1', ctx(esc.agua, registro, lecturas, { ...correcto, pendiente: '-1,5' })).motivo).toBe('justificacion')
  })

  it('detecta un desnivel que no calza con el terreno aunque la planilla copie bien la libreta', () => {
    // LA en V2 (fila 5) 10 mm alta: V1–V2 queda 10 mm abajo, más que T = 12√0,415 = 7,7 mm.
    const malo = preparar(esc.agua, '2.1', 11, { 4: 10 })
    const c = (id: string) => malo.lib.get(id)!.cotaMm
    const form = { ...correcto, ...Object.fromEntries(tramos(PUNTOS_AGUA).map(([a, b]) => [claveTramo('dh', a, b), formatearMm(c(b) - c(a))])) }
    const e = evaluar('2.1', ctx(esc.agua, malo.registro, malo.lecturas, { ...form, 'cota:F': m(c('F')), 'cota:V4': m(c('V4')) }))
    expect(e.criterios.find((x) => x.id === 'planilla')?.ok).toBe(true)
    expect(e.motivo).toBe('desniveles')
  })

  it('bloquea con datos faltantes o una justificación muy corta', () => {
    const r = entregarMision(configMision('2.1', { piel: 'red-del-agua' }), ctx(esc.agua, registro, lecturas, { ...correcto, decision: '', justificacion: 'bombeo' }))
    expect(r).toEqual({
      tipo: 'bloqueada',
      motivos: ['faltan datos o no se pueden leer: decisión', 'justificación: escribe al menos 30 caracteres'],
    })
  })
})

describe('2.1 · piel Camino del Pehuén', () => {
  const { lecturas, registro, lib } = preparar(esc.pehuen, '2.1', 12)
  const cota = (id: string) => lib.get(id)!.cotaMm
  const distancia = (a: string, b: string) => lib.get(b)!.distanciaAcumuladaM - lib.get(a)!.distanciaAcumuladaM
  const correcto: Formulario = {
    ...Object.fromEntries(
      tramos(PUNTOS_PEHUEN).flatMap(([a, b]) => {
        const p = pendientePct(cota(b) - cota(a), distancia(a, b))
        return [
          [claveTramo('dh', a, b), formatearMm(cota(b) - cota(a))],
          [claveTramo('p', a, b), formatearNumero(p, 3)],
          [claveTramo('excede', a, b), p > 8 ? 'si' : 'no'],
        ]
      }),
    ),
    decision: 'no-transitable',
    justificacion: 'El tramo K2–K3 sube más de 8 %: no es transitable sin rebajar la rasante.',
  }

  it('aprueba al marcar K2–K3 sobre 8 % y el camino como no transitable', () => {
    expect(correcto[claveTramo('excede', 'K2', 'K3')]).toBe('si')
    expect(evaluar('2.1', ctx(esc.pehuen, registro, lecturas, correcto), 'camino-pehuen').aprobada).toBe(true)
  })

  it('rechaza sin revelar cuál tramo está mal clasificado', () => {
    const e = evaluar('2.1', ctx(esc.pehuen, registro, lecturas, { ...correcto, [claveTramo('excede', 'K2', 'K3')]: 'no' }), 'camino-pehuen')
    expect(e.motivo).toBe('decision')
    expect(e.criterios.find((c) => c.id === 'decision')?.texto).not.toContain('K2')
  })
})

describe('2.1 · piel Operación Cero Cota', () => {
  const { lecturas, registro, lib } = preparar(esc.ceroCota, '2.1', 13)
  const linea = 99_500
  const correcto: Formulario = {
    ...Object.fromEntries(
      CASAS_CERO_COTA.flatMap((c) => {
        const cota = lib.get(c)!.cotaMm
        return [
          [`cota:${c}`, m(cota)],
          [`margen:${c}`, formatearMm(cota - linea, { signo: true })],
          [`bajo:${c}`, cota < linea ? 'si' : 'no'],
        ]
      }),
    ),
    justificacion: 'C1 y C3 quedan bajo la línea de seguridad: hay que trasladarlas o protegerlas.',
  }

  it('aprueba al marcar C1 y C3 bajo la línea de seguridad', () => {
    expect([correcto['bajo:C1'], correcto['bajo:C2'], correcto['bajo:C3'], correcto['bajo:C4']]).toEqual(['si', 'no', 'si', 'no'])
    expect(evaluar('2.1', ctx(esc.ceroCota, registro, lecturas, correcto), 'cero-cota').aprobada).toBe(true)
  })

  it('el margen debe ser cota − línea', () => {
    expect(evaluar('2.1', ctx(esc.ceroCota, registro, lecturas, { ...correcto, 'margen:C3': '+0,038' }), 'cero-cota').motivo).toBe('planilla')
  })
})

describe('2.2 · Detective de Cotas', () => {
  const { lecturas, registro, lib } = preparar(esc.estanque, '2.2', 14)
  const cota = (id: string) => lib.get(id)!.cotaMm
  const estanque = cota('T') + 8_750
  const optima = Math.max(...VIVIENDAS_2_2.map(cota)) + 10_000
  const correcto: Formulario = {
    'cota:T': m(cota('T')),
    dif: m(104_850 - cota('T')),
    alterado: 'si',
    cotaEstanque: m(estanque),
    ...Object.fromEntries(VIVIENDAS_2_2.flatMap((v) => [[`cota:${v}`, m(cota(v))], [`presion:${v}`, m(estanque - cota(v))]])),
    cotaOptima: m(optima),
    cotaPropuesta: m(optima),
    justificacion: 'El radier real está 3,5 m más abajo que en el plano: hay que subir el estanque.',
  }

  it('aprueba al detectar el plano alterado y proponer la cota óptima (110,980 m)', () => {
    expect(optima).toBe(110_980)
    const e = evaluar('2.2', ctx(esc.estanque, registro, lecturas, correcto))
    expect(e.criterios.filter((c) => !c.ok)).toEqual([])
  })

  it('rechaza si no acusa la alteración del plano', () => {
    expect(evaluar('2.2', ctx(esc.estanque, registro, lecturas, { ...correcto, alterado: 'no' })).motivo).toBe('deteccion')
  })

  it('rechaza una cota propuesta que deja una vivienda bajo 10 m.c.a., aunque sea por milímetros', () => {
    expect(evaluar('2.2', ctx(esc.estanque, registro, lecturas, { ...correcto, cotaPropuesta: '110,975' })).motivo).toBe('abastecimiento')
    expect(evaluar('2.2', ctx(esc.estanque, registro, lecturas, { ...correcto, cotaPropuesta: '111,000' })).aprobada).toBe(true)
  })

  it('las presiones se calculan con la cota real del estanque (radier + torre)', () => {
    expect(evaluar('2.2', ctx(esc.estanque, registro, lecturas, { ...correcto, 'presion:V3': m(113_600 - cota('V3')) })).motivo).toBe('planilla')
  })
})

describe('2.3 · Punto de Encuentro (CP-05)', () => {
  const sesion = (semilla: number, humanos: ('A' | 'B')[] = ['A']) => prepararSesion(esc.conduccion, rango, semilla, humanos, 30)
  const prDe = (tramo: 'A' | 'B') => ({ punto: tramo === 'A' ? 'C' : 'R', cotaMm: cotaVerdaderaMm(esc.conduccion, tramo === 'A' ? 'C' : 'R') })
  const T = 12 * Math.sqrt(0.4)

  it('la discrepancia en M está garantizada y solo el tramo con el evento deja de cerrar', () => {
    for (let semilla = 1; semilla <= 40; semilla++) {
      const s = sesion(semilla)
      const libretas = (['A', 'B'] as const).map((tr) => {
        const errores = s.evento.tramo === tr ? { [s.evento.indiceLectura]: s.evento.desplazamientoMm } : {}
        return libretaDe(s.lecturas[tr], prDe(tr), errores)
      })
      const [mA, mB] = libretas.map((r, i) => cotaDeM(r, s.lecturas[i === 0 ? 'A' : 'B'])!)
      expect(Math.abs(mA - mB)).toBeGreaterThan(T)
      const cierres = libretas.map((r, i) => cierreDeTramo(r, s.lecturas[i === 0 ? 'A' : 'B'], 12)!)
      expect(cierres.map((c) => c.aprobado)).toEqual(s.evento.tramo === 'A' ? [false, true] : [true, false])
      expect(s.estacionDelEvento).toMatch(/^S[12]$/)
    }
  })

  function jugar(semilla: number, cambios: Formulario = {}, companeroCompleto = true) {
    const s = sesion(semilla)
    // Quien juega el tramo A lee lo que muestra el anteojo: si el evento le tocó, la lectura sale corrida.
    const errores = s.evento.tramo === 'A' ? { [s.evento.indiceLectura]: s.evento.desplazamientoMm } : {}
    const propio = libretaDe(s.lecturas.A, prDe('A'), errores)
    const companero = libretaSimulada(s.lecturas.B, prDe('B'), s.evento, 'B', semilla)
    const formulario: Formulario = {
      tramo: s.evento.tramo,
      estacion: s.estacionDelEvento,
      causa: s.evento.causa,
      cotaComun: m(cotaVerdaderaMm(esc.conduccion, 'M') + 2),
      procedimiento: 'Repetimos la postura señalada con la mira revisada y adoptamos la cota del tramo que cierra.',
      ...cambios,
    }
    const c = ctx(esc.conduccion, propio, s.lecturas.A, formulario, {
      cooperativa: {
        tramo: 'A',
        evento: s.evento,
        estacionDelEvento: s.estacionDelEvento,
        companero: { simulado: true, registro: companeroCompleto ? companero : null, lecturas: s.lecturas.B, resolucion: null },
      },
    })
    return { s, c }
  }

  it('aprueba con el tramo, la postura, la causa y la cota común correctos', () => {
    for (const semilla of [1, 2, 3, 4, 5]) {
      const { c } = jugar(semilla)
      const e = evaluar('2.3', c)
      expect(e.criterios.filter((x) => !x.ok)).toEqual([])
      // Quien leyó fielmente la mira corrida no pierde la lectura exacta.
      expect(e.desempeno.lecturasExactas).toBe(8)
    }
  })

  it('rechaza una causa raíz equivocada, aunque la cota común esté bien', () => {
    expect(evaluar('2.3', jugar(1, { causa: 'cinta-mal-tensada' }).c).motivo).toBe('causa')
  })

  it('rechaza la postura equivocada', () => {
    const { s } = jugar(2)
    const otra = s.estacionDelEvento === 'S1' ? 'S2' : 'S1'
    expect(evaluar('2.3', jugar(2, { estacion: otra }).c).motivo).toBe('estacion')
  })

  it('con dos cuadrillas reales, exige que la otra coincida en la cota y documente', () => {
    const { c } = jugar(3)
    const coop = c.cooperativa!
    const sinAcuerdo = { ...c, cooperativa: { ...coop, companero: { ...coop.companero, simulado: false } } }
    expect(evaluar('2.3', sinAcuerdo).motivo).toBe('acuerdo')
    const resolucion = { tramo: coop.evento.tramo, estacion: coop.estacionDelEvento, causa: coop.evento.causa, cotaComunMm: cotaVerdaderaMm(esc.conduccion, 'M'), documentada: true }
    expect(evaluar('2.3', { ...c, cooperativa: { ...coop, companero: { ...coop.companero, simulado: false, resolucion } } }).aprobada).toBe(true)
  })

  it('bloquea mientras la otra cuadrilla no termine su tramo', () => {
    const r = entregarMision(configMision('2.3', { piel: 'red-del-agua' }), jugar(1, {}, false).c)
    expect(r).toEqual({ tipo: 'bloqueada', motivos: ['la cuadrilla B todavía no termina su tramo (ida y vuelta)'] })
  })
})
