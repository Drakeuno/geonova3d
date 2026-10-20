import { parsearNumero } from '@/motor/numeros'
import { esquemaParametros, MODOS_DESNIVEL, PIELES_ACTO2, type Parametros } from './parametros'

// Parámetros que el docente ajusta desde su panel (RF-08, §11). Los ajustes se guardan aparte, como
// pares ruta → valor, y se aplican sobre `parametros.json`: lo que no se ajustó sigue al archivo.
// Quedan fijos el rango de lectura y las estaciones del perfil (los escenarios se construyeron con
// ellos) y las tolerancias de comparación de la §14.

export type Ajustes = Record<string, number | string>

export const GRUPOS = ['cierre', 'calculo', 'acto2', 'perfil', 'xp', 'evaluacion'] as const
export type GrupoConfiguracion = (typeof GRUPOS)[number]

export type CampoEditable =
  | { ruta: string; grupo: GrupoConfiguracion; tipo: 'numero'; min: number; max: number; entero?: boolean }
  | { ruta: string; grupo: GrupoConfiguracion; tipo: 'opcion'; opciones: readonly string[] }

const xp = (ruta: string): CampoEditable => ({ ruta: `xp.${ruta}`, grupo: 'xp', tipo: 'numero', min: 0, max: 5000, entero: true })
const modo = (acto: string): CampoEditable => ({ ruta: `modoDesnivel.${acto}`, grupo: 'calculo', tipo: 'opcion', opciones: MODOS_DESNIVEL })

export const CAMPOS_EDITABLES: CampoEditable[] = [
  { ruta: 'toleranciaCierre.coeficienteMm', grupo: 'cierre', tipo: 'numero', min: 1, max: 50 },
  { ruta: 'montaje.errorMaximoMm', grupo: 'cierre', tipo: 'numero', min: 0, max: 5 },
  modo('acto0'),
  modo('acto2'),
  modo('acto3'),
  { ruta: 'reintentos.fallasAntesDePista', grupo: 'calculo', tipo: 'numero', min: 1, max: 5, entero: true },
  { ruta: 'acto2.piel', grupo: 'acto2', tipo: 'opcion', opciones: PIELES_ACTO2 },
  { ruta: 'acto2.pendienteMinimaGravedadPct', grupo: 'acto2', tipo: 'numero', min: 0.1, max: 5 },
  { ruta: 'acto2.pendienteMaximaTransitablePct', grupo: 'acto2', tipo: 'numero', min: 1, max: 20 },
  { ruta: 'acto2.presionMinimaMca', grupo: 'acto2', tipo: 'numero', min: 1, max: 50 },
  { ruta: 'perfil.escalaHorizontal', grupo: 'perfil', tipo: 'numero', min: 10, max: 5000, entero: true },
  { ruta: 'perfil.escalaVertical', grupo: 'perfil', tipo: 'numero', min: 1, max: 1000, entero: true },
  xp('lecturaExacta'),
  xp('porInsignia.bronce'),
  xp('porInsignia.plata'),
  xp('porInsignia.oro'),
  xp('porInsignia.integrador'),
  xp('bonusPrecision.bajo5mm'),
  xp('bonusPrecision.bajo10mm'),
  xp('bonusPrimeraSinErrores'),
  xp('bonusCooperativa'),
  xp('bonusAyuda'),
  xp('penalizacionTachadura'),
  { ruta: 'evaluacionOral.aprobacionMinimaPct', grupo: 'evaluacion', tipo: 'numero', min: 1, max: 100, entero: true },
  { ruta: 'evaluacionOral.evaluadores', grupo: 'evaluacion', tipo: 'numero', min: 2, max: 3, entero: true },
]

const campo = (ruta: string) => CAMPOS_EDITABLES.find((c) => c.ruta === ruta)

export function valorEn(p: Parametros, ruta: string): number | string {
  return ruta.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], p) as number | string
}

function conValor(p: Parametros, ruta: string, valor: number | string): Parametros {
  const copia = structuredClone(p)
  const claves = ruta.split('.')
  const padre = claves.slice(0, -1).reduce<Record<string, unknown>>((o, k) => o[k] as Record<string, unknown>, copia as unknown as Record<string, unknown>)
  padre[claves[claves.length - 1]] = valor
  return copia
}

/**
 * Parámetros vigentes: los del archivo con los ajustes del docente encima. Un ajuste que no es de un
 * campo editable se ignora; si el resultado no es válido, rigen los del archivo.
 */
export function aplicarAjustes(base: Parametros, ajustes: Ajustes): { parametros: Parametros; invalidos: boolean } {
  const aplicado = Object.entries(ajustes).reduce((p, [ruta, valor]) => (campo(ruta) ? conValor(p, ruta, valor) : p), base)
  const r = esquemaParametros.safeParse(aplicado)
  return r.success && !erroresCruzados(r.data).length ? { parametros: r.data, invalidos: false } : { parametros: base, invalidos: true }
}

export type ErrorCampo = 'numero' | 'rango' | 'entero' | 'opcion' | 'escalas'

/** Reglas entre campos: el perfil exagera la vertical (1:20 V con 1:100 H), nunca al revés. */
function erroresCruzados(p: Parametros): [string, ErrorCampo][] {
  return p.perfil.escalaVertical > p.perfil.escalaHorizontal ? [['perfil.escalaVertical', 'escalas']] : []
}

/** Lee lo escrito: coma decimal; en los enteros, el punto puede ser de miles ("1.000"). */
export function leerNumeroCampo(texto: string, entero = false): number | null {
  const t = texto.trim()
  if (entero && /^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ''))
  return parsearNumero(t)
}

/** Texto inicial de un campo del formulario. */
export const textoDe = (valor: number | string) => (typeof valor === 'number' ? String(valor).replace('.', ',') : valor)

/**
 * Formulario del panel → ajustes. Solo guarda lo que difiere del archivo (lo demás sigue al
 * archivo). Devuelve también los errores por campo; con errores no se guarda.
 */
export function leerFormulario(base: Parametros, borrador: Record<string, string>): { ajustes: Ajustes; errores: Record<string, ErrorCampo> } {
  const ajustes: Ajustes = {}
  const errores: Record<string, ErrorCampo> = {}
  for (const c of CAMPOS_EDITABLES) {
    const texto = borrador[c.ruta]
    if (texto === undefined) continue
    let valor: number | string
    if (c.tipo === 'opcion') {
      if (!c.opciones.includes(texto)) {
        errores[c.ruta] = 'opcion'
        continue
      }
      valor = texto
    } else {
      const n = leerNumeroCampo(texto, c.entero)
      if (n === null) errores[c.ruta] = 'numero'
      else if (c.entero && !Number.isInteger(n)) errores[c.ruta] = 'entero'
      else if (n < c.min || n > c.max) errores[c.ruta] = 'rango'
      if (n === null || errores[c.ruta]) continue
      valor = n
    }
    if (valor !== valorEn(base, c.ruta)) ajustes[c.ruta] = valor
  }
  if (!Object.keys(errores).length) {
    const vigentes = Object.entries(ajustes).reduce((p, [ruta, v]) => conValor(p, ruta, v), base)
    for (const [ruta, error] of erroresCruzados(vigentes)) errores[ruta] = error
  }
  return { ajustes, errores }
}
