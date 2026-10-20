import { describe, expect, it } from 'vitest'
import parametrosJson from '../../public/datos/parametros.json'
import auditoriaJson from '../../public/datos/auditoria.json'
import nielolJson from '../../public/datos/escenarios/nielol.json'
import { esquemaAuditoria, estacionesAuditoria } from '@/datos/auditoria'
import { esquemaParametros } from '@/datos/parametros'
import { crearRng } from '@/motor/azar'
import { pendientePct } from '@/motor/desniveles'
import { cotaVerdaderaMm, estacionesDelEje, leerEscenario, planificarRecorrido, type LecturaPlanificada } from '@/motor/escenarios'
import { rangoDesdeParametros } from '@/motor/lecturas'
import { registrarFila, registroVacio, type RegistroLibreta } from '@/motor/libreta'
import { formatearMm, formatearNumero, type Mm } from '@/motor/numeros'
import { claveTramo } from './comunes'
import { configMision, entregarMision } from './definiciones'
import { cierreDelCircuito } from './m12'
import { perfilDesdeLibreta, planillaEsperada } from './m13'
import { claveMarca, prepararAuditoria } from './m31'
import { MATERIALES_3_2 } from './m32'
import { cierreDelPerfil, PARTE_CIRCUITO, PARTE_PERFIL, tramosDelEje } from './m33'
import { perfilVacio, type ContextoEntrega, type EntradasPerfil, type Evaluacion, type Formulario, type IdMisionJugable } from './tipos'

const parametros = esquemaParametros.parse(parametrosJson)
const rango = rangoDesdeParametros(parametros.lectura)
const nielol = leerEscenario(nielolJson, rango)
const datosAuditoria = esquemaAuditoria.parse(auditoriaJson)

const base = (extra: Partial<ContextoEntrega>): ContextoEntrega => ({
  escenario: nielol,
  parametros,
  registro: registroVacio({ punto: 'E', cotaMm: 112_400 }),
  modo: 'asistido',
  lecturas: [],
  compensacion: {},
  perfil: perfilVacio(),
  formulario: {},
  cooperativa: null,
  partes: {},
  auditoria: null,
  ...extra,
})

function evaluar(id: IdMisionJugable, c: ContextoEntrega): Evaluacion {
  const r = entregarMision(configMision(id, { piel: 'red-del-agua' }), c)
  if (r.tipo !== 'evaluada') throw new Error(`Bloqueada: ${r.motivos.join(' | ')}`)
  return r.evaluacion
}

describe('3.1 · El Error Crítico (CP-06)', () => {
  const sesion = (semilla: number) => prepararAuditoria(estacionesAuditoria(datosAuditoria), rango, semilla, parametros.errorGroseroMm)
  const texto = (columna: string, valor: number) => (columna === 'distanciaAcumuladaM' ? String(valor).replace('.', ',') : formatearMm(valor))
  const marcas = (a: ReturnType<typeof sesion>, cuantas = 5): Formulario =>
    Object.fromEntries(a.errores.slice(0, cuantas).map((e) => [claveMarca(e.fila, e.columna), texto(e.columna, e.valorCorrecto)]))

  it('marcando los 5 errores con su valor correcto, aprueba con el perfil corregido verificado', () => {
    for (const semilla of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const a = sesion(semilla)
      const e = evaluar('3.1', base({ auditoria: a, formulario: marcas(a) }))
      expect(e.criterios.filter((c) => !c.ok)).toEqual([])
    }
  })

  it('con 4 de 5 informa el acierto parcial sin decir cuál falta', () => {
    const a = sesion(9)
    const e = evaluar('3.1', base({ auditoria: a, formulario: marcas(a, 4) }))
    expect(e.motivo).toBe('deteccion')
    expect(e.criterios[0].texto).toBe('Corregiste bien 4 de 5 errores.')
  })

  it('una marca que cambia una celda buena deja el perfil mal, aunque estén los 5 errores', () => {
    const a = sesion(10)
    const buena = [1, 2, 3, 4, 5].find((f) => !a.errores.some((e) => e.fila === f && e.columna === 'cotaMm'))!
    const e = evaluar('3.1', base({ auditoria: a, formulario: { ...marcas(a), [claveMarca(buena, 'cotaMm')]: formatearMm(a.correcta[buena].cotaMm + 50) } }))
    expect(e.criterios.find((c) => c.id === 'deteccion')?.ok).toBe(true)
    expect(e.motivo).toBe('perfil')
  })

  it('bloquea sin marcas o con un valor ilegible', () => {
    const a = sesion(11)
    const config = configMision('3.1', { piel: 'red-del-agua' })
    expect(entregarMision(config, base({ auditoria: a }))).toEqual({ tipo: 'bloqueada', motivos: ['marca al menos una celda errónea, con su valor corregido'] })
    expect(entregarMision(config, base({ auditoria: a, formulario: { [claveMarca(2, 'ltMm')]: 'uno' } }))).toEqual({
      tipo: 'bloqueada',
      motivos: ['no se pueden leer los valores corregidos de fila 2, LT'],
    })
  })
})

