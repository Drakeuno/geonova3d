import { describe, expect, it } from 'vitest'
import campusJson from '../../public/datos/escenarios/campus-uct.json'
import parametrosJson from '../../public/datos/parametros.json'
import { esquemaParametros } from '@/datos/parametros'
import { crearRng } from '@/motor/azar'
import { cotaVerdaderaMm, estacionesDelEje, leerEscenario, planificarRecorrido, type LecturaPlanificada } from '@/motor/escenarios'
import { rangoDesdeParametros } from '@/motor/lecturas'
import { corregirEnLineaNueva, registrarFila, registroVacio, type DatosFila, type RegistroLibreta } from '@/motor/libreta'
import { formatearMm, type Mm } from '@/motor/numeros'
import { configMision, entregarMision } from './definiciones'
import { cierreDelCircuito } from './m12'
import { perfilDesdeLibreta, planillaEsperada, planoComparacionValido } from './m13'
import { perfilVacio, type ContextoEntrega, type EntradasPerfil, type Evaluacion, type IdMisionJugable } from './tipos'

const parametros = esquemaParametros.parse(parametrosJson)
const rango = rangoDesdeParametros(parametros.lectura)
const campus = leerEscenario(campusJson, rango)

interface Opciones {
  /** Error (mm) que el jugador comete en la lectura i del recorrido. */
  errorLectura?: Record<number, Mm>
  /** Distancia anotada en la lectura i, en vez de la de la cinta. */
  distancia?: Record<number, number | null>
  /** Cota mal sumada en la lectura i (mm de más). */
  errorCota?: Record<number, Mm>
  /** Cambia cómo se anota la fila i. */
  fila?: Record<number, Partial<DatosFila>>
}

/** Libreta en modo manual escrita a partir de las lecturas del intento, con las cuentas del jugador. */
function libreta(recorrido: string, semilla: number, o: Opciones = {}) {
  const lecturas = planificarRecorrido(campus, recorrido, rango, crearRng(semilla))
  const pr = { punto: lecturas[0].punto, cotaMm: cotaVerdaderaMm(campus, lecturas[0].punto) }
  let registro = registroVacio(pr)
  let anterior = 0
  let cota = pr.cotaMm
  lecturas.forEach((l, i) => {
    const lecturaMm = l.verdaderaMm + (o.errorLectura?.[i] ?? 0)
    const base = { estacion: l.estacion, punto: l.punto, tipo: l.tipo, lecturaMm, observaciones: '' }
    if (l.tipo === 'LT') {
      registro = registrarFila(registro, { ...base, distanciaM: null, desnivelMm: null, cotaMm: null, ...o.fila?.[i] }, i)
    } else {
      const dh = anterior - lecturaMm
      cota += dh
      const distanciaM = o.distancia && i in o.distancia ? o.distancia[i] : l.distanciaM!
      registro = registrarFila(registro, { ...base, distanciaM, desnivelMm: dh, cotaMm: cota + (o.errorCota?.[i] ?? 0), ...o.fila?.[i] }, i)
    }
    anterior = lecturaMm
  })
  return { registro, lecturas }
}

const contexto = (registro: RegistroLibreta, lecturas: LecturaPlanificada[], extra: Partial<ContextoEntrega> = {}): ContextoEntrega => ({
  escenario: campus,
  parametros,
  registro,
  modo: 'manual',
  lecturas,
  compensacion: {},
  perfil: perfilVacio(),
  formulario: {},
  cooperativa: null,
  partes: {},
  auditoria: null,
  ...extra,
})

const cfg = (id: IdMisionJugable) => configMision(id, { piel: 'red-del-agua' })

function evaluar(id: IdMisionJugable, ctx: ContextoEntrega): Evaluacion {
  const r = entregarMision(cfg(id), ctx)
  if (r.tipo !== 'evaluada') throw new Error(`Entrega bloqueada: ${r.motivos.join(' | ')}`)
  return r.evaluacion
}

const texto = (e: Evaluacion, id: string) => e.criterios.find((c) => c.id === id)?.texto ?? ''

