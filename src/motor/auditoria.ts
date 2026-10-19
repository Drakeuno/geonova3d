import { elegir, enteroEntre, signoAlAzar, type Rng } from './azar'
import { desnivelMm } from './desniveles'
import { elegirColimacion, lecturaVerdaderaMm, type RangoLectura } from './lecturas'
import type { Mm } from './numeros'
import type { EstacionPerfil } from './perfil'

// Misión 3.1 · El Error Crítico (§5, corrección v1.1). Tabla del perfil entregada por una
// contratista, con 5 errores sembrados: 2 lecturas groseras, 1 distancia inconsistente,
// 1 desnivel con el signo invertido y 1 cota mal transcrita.

/**
 * Fila de la tabla. La fila 0 es el origen (solo cota). En la fila i ≥ 1 el instrumento se planta
 * entre Eᵢ₋₁ y Eᵢ: LT sobre Eᵢ₋₁, LA sobre Eᵢ.
 */
export interface FilaAuditoria {
  estacion: string
  distanciaParcialM: number
  distanciaAcumuladaM: number
  ltMm: Mm | null
  laMm: Mm | null
  desnivelMm: Mm | null
  cotaMm: Mm
}

export type ColumnaAuditable = 'ltMm' | 'laMm' | 'desnivelMm' | 'cotaMm' | 'distanciaAcumuladaM'
export type TipoErrorSembrado = 'lectura-grosera' | 'distancia' | 'signo' | 'cota-transcrita'

export interface ErrorSembrado {
  tipo: TipoErrorSembrado
  fila: number
  columna: ColumnaAuditable
  valorCorrecto: number
  valorSembrado: number
}

/** Genera la tabla correcta a partir de las estaciones del eje (cotas verdaderas). */
export function generarTablaPerfil(estaciones: EstacionPerfil[], rango: RangoLectura, rng: Rng): FilaAuditoria[] {
  return estaciones.map((e, i) => {
    if (i === 0) {
      return { estacion: e.id, distanciaParcialM: 0, distanciaAcumuladaM: e.progresivaM, ltMm: null, laMm: null, desnivelMm: null, cotaMm: e.cotaMm }
    }
    const anterior = estaciones[i - 1]
    const colimacion = elegirColimacion([anterior.cotaMm, e.cotaMm], rango, rng)
    const ltMm = lecturaVerdaderaMm(colimacion, anterior.cotaMm)
    const laMm = lecturaVerdaderaMm(colimacion, e.cotaMm)
    return {
      estacion: e.id,
      distanciaParcialM: e.progresivaM - anterior.progresivaM,
      distanciaAcumuladaM: e.progresivaM,
      ltMm,
      laMm,
      desnivelMm: desnivelMm(ltMm, laMm),
      cotaMm: e.cotaMm,
    }
  })
}

/** Cota con los dígitos de decímetros y centímetros intercambiados (o un decímetro de más si son iguales). */
export function transcribirMal(cotaMm: Mm): Mm {
  const dm = Math.floor(cotaMm / 100) % 10
  const cm = Math.floor(cotaMm / 10) % 10
  if (dm !== cm) return cotaMm + (cm - dm) * 100 + (dm - cm) * 10
  return dm < 9 ? cotaMm + 100 : cotaMm - 100
}

/**
 * Siembra los 5 errores en filas elegidas para que cada uno se pueda detectar sin ambigüedad:
 * - la cota transcrita en la fila d descuadra las filas d y d+1, así que ningún otro error vertical
 *   va en d ni en d+1;
 * - el signo invertido va en una fila con desnivel visible (≥ 20 mm);
 * - las lecturas groseras van en las otras dos filas y no salen del rango de la mira;
 * - la distancia acumulada alterada puede ir en cualquier fila: no toca columnas verticales.
 * Requiere al menos 5 tramos (E0–E5).
 */
export function sembrarErrores(
  tabla: FilaAuditoria[],
  rng: Rng,
  rango: RangoLectura,
  umbralMm = 30,
): { tabla: FilaAuditoria[]; errores: ErrorSembrado[] } {
  const n = tabla.length - 1
  if (n < 5) throw new Error('La auditoría necesita al menos 5 tramos (E0–E5)')
  const filas = Array.from({ length: n }, (_, i) => i + 1)

  const d = enteroEntre(rng, 1, n - 1)
  const opcionesSigno = filas.filter((f) => f !== d && f !== d + 1 && Math.abs(tabla[f].desnivelMm ?? 0) >= 20)
  const c = elegir(rng, opcionesSigno)
  const libres = filas.filter((f) => ![c, d, d + 1].includes(f))
  const a = elegir(rng, libres)
  const b = elegir(rng, libres.filter((f) => f !== a))
  const k = elegir(rng, filas)

  const alterada = tabla.map((f) => ({ ...f }))
  const errores: ErrorSembrado[] = []
  const sembrar = (tipo: TipoErrorSembrado, fila: number, columna: ColumnaAuditable, valorSembrado: number) => {
    errores.push({ tipo, fila, columna, valorCorrecto: tabla[fila][columna] as number, valorSembrado })
    alterada[fila][columna] = valorSembrado
  }

  for (const fila of [a, b]) {
    const columna = elegir(rng, ['ltMm', 'laMm'] as const)
    const actual = tabla[fila][columna] as Mm
    const magnitud = enteroEntre(rng, umbralMm + 5, umbralMm + 60)
    let signo = signoAlAzar(rng)
    if (actual + signo * magnitud < rango.minimaMm || actual + signo * magnitud > rango.maximaMm) signo = -signo
    sembrar('lectura-grosera', fila, columna, actual + signo * magnitud)
  }
  sembrar('signo', c, 'desnivelMm', -(tabla[c].desnivelMm as Mm))
  sembrar('cota-transcrita', d, 'cotaMm', transcribirMal(tabla[d].cotaMm))
  sembrar('distancia', k, 'distanciaAcumuladaM', tabla[k].distanciaAcumuladaM + signoAlAzar(rng) * enteroEntre(rng, 2, 8))

  errores.sort((x, y) => x.fila - y.fila)
  return { tabla: alterada, errores }
}

