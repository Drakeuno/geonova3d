import { z } from 'zod'
import { aMm, redondearMedioArriba, type Mm } from './numeros'
import { elegirColimacion, intervaloColimacion, lecturaVerdaderaMm, type RangoLectura } from './lecturas'
import type { Rng } from './azar'
import type { TipoVisada } from './desniveles'
import type { EstacionPerfil } from './perfil'
import { ALTURA_INSTRUMENTO_M, alturaTerrenoMm, type PuntoControl } from './terreno'

// Escenarios de simulación (§7). Cada uno es un JSON en `public/datos/escenarios/` editable en
// co-diseño. Las cotas "verdaderas" son datos internos del motor: el jugador solo ve lecturas.

const esquemaPunto = z.object({
  id: z.string().min(1),
  nombre: z.string().optional(),
  x: z.number(),
  y: z.number(),
  /** Cota verdadera en metros (dato interno). */
  cota: z.number(),
  /** Punto de referencia de cota conocida. */
  pr: z.boolean().default(false),
})

const esquemaArista = z.object({ a: z.string(), b: z.string(), dist: z.number().positive() })

/** Puesta del instrumento: dónde se planta y qué puntos visa, en orden (LT primero, luego LA). */
const esquemaEstacion = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  visadas: z.array(z.string()).min(2),
})

const esquemaRecorrido = z.object({
  id: z.string().min(1),
  /** Circuito: vuelve al punto de partida. Abierto: termina en otro punto. */
  tipo: z.enum(['circuito', 'abierto']),
  estaciones: z.array(esquemaEstacion).min(1),
})

/** Elementos que solo se dibujan (no tienen cota que medir). */
const esquemaElemento = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('edificio'),
    nombre: z.string().optional(),
    x: z.number(),
    y: z.number(),
    ancho: z.number().positive(),
    largo: z.number().positive(),
    alto: z.number().positive(),
  }),
  z.object({ tipo: z.literal('arbol'), x: z.number(), y: z.number(), alto: z.number().positive().default(8) }),
  z.object({ tipo: z.literal('camino'), puntos: z.array(z.tuple([z.number(), z.number()])).min(2), ancho: z.number().positive().default(2) }),
])

export const esquemaEscenario = z.object({
  escenario: z.string().min(1),
  nombre: z.string().optional(),
  puntos: z.array(esquemaPunto).min(2),
  aristas: z.array(esquemaArista).default([]),
  sendero: z.object({ eje: z.array(z.string()).min(2), estacionamiento_m: z.number().positive() }).optional(),
  recorridos: z.array(esquemaRecorrido).default([]),
  elementos: z.array(esquemaElemento).default([]),
})

export type ElementoEscenario = z.infer<typeof esquemaElemento>

export type Escenario = z.infer<typeof esquemaEscenario>
export type Recorrido = Escenario['recorridos'][number]

/** Revisa la coherencia de un escenario. Devuelve la lista de problemas (vacía si está bien). */
export function validarEscenario(e: Escenario, rango: RangoLectura): string[] {
  const problemas: string[] = []
  const ids = new Set<string>()
  for (const p of e.puntos) {
    if (ids.has(p.id)) problemas.push(`Punto repetido: ${p.id}`)
    ids.add(p.id)
  }
  const existe = (id: string, donde: string) => {
    if (!ids.has(id)) problemas.push(`${donde}: el punto ${id} no existe`)
  }
  for (const a of e.aristas) {
    existe(a.a, 'Arista')
    existe(a.b, 'Arista')
  }
  e.sendero?.eje.forEach((id) => existe(id, 'Sendero'))

  for (const r of e.recorridos) {
    const donde = `Recorrido ${r.id}`
    r.estaciones.forEach((est) => est.visadas.forEach((id) => existe(id, `${donde}, estación ${est.id}`)))
    if (problemas.length) continue

    const inicio = r.estaciones[0].visadas[0]
    if (!puntoPorId(e, inicio).pr) problemas.push(`${donde}: debe partir de un PR (parte de ${inicio})`)
    r.estaciones.forEach((est, i) => {
      const anterior = r.estaciones[i - 1]
      if (anterior && est.visadas[0] !== ultima(anterior.visadas)) {
        problemas.push(`${donde}: la estación ${est.id} debe partir del punto de cambio ${ultima(anterior.visadas)}`)
      }
      if (!intervaloColimacion(est.visadas.map((id) => cotaVerdaderaMm(e, id)), rango)) {
        problemas.push(`${donde}: la estación ${est.id} visa puntos con más desnivel del que cubre la mira`)
      }
    })
    const fin = ultima(ultima(r.estaciones).visadas)
    if (r.tipo === 'circuito' && fin !== inicio) problemas.push(`${donde}: es circuito pero termina en ${fin}, no en ${inicio}`)
  }
  return problemas
}