describe('Misión 1.1 · El Primer Coteo', () => {
  it('con lecturas exactas aprueba, cuenta 2 lecturas exactas y una libreta sin errores', () => {
    const { registro, lecturas } = libreta('1.1', 7)
    const e = evaluar('1.1', contexto(registro, lecturas))
    expect(e.aprobada).toBe(true)
    expect(e.desempeno).toEqual({ lecturasExactas: 2, sinErroresRegistro: true })
    expect(texto(e, 'cota')).toContain('error 0 mm')
  })

  it('la tolerancia es 12√K con K = 31 m: ±2,1 mm. 2 mm de error aprueba, 3 mm no', () => {
    const conError = (mm: Mm) => {
      const { registro, lecturas } = libreta('1.1', 7, { errorLectura: { 1: mm } })
      return evaluar('1.1', contexto(registro, lecturas))
    }
    expect(conError(2).aprobada).toBe(true)
    expect(conError(2).desempeno.lecturasExactas).toBe(1)
    const mal = conError(3)
    expect(mal.aprobada).toBe(false)
    expect(mal.motivo).toBe('cota')
    expect(texto(mal, 'cota')).toContain('±2,1 mm')
  })

  it('al fallar no revela el error: con él se despejaría la cota verdadera', () => {
    const { registro, lecturas } = libreta('1.1', 7, { errorLectura: { 1: -9 } })
    const e = evaluar('1.1', contexto(registro, lecturas))
    expect(e.criterios.map((c) => c.texto).join(' ')).not.toMatch(/9 mm|error [+−]/)
  })

  it('rechaza cuentas que no cuadran con las lecturas, aunque las lecturas estén bien', () => {
    const { registro, lecturas } = libreta('1.1', 7, { errorCota: { 1: 10 } })
    const e = evaluar('1.1', contexto(registro, lecturas))
    expect(e.motivo).toBe('calculos')
    expect(e.criterios.find((c) => c.id === 'cota')?.ok).toBe(true)
  })

  it('rechaza una distancia que no es la de la cinta (±5 cm)', () => {
    const cinta = planificarRecorrido(campus, '1.1', rango, crearRng(7))[1].distanciaM!
    expect(evaluar('1.1', contexto(...Object.values(libreta('1.1', 7, { distancia: { 1: cinta + 0.04 } })) as [RegistroLibreta, LecturaPlanificada[]])).aprobada).toBe(true)
    const e = evaluar('1.1', contexto(...(Object.values(libreta('1.1', 7, { distancia: { 1: 35 } })) as [RegistroLibreta, LecturaPlanificada[]])))
    expect(e.motivo).toBe('distancias')
  })

  it('una corrección en línea nueva vale, pero quita el bonus de libreta sin errores', () => {
    const { registro, lecturas } = libreta('1.1', 7, { errorLectura: { 1: 30 }, errorCota: { 1: 0 } })
    const la = registro.filas[1]
    const corregido = corregirEnLineaNueva(
      registro,
      la.id,
      { ...la, lecturaMm: lecturas[1].verdaderaMm, desnivelMm: lecturas[0].verdaderaMm - lecturas[1].verdaderaMm, cotaMm: cotaVerdaderaMm(campus, 'P1') },
      9,
    )
    const e = evaluar('1.1', contexto(corregido, lecturas))
    expect(e.aprobada).toBe(true)
    expect(e.desempeno.sinErroresRegistro).toBe(false)
  })

  it('bloquea sin contar como falla si falta la distancia o la fila no sigue el recorrido', () => {
    const sinDistancia = libreta('1.1', 7, { distancia: { 1: null } })
    const r1 = entregarMision(cfg('1.1'), contexto(sinDistancia.registro, sinDistancia.lecturas))
    expect(r1).toEqual({ tipo: 'bloqueada', motivos: ['faltan distancias en las filas 2'] })

    const otroPunto = libreta('1.1', 7, { fila: { 1: { punto: 'P2' } } })
    const r2 = entregarMision(cfg('1.1'), contexto(otroPunto.registro, otroPunto.lecturas))
    expect(r2.tipo === 'bloqueada' && r2.motivos[0]).toContain('la fila 2 no sigue el recorrido: correspondía LA a P1 (estación E1)')

    const vacia = entregarMision(cfg('1.1'), contexto(registroVacio(sinDistancia.registro.pr), sinDistancia.lecturas))
    expect(vacia).toEqual({ tipo: 'bloqueada', motivos: ['la libreta no tiene filas'] })
  })

  it('acepta los nombres sin importar mayúsculas, espacios ni guiones', () => {
    const { registro, lecturas } = libreta('1.1', 7, { fila: { 0: { punto: 'pr 1', estacion: 'e1' }, 1: { punto: 'p1', estacion: 'E1 ' } } })
    expect(evaluar('1.1', contexto(registro, lecturas)).aprobada).toBe(true)
  })
})

/** Compensación tal como la escribiría el jugador: corrección en mm y cota compensada en metros. */
function compensacionDe(registro: RegistroLibreta, lecturas: LecturaPlanificada[], desvioMm = 0) {
  const { compensados } = cierreDelCircuito(registro, lecturas, 12)
  return Object.fromEntries(
    compensados.map((p) => [p.punto, { correccion: String(p.correccionMm + desvioMm), cota: formatearMm(p.cotaCompensadaMm + desvioMm) }]),
  )
}