describe('3.2 · Asamblea de la Brigada', () => {
  it('pide confirmar los materiales y luego pasa a la comisión', () => {
    const config = configMision('3.2', { piel: 'red-del-agua' })
    expect(config.evaluacionDocente).toBe(true)
    expect(entregarMision(config, base({ formulario: { 'listo:perfil': 'si' } }))).toEqual({
      tipo: 'bloqueada',
      motivos: ['confirma que tienen listo: la libreta de campo, la presentación, el ensayo de la defensa'],
    })
    const listo = Object.fromEntries(MATERIALES_3_2.map((m) => [`listo:${m}`, 'si']))
    expect(evaluar('3.2', base({ formulario: listo })).aprobada).toBe(true)
  })
})

/** Libreta asistida escrita con las lecturas del intento (y errores opcionales por índice). */
function libretaDe(lecturas: LecturaPlanificada[], pr: RegistroLibreta['pr'], errores: Record<number, Mm> = {}) {
  let registro = registroVacio(pr)
  let anterior = 0
  let cota = pr.cotaMm
  lecturas.forEach((l, i) => {
    const lecturaMm = l.verdaderaMm + (errores[i] ?? 0)
    const datos = { estacion: l.estacion, punto: l.punto, tipo: l.tipo, lecturaMm, observaciones: '' }
    if (l.tipo === 'LT') registro = registrarFila(registro, { ...datos, distanciaM: null, desnivelMm: null, cotaMm: null }, i)
    else {
      const dh = anterior - lecturaMm
      cota += dh
      registro = registrarFila(registro, { ...datos, distanciaM: l.distanciaM!, desnivelMm: dh, cotaMm: cota }, i)
    }
    anterior = lecturaMm
  })
  return registro
}