/** Valida el esquema y la coherencia; lanza un error con todos los problemas si los hay. */
export function leerEscenario(json: unknown, rango: RangoLectura): Escenario {
  const e = esquemaEscenario.parse(json)
  const problemas = validarEscenario(e, rango)
  if (problemas.length) throw new Error(`Escenario ${e.escenario} con problemas:\n- ${problemas.join('\n- ')}`)
  return e
}

const ultima = <T>(lista: T[]): T => lista[lista.length - 1]

export function puntoPorId(e: Escenario, id: string) {
  const p = e.puntos.find((x) => x.id === id)
  if (!p) throw new Error(`El punto ${id} no existe en el escenario ${e.escenario}`)
  return p
}

/** Cota verdadera de un punto, en mm. Dato interno: no se muestra al jugador. */
export const cotaVerdaderaMm = (e: Escenario, id: string): Mm => aMm(puntoPorId(e, id).cota)

/** Distancia horizontal entre dos puntos: la de la arista si existe; si no, la de las coordenadas. */
export function distanciaEntre(e: Escenario, a: string, b: string): number {
  const arista = e.aristas.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))
  if (arista) return arista.dist
  const [p, q] = [puntoPorId(e, a), puntoPorId(e, b)]
  return redondearMedioArriba(Math.hypot(p.x - q.x, p.y - q.y), 3)
}

export interface LecturaPlanificada {
  estacion: string
  punto: string
  tipo: TipoVisada
  verdaderaMm: Mm
  distanciaM?: number
}

/** Puntos de control del terreno: todos los puntos del escenario con su cota verdadera. */
export const puntosControl = (e: Escenario): PuntoControl[] => e.puntos.map((p) => ({ x: p.x, y: p.y, cotaMm: aMm(p.cota) }))

/**
 * Lecturas verdaderas de un recorrido, estación por estación, con una colimación interna elegida
 * al azar en cada una, cerca de la altura de un instrumento real sobre el suelo de la estación.
 * Devuelve solo lecturas y distancias, nunca la colimación.
 */
export function planificarRecorrido(e: Escenario, recorridoId: string, rango: RangoLectura, rng: Rng): LecturaPlanificada[] {
  const r = e.recorridos.find((x) => x.id === recorridoId)
  if (!r) throw new Error(`El recorrido ${recorridoId} no existe en el escenario ${e.escenario}`)
  const control = puntosControl(e)
  return r.estaciones.flatMap((est) => {
    const suelo = alturaTerrenoMm(control, est.x, est.y)
    const colimacion = elegirColimacion(
      est.visadas.map((id) => cotaVerdaderaMm(e, id)),
      rango,
      rng,
      suelo + aMm(ALTURA_INSTRUMENTO_M),
    )
    return est.visadas.map((punto, j): LecturaPlanificada => ({
      estacion: est.id,
      punto,
      tipo: j === 0 ? 'LT' : 'LA',
      verdaderaMm: lecturaVerdaderaMm(colimacion, cotaVerdaderaMm(e, punto)),
      ...(j > 0 && { distanciaM: distanciaEntre(e, est.visadas[j - 1], punto) }),
    }))
  })
}

/** Longitud del recorrido (m): suma de las distancias entre puntos visados consecutivos. */
export function longitudRecorridoM(lecturas: LecturaPlanificada[]): number {
  return redondearMedioArriba(
    lecturas.reduce((s, l) => s + (l.distanciaM ?? 0), 0),
    3,
  )
}

/** Estaciones del eje del sendero con su progresiva y cota verdadera (para perfiles 1.3 y 3.3). */
export function estacionesDelEje(e: Escenario): EstacionPerfil[] {
  if (!e.sendero) throw new Error(`El escenario ${e.escenario} no tiene sendero`)
  const paso = e.sendero.estacionamiento_m
  return e.sendero.eje.map((id, i) => ({ id, progresivaM: i * paso, cotaMm: cotaVerdaderaMm(e, id) }))
}