describe('Misión 1.2 · Circuito Cerrado', () => {
  it('el sistema calcula e = ΣΔh y T = 12√0,21 = 5,5 mm; con lecturas exactas cierra en 0', () => {
    const { registro, lecturas } = libreta('1.2', 3)
    const c = cierreDelCircuito(registro, lecturas, 12)
    expect(c.errorMm).toBe(0)
    expect(c.longitudM).toBe(210)
    expect(c.toleranciaMm).toBeCloseTo(5.499, 3)
    expect(c.compensados.map((p) => p.punto)).toEqual(['B', 'C', 'D', 'A'])
  })

  it('reparte el error en proporción a la distancia acumulada y A vuelve a su cota conocida (CP-02)', () => {
    // LT en C (punto de cambio) 4 mm alta: D y A quedan 4 mm arriba, e = +4 mm.
    const { registro, lecturas } = libreta('1.2', 3, { errorLectura: { 3: 4 } })
    const c = cierreDelCircuito(registro, lecturas, 12)
    expect(c.errorMm).toBe(4)
    expect(c.compensados.map((p) => p.correccionMm)).toEqual([-1, -2, -3, -4])
    expect(c.compensados[3].cotaCompensadaMm).toBe(cotaVerdaderaMm(campus, 'A'))

    const e = evaluar('1.2', contexto(registro, lecturas, { compensacion: compensacionDe(registro, lecturas) }))
    expect(e.aprobada).toBe(true)
    expect(e.desempeno.errorCierreMm).toBe(4)
    expect(e.desempeno.lecturasExactas).toBe(5)
  })

  it('acepta la compensación dentro de ±2 mm y la rechaza fuera', () => {
    const { registro, lecturas } = libreta('1.2', 3, { errorLectura: { 3: 4 } })
    expect(evaluar('1.2', contexto(registro, lecturas, { compensacion: compensacionDe(registro, lecturas, 2) })).aprobada).toBe(true)
    const e = evaluar('1.2', contexto(registro, lecturas, { compensacion: compensacionDe(registro, lecturas, 3) }))
    expect(e.motivo).toBe('compensacion')
    expect(texto(e, 'compensacion')).toContain('B, C, D, A')
  })

  it('rechaza un circuito que no cierra, mostrando su propio error de cierre', () => {
    const { registro, lecturas } = libreta('1.2', 3, { errorLectura: { 3: 8 } })
    const e = evaluar('1.2', contexto(registro, lecturas, { compensacion: compensacionDe(registro, lecturas) }))
    expect(e.motivo).toBe('cierre')
    expect(texto(e, 'cierre')).toBe('El circuito no cierra: e = ΣΔh = +8 mm, más que la tolerancia de ±5,5 mm.')
  })

  it('detecta una lectura intermedia mala que el cierre no ve (coherencia con el terreno)', () => {
    // LA en B 6 mm alta: Δh A→B baja 6 y Δh B→C sube 6; el circuito cierra en 0 pero B queda 6 mm abajo.
    const { registro, lecturas } = libreta('1.2', 3, { errorLectura: { 1: 6 } })
    expect(cierreDelCircuito(registro, lecturas, 12).errorMm).toBe(0)
    const e = evaluar('1.2', contexto(registro, lecturas, { compensacion: compensacionDe(registro, lecturas) }))
    expect(e.motivo).toBe('coherencia')
  })

  it('bloquea la entrega mientras falte la compensación de algún punto', () => {
    const { registro, lecturas } = libreta('1.2', 3)
    const compensacion = compensacionDe(registro, lecturas)
    delete compensacion.D
    expect(entregarMision(cfg('1.2'), contexto(registro, lecturas, { compensacion }))).toEqual({
      tipo: 'bloqueada',
      motivos: ['falta la compensación de D'],
    })
  })
})

/** Plantilla del perfil llenada desde un perfil (el de la libreta del jugador o uno alterado). */
function plantilla(registro: RegistroLibreta, lecturas: LecturaPlanificada[], cambios: Partial<EntradasPerfil> = {}): EntradasPerfil {
  const ids = estacionesDelEje(campus).map((e) => e.id)
  const filas = Object.fromEntries(
    planillaEsperada(perfilDesdeLibreta(registro, lecturas, ids)).map((e) => [
      e.id,
      {
        progresiva: String(e.progresivaM),
        cota: formatearMm(e.cotaMm),
        parcial: e.parcialMm === null ? '' : formatearMm(e.parcialMm, { signo: true }),
        acumulado: formatearMm(e.acumuladoMm, { signo: true }),
      },
    ]),
  )
  return { filas, escalaH: '100', escalaV: '20', planoComparacion: '99,000', ejeX: 'progresiva', ejeY: 'cota', titulo: 'Perfil del sendero', ...cambios }
}