export interface RevisionFila {
  fila: number
  /** Δh = LT − LA */
  lecturasCuadran: boolean
  /** Cota = cota anterior + Δh */
  cotaCuadra: boolean
  /** Acumulada = acumulada anterior + parcial */
  distanciaCuadra: boolean
}

/** Las tres comprobaciones que hace el auditor en cada fila (sirve también para las pistas). */
export function revisarTabla(tabla: FilaAuditoria[]): RevisionFila[] {
  return tabla.slice(1).map((f, i) => {
    const anterior = tabla[i]
    return {
      fila: i + 1,
      lecturasCuadran: f.desnivelMm === desnivelMm(f.ltMm ?? 0, f.laMm ?? 0),
      cotaCuadra: f.cotaMm === anterior.cotaMm + (f.desnivelMm ?? 0),
      distanciaCuadra: Math.abs(f.distanciaAcumuladaM - (anterior.distanciaAcumuladaM + f.distanciaParcialM)) < 1e-6,
    }
  })
}

export interface Marca {
  fila: number
  columna: ColumnaAuditable
  valorPropuesto: number
}

export interface EvaluacionAuditoria {
  /** Errores con la celda marcada y el valor correcto propuesto. */
  corregidos: ErrorSembrado[]
  /** Errores con la celda marcada pero un valor incorrecto. */
  malCorregidos: ErrorSembrado[]
  /** Errores sin marcar. */
  pendientes: ErrorSembrado[]
  /** Marcas sobre celdas que estaban bien. */
  sobrantes: Marca[]
  /** Acierto parcial: porcentaje de errores corregidos (§5, 3.1). */
  aciertoPct: number
}

const tolerancia = (columna: ColumnaAuditable, toleranciaMm: number, toleranciaDistanciaM: number) =>
  columna === 'distanciaAcumuladaM' ? toleranciaDistanciaM : toleranciaMm

export function evaluarAuditoria(errores: ErrorSembrado[], marcas: Marca[], toleranciaMm = 1, toleranciaDistanciaM = 0.01): EvaluacionAuditoria {
  const corregidos: ErrorSembrado[] = []
  const malCorregidos: ErrorSembrado[] = []
  const pendientes: ErrorSembrado[] = []
  for (const e of errores) {
    const m = marcas.find((x) => x.fila === e.fila && x.columna === e.columna)
    if (!m) pendientes.push(e)
    else if (Math.abs(m.valorPropuesto - e.valorCorrecto) <= tolerancia(e.columna, toleranciaMm, toleranciaDistanciaM)) corregidos.push(e)
    else malCorregidos.push(e)
  }
  const sobrantes = marcas.filter((m) => !errores.some((e) => e.fila === m.fila && e.columna === m.columna))
  return { corregidos, malCorregidos, pendientes, sobrantes, aciertoPct: (100 * corregidos.length) / errores.length }
}

/** Aplica las correcciones propuestas sobre la tabla entregada. */
export function aplicarMarcas(tabla: FilaAuditoria[], marcas: Marca[]): FilaAuditoria[] {
  const nueva = tabla.map((f) => ({ ...f }))
  for (const m of marcas) nueva[m.fila][m.columna] = m.valorPropuesto
  return nueva
}

/** El perfil corregido coincide con el verdadero, columna por columna. */
export function tablasCoinciden(a: FilaAuditoria[], b: FilaAuditoria[], toleranciaMm = 1, toleranciaDistanciaM = 0.01): boolean {
  const columnas: ColumnaAuditable[] = ['ltMm', 'laMm', 'desnivelMm', 'cotaMm', 'distanciaAcumuladaM']
  return (
    a.length === b.length &&
    a.every((f, i) =>
      columnas.every((col) => {
        const [x, y] = [f[col], b[i][col]]
        if (x === null || y === null) return x === y
        return Math.abs(x - y) <= tolerancia(col, toleranciaMm, toleranciaDistanciaM)
      }),
    )
  )
}
