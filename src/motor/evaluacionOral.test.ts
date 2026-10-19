import { describe, expect, it } from 'vitest'
import parametrosJson from '../../public/datos/parametros.json'
import { esquemaParametros } from '@/datos/parametros'
import { MISIONES } from '@/datos/misiones'
import { porcentajeEvaluador, veredictoComision, type EvaluacionEvaluador } from './evaluacionOral'
import { entregar, iniciar, resolver, abrirTodas, viajeInicial } from './progreso'
import { recompensaPorAprobacion } from './puntaje'

const evaluador = (id: string, notas: [number, number, number, number], esDocente = false): EvaluacionEvaluador => ({
  evaluadorId: id,
  esDocente,
  puntajes: { claridad: notas[0], justificacion: notas[1], preguntas: notas[2], terminologia: notas[3] },
})

describe('rúbrica de la defensa oral (§14)', () => {
  it('el porcentaje es el promedio sobre 4', () => {
    expect(porcentajeEvaluador(evaluador('d', [3, 3, 2, 2], true))).toBe(62.5)
    expect(porcentajeEvaluador(evaluador('d', [4, 4, 4, 4]))).toBe(100)
  })

  it('rechaza puntajes fuera de la escala 1–4', () => {
    expect(() => porcentajeEvaluador(evaluador('d', [5, 3, 3, 3]))).toThrow(RangeError)
    expect(() => porcentajeEvaluador(evaluador('d', [0, 3, 3, 3]))).toThrow(RangeError)
    expect(() => porcentajeEvaluador(evaluador('d', [2.5, 3, 3, 3]))).toThrow(RangeError)
  })

  it('comisión de 3 (docente + 2 pares): decide la mayoría', () => {
    const v = veredictoComision([evaluador('doc', [2, 2, 2, 2], true), evaluador('p1', [3, 3, 2, 2]), evaluador('p2', [3, 2, 3, 2])])
    expect(v).toEqual({ aprobada: true, votosFavor: 2, votosContra: 1, desempateDocente: false })
  })

  it('con 2 evaluadores empatados resuelve el docente', () => {
    const aprueba = veredictoComision([evaluador('doc', [3, 3, 3, 3], true), evaluador('p1', [2, 2, 2, 2])])
    expect(aprueba).toEqual({ aprobada: true, votosFavor: 1, votosContra: 1, desempateDocente: true })
    const rechaza = veredictoComision([evaluador('doc', [2, 2, 2, 2], true), evaluador('p1', [3, 3, 3, 3])])
    expect(rechaza.aprobada).toBe(false)
  })

  it('exige al menos 2 evaluadores y un docente para desempatar', () => {
    expect(() => veredictoComision([evaluador('doc', [3, 3, 3, 3], true)])).toThrow(RangeError)
    expect(() => veredictoComision([evaluador('p1', [3, 3, 3, 3]), evaluador('p2', [2, 2, 2, 2])])).toThrow(/no hay docente/)
  })
})

describe('CP-07 · el docente aprueba la evidencia de 3.2', () => {
  it('se otorgan la insignia Voz de la Brigada y 150 XP', () => {
    const orden = MISIONES.map((m) => m.id)
    const xp = esquemaParametros.parse(parametrosJson).xp
    const v = entregar(iniciar(abrirTodas(viajeInicial(orden)), '3.2'), '3.2')
    expect(v['3.2'].estado).toBe('en_evaluacion')

    const veredicto = veredictoComision([evaluador('doc', [3, 3, 3, 3], true), evaluador('p1', [3, 2, 3, 3]), evaluador('p2', [2, 2, 2, 2])])
    const r = resolver(v, orden, '3.2', veredicto.aprobada, 1)
    expect(r.otorgaRecompensa).toBe(true)

    const m32 = MISIONES.find((m) => m.id === '3.2')!
    expect(m32.insignia.nombre).toBe('Voz de la Brigada')
    expect(recompensaPorAprobacion({ mision: m32, lecturasExactas: 0 }, xp)).toEqual([
      { tipo: 'mision', xp: 150, ambito: 'individual', misionId: '3.2' },
    ])
  })
})