describe('Misión 1.3 · El Perfil del Sendero', () => {
  it('genera el perfil desde la libreta: progresivas desde E0 cada 20 m (RF-09)', () => {
    const { registro, lecturas } = libreta('1.3', 5)
    const perfil = perfilDesdeLibreta(registro, lecturas, ['E0', 'E1', 'E2', 'E3', 'E4', 'E5'])
    expect(perfil.map((e) => e.progresivaM)).toEqual([0, 20, 40, 60, 80, 100])
    expect(perfil.map((e) => e.cotaMm)).toEqual(estacionesDelEje(campus).map((e) => e.cotaMm))
  })

  it('con la libreta incompleta, el perfil llega hasta donde hay datos', () => {
    const { registro, lecturas } = libreta('1.3', 5)
    const parcial = { ...registro, filas: registro.filas.slice(0, 4) }
    expect(perfilDesdeLibreta(parcial, lecturas, ['E0', 'E1', 'E2', 'E3', 'E4', 'E5']).map((e) => e.id)).toEqual(['E0', 'E1', 'E2'])
  })

  it('aprueba con planilla, cierre en el PR-3 y dibujo correctos', () => {
    const { registro, lecturas } = libreta('1.3', 5)
    const e = evaluar('1.3', contexto(registro, lecturas, { perfil: plantilla(registro, lecturas) }))
    expect(e.criterios.filter((c) => !c.ok)).toEqual([])
    expect(e.aprobada).toBe(true)
    expect(e.desempeno.lecturasExactas).toBe(lecturas.length)
  })

  it('rechaza una planilla que no copia bien la libreta', () => {
    const { registro, lecturas } = libreta('1.3', 5)
    const perfil = plantilla(registro, lecturas)
    perfil.filas.E3 = { ...perfil.filas.E3, parcial: '+0,200' }
    const e = evaluar('1.3', contexto(registro, lecturas, { perfil }))
    expect(e.motivo).toBe('planilla')
    expect(texto(e, 'planilla')).toContain('en E3')
  })

  it('detecta una lectura intermedia mala aunque el perfil cierre en el PR', () => {
    // LA en E2 7 mm alta: E2 queda 7 mm abajo, más que T = 12√0,228 = 5,7 mm. El cierre no lo ve.
    const { registro, lecturas } = libreta('1.3', 5, { errorLectura: { 3: 7 } })
    const e = evaluar('1.3', contexto(registro, lecturas, { perfil: plantilla(registro, lecturas) }))
    expect(cierreDelCircuito(registro, lecturas, 12).errorMm).toBe(0)
    expect(e.motivo).toBe('desniveles')
  })

  it('exige las escalas del docente, el plano de comparación y los ejes rotulados', () => {
    const { registro, lecturas } = libreta('1.3', 5)
    const conDibujo = (cambios: Partial<EntradasPerfil>) =>
      evaluar('1.3', contexto(registro, lecturas, { perfil: plantilla(registro, lecturas, cambios) }))
    expect(conDibujo({ escalaV: '100' }).motivo).toBe('dibujo')
    expect(texto(conDibujo({ escalaV: '100' }), 'dibujo')).toContain('escalas 1:100 H y 1:20 V')
    expect(conDibujo({ ejeX: 'cota', ejeY: 'progresiva' }).motivo).toBe('dibujo')
    expect(conDibujo({ planoComparacion: '99,500' }).motivo).toBe('dibujo')
  })

  it('el plano de comparación va en un metro entero bajo la cota más baja, a menos de 2 m', () => {
    expect(planoComparacionValido(99_000, 99_812)).toBe(true)
    expect(planoComparacionValido(98_000, 99_812)).toBe(true)
    expect(planoComparacionValido(97_000, 99_812)).toBe(false)
    expect(planoComparacionValido(100_000, 99_812)).toBe(false)
    expect(planoComparacionValido(99_500, 99_812)).toBe(false)
  })

  it('bloquea mientras la planilla o el dibujo estén incompletos', () => {
    const { registro, lecturas } = libreta('1.3', 5)
    const perfil = plantilla(registro, lecturas, { titulo: ' ', ejeY: '' })
    delete perfil.filas.E4
    expect(entregarMision(cfg('1.3'), contexto(registro, lecturas, { perfil }))).toEqual({
      tipo: 'bloqueada',
      motivos: ['falta completar la planilla en E4', 'faltan datos del dibujo: rótulo del eje vertical, título'],
    })
  })
})
