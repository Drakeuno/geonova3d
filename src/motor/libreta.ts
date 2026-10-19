import {
  calcularLibreta,
  comprobacionLecturasMm,
  desnivelMm,
  mismoNombre,
  sumaDesnivelesMm,
  type FilaCalculada,
  type TipoVisada,
  type Visada,
} from './desniveles'
import type { Mm } from './numeros'

// Libreta de campo digital (§6.1 y §14). Fila = una visada. Lo registrado no se borra: las
// correcciones van en una línea nueva que anula la anterior. Tachar es posible, pero se penaliza.

export type ModoCalculo = 'automatico' | 'asistido' | 'manual'

/** Campos numéricos que se pueden tachar (con penalización). */
export type CampoCorregible = 'lecturaMm' | 'distanciaM' | 'desnivelMm' | 'cotaMm'

export interface Tachadura {
  campo: CampoCorregible
  valorAnterior: number | null
  valorNuevo: number | null
  en: number
}

export interface DatosFila {
  estacion: string
  punto: string
  tipo: TipoVisada
  lecturaMm: Mm
  /** Distancia (m) desde el punto visado anterior de la misma estación. Solo en LA. */
  distanciaM: number | null
  /** Δh y cota escritos por el jugador (modos asistido y manual). En automático, null. */
  desnivelMm: Mm | null
  cotaMm: Mm | null
  observaciones: string
}

export interface FilaLibreta extends DatosFila {
  id: string
  /** Número de línea, en el orden en que se escribió. */
  numero: number
  registradaEn: number
  /** Fila que esta corrige. */
  corrigeA: string | null
  /** Fila que anula a esta (su corrección). */
  anuladaPor: string | null
  tachaduras: Tachadura[]
}

export interface RegistroLibreta {
  /** Punto de partida de cota conocida. */
  pr: { punto: string; cotaMm: Mm }
  filas: FilaLibreta[]
}

export const registroVacio = (pr: RegistroLibreta['pr']): RegistroLibreta => ({ pr, filas: [] })

function nuevaFila(r: RegistroLibreta, datos: DatosFila, ahora: number, corrigeA: string | null): FilaLibreta {
  const numero = r.filas.length + 1
  return { ...datos, id: `f${numero}`, numero, registradaEn: ahora, corrigeA, anuladaPor: null, tachaduras: [] }
}

function filaVigente(r: RegistroLibreta, id: string): FilaLibreta {
  const f = r.filas.find((x) => x.id === id)
  if (!f) throw new Error(`La fila ${id} no existe`)
  if (f.anuladaPor) throw new Error(`La fila ${f.numero} está anulada: corrige la fila que la reemplaza`)
  return f
}

/** Registra una fila nueva. Una vez registrada, queda fija. */
export const registrarFila = (r: RegistroLibreta, datos: DatosFila, ahora: number): RegistroLibreta => ({
  ...r,
  filas: [...r.filas, nuevaFila(r, datos, ahora, null)],
})

/** Corrección permitida: una línea nueva que anula la fila original, sin penalización. */
export function corregirEnLineaNueva(r: RegistroLibreta, idOriginal: string, datos: DatosFila, ahora: number): RegistroLibreta {
  const original = filaVigente(r, idOriginal)
  const correccion = nuevaFila(r, datos, ahora, original.id)
  return {
    ...r,
    filas: [...r.filas.map((f) => (f.id === original.id ? { ...f, anuladaPor: correccion.id } : f)), correccion],
  }
}

/** Tachadura forzada: cambia el valor sobre la misma fila y deja constancia. Cuesta XP (CP-03). */
export function tacharCelda(r: RegistroLibreta, idFila: string, campo: CampoCorregible, valorNuevo: number | null, ahora: number): RegistroLibreta {
  if (campo === 'lecturaMm' && valorNuevo === null) throw new Error('La lectura no puede quedar vacía')
  const f = filaVigente(r, idFila)
  const tachadura: Tachadura = { campo, valorAnterior: f[campo], valorNuevo, en: ahora }
  const tachada = { ...f, [campo]: valorNuevo, tachaduras: [...f.tachaduras, tachadura] } as FilaLibreta
  return { ...r, filas: r.filas.map((x) => (x.id === idFila ? tachada : x)) }
}

