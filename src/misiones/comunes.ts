import type { LecturaPlanificada } from '@/motor/escenarios'
import { mismoNombre, type FilaCalculada } from '@/motor/desniveles'
import {
  calcularRegistro,
  revisarCalculosJugador,
  revisarParaEntrega,
  sinErroresRegistro,
  type FilaLibreta,
  type ModoCalculo,
  type RegistroLibreta,
} from '@/motor/libreta'
import { formatearNumero, type Mm } from '@/motor/numeros'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import type { ContextoEntrega, Criterio, Evaluacion } from './tipos'

// Revisiones que comparten las misiones con libreta: que siga el recorrido, que esté completa, que
// las cuentas del jugador cuadren con sus lecturas y que las distancias sean las de la cinta.

const t = textos.entrega

/** Tolerancia con que se compara la distancia anotada con la que marcó la cinta (m). */
export const TOLERANCIA_DISTANCIA_M = 0.05

const describirVisada = (l: LecturaPlanificada) => rellenar(t.visada, { tipo: l.tipo, punto: l.punto, estacion: l.estacion })

/** Motivos por los que la libreta todavía no se puede entregar. No cuentan como entrega fallida. */
export function bloqueosLibreta(registro: RegistroLibreta, modo: ModoCalculo, lecturas: LecturaPlanificada[]): string[] {
  const { vigentes } = calcularRegistro(registro)
  if (vigentes.length === 0) return [t.libretaVacia]
  const motivos: string[] = []
  for (const [i, l] of lecturas.entries()) {
    const f = vigentes[i]
    if (!f) {
      motivos.push(rellenar(t.faltanVisadas, { visadas: lecturas.slice(i).map(describirVisada).join('; ') }))
      break
    }
    if (!mismoNombre(f.estacion, l.estacion) || !mismoNombre(f.punto, l.punto) || f.tipo !== l.tipo) {
      motivos.push(rellenar(t.filaFueraDeRecorrido, { n: f.numero, esperada: describirVisada(l) }))
    }
  }
  if (vigentes.length > lecturas.length) {
    motivos.push(rellenar(t.sobranFilas, { filas: vigentes.slice(lecturas.length).map((f) => f.numero).join(', ') }))
  }
  const revision = revisarParaEntrega(registro, modo)
  // Problemas de secuencia (LT fuera de lugar, LA sin LT…), si el recorrido no los explicó ya.
  if (motivos.length === 0) motivos.push(...revision.problemas)
  if (revision.faltanDistancias.length) {
    motivos.push(rellenar(textos.libreta.revision.faltanDistancias, { filas: revision.faltanDistancias.join(', ') }))
  }
  if (revision.faltanCalculos.length) {
    motivos.push(rellenar(textos.libreta.revision.faltanCalculos, { filas: revision.faltanCalculos.join(', ') }))
  }
  return motivos
}

/** Cada fila vigente con su cálculo (desde las lecturas del jugador) y la lectura que le corresponde. */
export interface Par {
  fila: FilaLibreta
  calculo: FilaCalculada
  lectura: LecturaPlanificada
}

/** Supone una libreta sin bloqueos: una fila vigente por visada del recorrido, en orden. */
export function emparejar(registro: RegistroLibreta, lecturas: LecturaPlanificada[]): Par[] {
  const { vigentes, calculo } = calcularRegistro(registro)
  return lecturas.map((lectura, i) => ({ fila: vigentes[i], calculo: calculo.filas[i], lectura }))
}

/** Lecturas dentro de ±1 mm de la verdadera (+100 XP cada una, §6.2). */
export const contarLecturasExactas = (pares: Par[], toleranciaMm: number) =>
  pares.filter((p) => Math.abs(p.fila.lecturaMm - p.lectura.verdaderaMm) <= toleranciaMm).length

export const mmConSigno = (mm: Mm) => (mm > 0 ? `+${mm}` : mm < 0 ? `−${-mm}` : '0')
export const textoTolerancia = (toleranciaMm: number) => formatearNumero(toleranciaMm, 1)

/** Las cuentas que escribió el jugador (Δh y cota) cuadran con sus lecturas. En automático no aplica. */
export function criterioCalculos(registro: RegistroLibreta, modo: ModoCalculo): Criterio | null {
  if (modo === 'automatico') return null
  const malas = revisarCalculosJugador(registro)
    .filter((r) => r.desnivelOk === false || r.cotaOk === false)
    .map((r) => r.numero)
  return {
    id: 'calculos',
    ok: malas.length === 0,
    texto: malas.length === 0 ? t.calculosOk : rellenar(t.calculosMal, { filas: malas.join(', ') }),
  }
}

/** Cada distancia anotada coincide con la que marcó la cinta (±5 cm). */
export function criterioDistancias(pares: Par[]): Criterio {
  const malas = pares
    .filter((p) => p.lectura.distanciaM !== undefined)
    .filter((p) => p.fila.distanciaM === null || Math.abs(p.fila.distanciaM - p.lectura.distanciaM!) > TOLERANCIA_DISTANCIA_M)
    .map((p) => p.fila.numero)
  return {
    id: 'distancias',
    ok: malas.length === 0,
    texto: malas.length === 0 ? t.distanciasOk : rellenar(t.distanciasMal, { filas: malas.join(', ') }),
  }
}

/** Criterios comunes a toda misión con libreta, y los datos de desempeño para el XP. */
export function revisionComun(ctx: ContextoEntrega) {
  const pares = emparejar(ctx.registro, ctx.lecturas)
  const criterios = [criterioCalculos(ctx.registro, ctx.modo), criterioDistancias(pares)].filter((c): c is Criterio => c !== null)
  return {
    pares,
    criterios,
    lecturasExactas: contarLecturasExactas(pares, ctx.parametros.lectura.toleranciaExactaMm),
    sinErroresRegistro: sinErroresRegistro(ctx.registro),
  }
}

/** Aprobada si cumple todos los criterios. El motivo de rechazo es el primero que falla. */
export function cerrarEvaluacion(criterios: Criterio[], desempeno: Evaluacion['desempeno']): Evaluacion {
  const primeraFalla = criterios.find((c) => !c.ok)
  return { aprobada: !primeraFalla, criterios, motivo: primeraFalla?.id ?? null, desempeno }
}
