import { crearRng } from '@/motor/azar'
import {
  aplicarMarcas,
  evaluarAuditoria,
  generarTablaPerfil,
  sembrarErrores,
  tablasCoinciden,
  type ColumnaAuditable,
  type Marca,
} from '@/motor/auditoria'
import type { RangoLectura } from '@/motor/lecturas'
import { parsearMetrosAMm, parsearNumero } from '@/motor/numeros'
import type { EstacionPerfil } from '@/motor/perfil'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { cerrarEvaluacion } from './comunes'
import type { ContextoEntrega, Evaluacion, Formulario, SesionAuditoria } from './tipos'

// Misión 3.1 · El Error Crítico (§5). Sin terreno: se audita la tabla del perfil que entregó una
// contratista, con 5 errores sembrados (2 lecturas groseras, 1 distancia, 1 signo, 1 cota mal
// transcrita). El jugador marca cada celda errónea con su valor correcto y re-elabora el perfil.

const t = textos.entrega.m31

export const MOTIVOS_M31 = ['deteccion', 'perfil'] as const

export const COLUMNAS_AUDITABLES: readonly ColumnaAuditable[] = ['distanciaAcumuladaM', 'ltMm', 'laMm', 'desnivelMm', 'cotaMm']

/** Tabla de la contratista para este intento: lecturas y errores salen de la semilla. */
export function prepararAuditoria(estaciones: EstacionPerfil[], rango: RangoLectura, semilla: number, umbralMm: number): SesionAuditoria {
  const rng = crearRng(semilla)
  const correcta = generarTablaPerfil(estaciones, rango, rng)
  const { tabla, errores } = sembrarErrores(correcta, rng, rango, umbralMm)
  return { correcta, entregada: tabla, errores }
}

/** Clave de la marca de una celda en el formulario: "marca:3:ltMm". El valor es el que propone el jugador. */
export const claveMarca = (fila: number, columna: ColumnaAuditable) => `marca:${fila}:${columna}`

/** Valor escrito en una marca: metros para las columnas verticales y para la distancia acumulada. */
export function leerMarca(columna: ColumnaAuditable, texto: string): number | null {
  if (columna === 'distanciaAcumuladaM') return parsearNumero(texto)
  return parsearMetrosAMm(texto)
}

/** Marcas del formulario (celdas señaladas como erróneas, con su valor corregido). */
export function marcasDe(f: Formulario): { marcas: Marca[]; ilegibles: string[] } {
  const marcas: Marca[] = []
  const ilegibles: string[] = []
  for (const [clave, texto] of Object.entries(f)) {
    const m = /^marca:(\d+):(\w+)$/.exec(clave)
    if (!m) continue
    const [, fila, columna] = m
    const valor = leerMarca(columna as ColumnaAuditable, texto)
    if (valor === null) ilegibles.push(rellenar(t.celda, { fila, columna: t.columnas[columna as ColumnaAuditable] }))
    else marcas.push({ fila: Number(fila), columna: columna as ColumnaAuditable, valorPropuesto: valor })
  }
  return { marcas, ilegibles }
}

export function bloqueosM31(ctx: ContextoEntrega): string[] {
  if (!ctx.auditoria) return [t.sinTabla]
  const { marcas, ilegibles } = marcasDe(ctx.formulario)
  if (ilegibles.length) return [rellenar(t.ilegibles, { celdas: ilegibles.join(', ') })]
  if (marcas.length === 0) return [t.sinMarcas]
  return []
}

export function evaluarM31(ctx: ContextoEntrega): Evaluacion {
  const a = ctx.auditoria!
  const { marcas } = marcasDe(ctx.formulario)
  const r = evaluarAuditoria(a.errores, marcas, ctx.parametros.comparacion.toleranciaMm)
  const total = a.errores.length
  // Acierto parcial (§5): se informa cuántos errores quedaron bien corregidos, sin decir cuáles.
  const deteccion = r.corregidos.length === total
  const perfil = tablasCoinciden(aplicarMarcas(a.entregada, marcas), a.correcta, ctx.parametros.comparacion.toleranciaMm)
  return cerrarEvaluacion(
    [
      { id: 'deteccion', ok: deteccion, texto: rellenar(deteccion ? t.deteccionOk : t.deteccionMal, { n: r.corregidos.length, total }) },
      { id: 'perfil', ok: perfil, texto: perfil ? t.perfilOk : t.perfilMal },
    ],
    { lecturasExactas: 0, sinErroresRegistro: true },
  )
}
