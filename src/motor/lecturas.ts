import { aMm, redondearMedioArriba, type Mm } from './numeros'
import { enteroEntre, uniforme, type Rng } from './azar'
import type { TipoVisada } from './desniveles'

// Lectura simulada de mira (§6.3 y §14). La línea de colimación es un dato interno del motor: sirve
// para generar lecturas coherentes con las cotas del terreno y nunca se muestra ni se exporta.

export interface RangoLectura {
  minimaMm: Mm
  maximaMm: Mm
}

export const rangoDesdeParametros = (lectura: { minimaM: number; maximaM: number }): RangoLectura => ({
  minimaMm: aMm(lectura.minimaM),
  maximaMm: aMm(lectura.maximaM),
})

/**
 * Alturas de colimación posibles para una estación que visa puntos con estas cotas, de modo que
 * todas las lecturas caigan en el rango. Null si no existe: los puntos difieren más que lo que
 * cubre la mira (con 0,500–2,500 m, más de 2,000 m de desnivel).
 */
export function intervaloColimacion(cotasMm: Mm[], rango: RangoLectura): { desdeMm: Mm; hastaMm: Mm } | null {
  const desdeMm = Math.max(...cotasMm) + rango.minimaMm
  const hastaMm = Math.min(...cotasMm) + rango.maximaMm
  return desdeMm <= hastaMm ? { desdeMm, hastaMm } : null
}

/**
 * Elige al azar la colimación interna de una estación. Falla si la estación es imposible.
 * Con `preferidaMm` (suelo de la estación + altura de un instrumento real) la elige cerca de ese
 * valor, dentro de lo posible, para que el nivel dibujado tenga una altura creíble.
 */
export function elegirColimacion(cotasMm: Mm[], rango: RangoLectura, rng: Rng, preferidaMm?: number): Mm {
  const intervalo = intervaloColimacion(cotasMm, rango)
  if (!intervalo) throw new Error('La estación visa puntos con más desnivel del que cubre la mira')
  if (preferidaMm === undefined) return enteroEntre(rng, intervalo.desdeMm, intervalo.hastaMm)
  const objetivo = Math.round(Math.min(intervalo.hastaMm, Math.max(intervalo.desdeMm, preferidaMm)))
  return enteroEntre(rng, Math.max(intervalo.desdeMm, objetivo - 50), Math.min(intervalo.hastaMm, objetivo + 50))
}

/** Lectura verdadera = colimación − cota del punto (§14). */
export const lecturaVerdaderaMm = (colimacionMm: Mm, cotaMm: Mm): Mm => colimacionMm - cotaMm

/** Desviación de la burbuja bajo la cual se considera centrada (fracción del radio del nivel esférico). */
export const BURBUJA_CENTRADA = 0.1

/**
 * Error que agrega a una lectura el instrumento mal nivelado (§6.3): aleatorio, de signo cualquiera,
 * y cuyo máximo crece con la desviación de la burbuja (0 = centrada, 1 = en el borde) hasta
 * `errorMaximoMm`. Con la burbuja centrada no hay error.
 */
export function errorMontajeMm(desviacion: number, errorMaximoMm: number, rng: Rng): Mm {
  const d = Math.min(1, Math.max(0, desviacion))
  if (d <= BURBUJA_CENTRADA) return 0
  return redondearMedioArriba(uniforme(rng, -1, 1) * errorMaximoMm * d)
}

export interface LecturaSimulada {
  estacion: string
  punto: string
  tipo: TipoVisada
  /** Lectura que daría un instrumento perfectamente nivelado. Dato interno. */
  verdaderaMm: Mm
  /** Donde el jugador ve la cruz: verdadera + error de montaje (§14). */
  mostradaMm: Mm
  distanciaM?: number
}

export interface ErroresLectura {
  /** Ingresada − mostrada: cuánto se equivocó el jugador al leer. */
  lecturaMm: Mm
  /** Mostrada − verdadera: lo que aportó el montaje. */
  montajeMm: Mm
  /** Ingresada − verdadera: lo que llega al resultado final. */
  totalMm: Mm
}

export function erroresDeLectura(ingresadaMm: Mm, lectura: Pick<LecturaSimulada, 'verdaderaMm' | 'mostradaMm'>): ErroresLectura {
  return {
    lecturaMm: ingresadaMm - lectura.mostradaMm,
    montajeMm: lectura.mostradaMm - lectura.verdaderaMm,
    totalMm: ingresadaMm - lectura.verdaderaMm,
  }
}

/**
 * Lectura exacta para el XP (§6.2): dentro de ±1 mm de la verdadera. Con la burbuja descentrada
 * ni una lectura perfecta de la cruz alcanza: el montaje también cuenta.
 */
export const esLecturaExacta = (errorTotalMm: Mm, toleranciaMm = 1) => Math.abs(errorTotalMm) <= toleranciaMm