describe('3.3 · La Cota del Ñielol (integrador)', () => {
  function jugar(semilla: number, opciones: { errorPerfil?: Record<number, Mm>; cambios?: Formulario } = {}) {
    const pr = { punto: 'E', cotaMm: cotaVerdaderaMm(nielol, 'E') }
    const lecC = planificarRecorrido(nielol, '3.3-circuito', rango, crearRng(semilla))
    const lecP = planificarRecorrido(nielol, '3.3-perfil', rango, crearRng(semilla + 1))
    const regC = libretaDe(lecC, pr)
    const regP = libretaDe(lecP, pr, opciones.errorPerfil)
    const partes = { [PARTE_CIRCUITO]: { registro: regC, lecturas: lecC }, [PARTE_PERFIL]: { registro: regP, lecturas: lecP } }
    const compensacion = Object.fromEntries(
      cierreDelCircuito(regC, lecC, 12).compensados.map((p) => [p.punto, { correccion: String(p.correccionMm), cota: formatearMm(p.cotaCompensadaMm) }]),
    )
    const estaciones = perfilDesdeLibreta(regP, lecP, estacionesDelEje(nielol).map((e) => e.id))
    const planilla = planillaEsperada(estaciones)
    const perfil: EntradasPerfil = {
      filas: Object.fromEntries(
        planilla.map((e) => [
          e.id,
          { progresiva: String(e.progresivaM), cota: formatearMm(e.cotaMm), parcial: e.parcialMm === null ? '' : formatearMm(e.parcialMm), acumulado: formatearMm(e.acumuladoMm) },
        ]),
      ),
      escalaH: '100',
      escalaV: '20',
      planoComparacion: '111,000',
      ejeX: 'progresiva',
      ejeY: 'cota',
      titulo: 'Perfil longitudinal del sendero principal del cerro Ñielol',
    }
    const formulario: Formulario = {
      ...Object.fromEntries(
        tramosDelEje({ escenario: nielol }).map(([a, b], i) => [
          claveTramo('p', a, b),
          formatearNumero(pendientePct(planilla[i + 1].cotaMm - planilla[i].cotaMm, planilla[i + 1].progresivaM - planilla[i].progresivaM), 3),
        ]),
      ),
      tramoCritico: 'S07|S08',
      tituloInforme: 'Informe técnico: nivelación del sendero principal del cerro Ñielol',
      conclusiones:
        'El circuito cierra dentro de la tolerancia y se compensó en proporción a las distancias. El tramo S07–S08 supera el 8 % y no cumple el criterio de accesibilidad: se recomienda una rampa con descansos.',
      ...opciones.cambios,
    }
    return base({ registro: regC, lecturas: lecC, partes, compensacion, perfil, formulario })
  }

  it('el perfil parte en el PR de la entrada (progresiva 0) y llega a M a los 240 m', () => {
    const c = jugar(1)
    const estaciones = perfilDesdeLibreta(c.partes.perfil.registro, c.partes.perfil.lecturas, estacionesDelEje(nielol).map((e) => e.id))
    expect(estaciones.map((e) => e.progresivaM)).toEqual(Array.from({ length: 13 }, (_, i) => i * 20))
    expect(cierreDelPerfil(c)).toMatchObject({ errorMm: 0, aprobado: true })
  })

  it('aprueba la parte automática: cierre, compensación, perfil, pendientes y tramo crítico', () => {
    const e = evaluar('3.3', jugar(2))
    expect(e.criterios.filter((c) => !c.ok)).toEqual([])
    // T = 12√K con el circuito de ~552 m (8,92 mm): la usa el % de precisión del Ñielol.
    expect(e.desempeno).toEqual({ lecturasExactas: 28, sinErroresRegistro: true, errorCierreMm: 0, toleranciaCierreMm: expect.closeTo(8.92, 2) })
  })

  it('el perfil debe cerrar en M contra la cota compensada del circuito', () => {
    // Lectura atrás de la última postura del perfil 8 mm alta: M queda 8 mm arriba (T = 12√0,24 = 5,9 mm).
    const c = jugar(3)
    const iLt = c.partes.perfil.lecturas.findIndex((l) => l.estacion === 'P4' && l.tipo === 'LT')
    const malo = jugar(3, { errorPerfil: { [iLt]: 8 } })
    expect(cierreDelPerfil(malo).errorMm).toBe(8)
    expect(evaluar('3.3', malo).motivo).toBe('cierrePerfil')
  })

  it('exige identificar el tramo que pasa de 8 %', () => {
    expect(evaluar('3.3', jugar(4, { cambios: { tramoCritico: 'ninguno' } })).motivo).toBe('tramoCritico')
    expect(evaluar('3.3', jugar(4, { cambios: { tramoCritico: 'S08|S09' } })).motivo).toBe('tramoCritico')
  })

  it('bloquea sin conclusiones suficientes', () => {
    const r = entregarMision(configMision('3.3', { piel: 'red-del-agua' }), jugar(5, { cambios: { conclusiones: 'Todo bien.' } }))
    expect(r).toEqual({ tipo: 'bloqueada', motivos: ['conclusiones: escribe al menos 120 caracteres'] })
  })
})