/**
 * Filas que valen para el cálculo, en su orden lógico: cada corrección ocupa el lugar de la fila que
 * anuló, aunque se haya escrito al final de la libreta.
 */
export function filasVigentes(r: RegistroLibreta): FilaLibreta[] {
  const porId = new Map(r.filas.map((f) => [f.id, f]))
  return r.filas
    .filter((f) => f.corrigeA === null)
    .map((f) => {
      let actual = f
      while (actual.anuladaPor) actual = porId.get(actual.anuladaPor)!
      return actual
    })
}

const aVisada = (f: FilaLibreta): Visada => ({
  estacion: f.estacion,
  punto: f.punto,
  tipo: f.tipo,
  lecturaMm: f.lecturaMm,
  ...(f.distanciaM !== null && { distanciaM: f.distanciaM }),
})

/** Cálculo del sistema sobre las filas vigentes (Δh = LT − LA, cotas por suma acumulada). */
export function calcularRegistro(r: RegistroLibreta) {
  const vigentes = filasVigentes(r)
  const calculo = calcularLibreta(vigentes.map(aVisada), r.pr.cotaMm)
  return { vigentes, calculo }
}

export interface RevisionCalculo {
  id: string
  numero: number
  /** Δh escrito = LT − LA de las lecturas registradas. Null si no hay Δh escrito. */
  desnivelOk: boolean | null
  /** Cota escrita = cota anterior escrita + Δh escrito. Null si falta algún dato. */
  cotaOk: boolean | null
}

/**
 * Revisa los cálculos que escribe el jugador, contra sus propias lecturas: primero que el Δh sea
 * LT − LA y luego que la cota sea la anterior más ese Δh. Así cada error queda en su fila.
 */
export function revisarCalculosJugador(r: RegistroLibreta): RevisionCalculo[] {
  const revision: RevisionCalculo[] = []
  let cotaAnterior: Mm | null = r.pr.cotaMm
  let lecturaAnterior: Mm | null = null
  let estacion: string | null = null
  for (const f of filasVigentes(r)) {
    if (f.tipo === 'LT') {
      estacion = f.estacion
      lecturaAnterior = f.lecturaMm
      continue
    }
    const esperado = mismoNombre(f.estacion, estacion) && lecturaAnterior !== null ? desnivelMm(lecturaAnterior, f.lecturaMm) : null
    const desnivelOk = f.desnivelMm === null ? null : esperado !== null && f.desnivelMm === esperado
    const cotaOk = f.cotaMm === null || f.desnivelMm === null || cotaAnterior === null ? null : f.cotaMm === cotaAnterior + f.desnivelMm
    revision.push({ id: f.id, numero: f.numero, desnivelOk, cotaOk })
    lecturaAnterior = f.lecturaMm
    cotaAnterior = f.cotaMm
  }
  return revision
}

/**
 * Lo que la fila en borrador debería llevar según las filas ya registradas: el Δh que dan sus
 * lecturas y la cota anterior (la escrita por el jugador, o la del sistema en modo automático).
 * Lo usa el modo asistido para verificar cada valor apenas se escribe.
 */
export function esperadoParaBorrador(
  r: RegistroLibreta,
  modo: ModoCalculo,
  borrador: { estacion: string; tipo: TipoVisada; lecturaMm: Mm | null },
  corrigeA: string | null = null,
): { desnivelMm: Mm | null; cotaAnteriorMm: Mm | null } {
  const vigentes = filasVigentes(r)
  const hasta = corrigeA ? vigentes.findIndex((f) => f.id === corrigeA) : vigentes.length
  const previas = vigentes.slice(0, hasta < 0 ? vigentes.length : hasta)
  if (borrador.tipo === 'LT') return { desnivelMm: null, cotaAnteriorMm: null }

  const ultimaLt = [...previas].reverse().find((f) => f.tipo === 'LT')
  const enEstacion = ultimaLt && mismoNombre(ultimaLt.estacion, borrador.estacion) ? previas.slice(previas.indexOf(ultimaLt)) : []
  const lecturaAnterior = enEstacion.length ? enEstacion[enEstacion.length - 1].lecturaMm : null
  const desnivel = lecturaAnterior !== null && borrador.lecturaMm !== null ? desnivelMm(lecturaAnterior, borrador.lecturaMm) : null

  let cotaAnteriorMm: Mm | null = r.pr.cotaMm
  if (modo === 'automatico') {
    const { filas } = calcularLibreta(previas.map(aVisada), r.pr.cotaMm)
    cotaAnteriorMm = filas.length ? filas[filas.length - 1].cotaMm : r.pr.cotaMm
  } else {
    const ultimaLa = [...previas].reverse().find((f) => f.tipo === 'LA')
    if (ultimaLa) cotaAnteriorMm = ultimaLa.cotaMm
  }
  return { desnivelMm: desnivel, cotaAnteriorMm }
}

export interface RevisionEntrega {
  /** Números de fila LA sin distancia: bloquean la entrega (§14). */
  faltanDistancias: number[]
  /** Números de fila LA sin Δh o sin cota, en los modos en que los calcula el jugador. */
  faltanCalculos: number[]
  /** Números de fila con Δh o cota mal calculados (no bloquean: la misión los evalúa). */
  calculosErroneos: number[]
  /** Problemas de secuencia de la libreta (LT fuera de lugar, LA sin LT…). */
  problemas: string[]
  entregable: boolean
}

export function revisarParaEntrega(r: RegistroLibreta, modo: ModoCalculo): RevisionEntrega {
  const { vigentes, calculo } = calcularRegistro(r)
  const la = vigentes.filter((f) => f.tipo === 'LA')
  const faltanDistancias = la.filter((f) => f.distanciaM === null).map((f) => f.numero)
  const faltanCalculos = modo === 'automatico' ? [] : la.filter((f) => f.desnivelMm === null || f.cotaMm === null).map((f) => f.numero)
  const calculosErroneos =
    modo === 'automatico'
      ? []
      : revisarCalculosJugador(r)
          .filter((x) => x.desnivelOk === false || x.cotaOk === false)
          .map((x) => x.numero)
  // Las distancias faltantes ya se informan aparte.
  const problemas = calculo.problemas.filter((p) => !p.includes('falta la distancia'))
  return {
    faltanDistancias,
    faltanCalculos,
    calculosErroneos,
    problemas,
    entregable: vigentes.length > 0 && faltanDistancias.length === 0 && faltanCalculos.length === 0 && problemas.length === 0,
  }
}

/** Comprobación aritmética de la libreta: ΣLT − ΣLA (de cierre de estación) = ΣΔh (§3.3). */
export function comprobacionAritmetica(r: RegistroLibreta) {
  const { vigentes, calculo } = calcularRegistro(r)
  const visadas = vigentes.map(aVisada)
  const sumaLtMm = visadas.filter((v) => v.tipo === 'LT').reduce((s, v) => s + v.lecturaMm, 0)
  const diferencia = comprobacionLecturasMm(visadas)
  const sumaDesniveles = sumaDesnivelesMm(calculo.filas)
  return { sumaLtMm, sumaLaMm: sumaLtMm - diferencia, sumaDesnivelesMm: sumaDesniveles, cuadra: diferencia === sumaDesniveles }
}

export const cantidadTachaduras = (r: RegistroLibreta) => r.filas.reduce((s, f) => s + f.tachaduras.length, 0)

/** Libreta sin correcciones ni tachaduras: da el bonus de la 1.1. */
export const sinErroresRegistro = (r: RegistroLibreta) => r.filas.every((f) => f.corrigeA === null && f.tachaduras.length === 0)

/** Cálculo del sistema de cada fila vigente, por id (para mostrar en modo automático). */
export function calculoPorFila(r: RegistroLibreta): Map<string, FilaCalculada> {
  const { vigentes, calculo } = calcularRegistro(r)
  return new Map(vigentes.map((f, i) => [f.id, calculo.filas[i]]))
}
