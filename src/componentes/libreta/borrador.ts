import { aMetros, formatearMm, parsearMetrosAMm } from '@/motor/numeros'
import type { DatosFila, FilaLibreta, ModoCalculo } from '@/motor/libreta'
import type { TipoVisada } from '@/motor/desniveles'
import textos from '@/textos/es-CL.json'

// La línea que el jugador está escribiendo, tal como la escribe (texto), y su lectura a números.

export interface Borrador {
  estacion: string
  punto: string
  tipo: TipoVisada
  lectura: string
  distancia: string
  desnivel: string
  cota: string
  observaciones: string
  /** Si es una corrección en línea nueva, la fila que corrige. */
  corrigeA: string | null
}

export type CampoBorrador = 'estacion' | 'punto' | 'lectura' | 'distancia' | 'desnivel' | 'cota'

export interface VisadaSugerida {
  estacion: string
  punto: string
  tipo: TipoVisada
}

export const borradorVacio = (sugerida?: VisadaSugerida): Borrador => ({
  estacion: sugerida?.estacion ?? '',
  punto: sugerida?.punto ?? '',
  tipo: sugerida?.tipo ?? 'LT',
  lectura: '',
  distancia: '',
  desnivel: '',
  cota: '',
  observaciones: '',
  corrigeA: null,
})

const textoMm = (mm: number | null) => (mm === null ? '' : formatearMm(mm).replace('−', '-'))
const textoMetros = (m: number | null) => (m === null ? '' : String(m).replace('.', ','))

/** Borrador de corrección: parte de los valores de la fila que se corrige. */
export const borradorDesdeFila = (f: FilaLibreta): Borrador => ({
  estacion: f.estacion,
  punto: f.punto,
  tipo: f.tipo,
  lectura: textoMm(f.lecturaMm),
  distancia: textoMetros(f.distanciaM),
  desnivel: textoMm(f.desnivelMm),
  cota: textoMm(f.cotaMm),
  observaciones: f.observaciones,
  corrigeA: f.id,
})

const e = textos.libreta.errores

/**
 * Convierte el borrador en datos de fila. La lectura es obligatoria; la distancia, el Δh y la cota
 * pueden quedar en blanco (la revisión de entrega los exige después), pero si se escriben deben ser
 * números válidos.
 */
export function leerBorrador(
  b: Borrador,
  modo: ModoCalculo,
  largoMiraMm: number,
): { datos: DatosFila | null; errores: Partial<Record<CampoBorrador, string>> } {
  const errores: Partial<Record<CampoBorrador, string>> = {}
  if (!b.estacion.trim()) errores.estacion = e.estacion
  if (!b.punto.trim()) errores.punto = e.punto

  const lecturaMm = parsearMetrosAMm(b.lectura)
  if (!b.lectura.trim()) errores.lectura = e.lecturaFalta
  else if (lecturaMm === null) errores.lectura = e.numero
  else if (lecturaMm < 0 || lecturaMm > largoMiraMm) errores.lectura = e.fueraDeMira.replace('{largo}', formatearMm(largoMiraMm))

  const esLa = b.tipo === 'LA'
  const opcional = (texto: string, campo: CampoBorrador): number | null => {
    if (!esLa || !texto.trim()) return null
    const v = parsearMetrosAMm(texto)
    if (v === null) errores[campo] = e.numero
    return v
  }
  const distanciaMm = opcional(b.distancia, 'distancia')
  if (distanciaMm !== null && distanciaMm <= 0) errores.distancia = e.distancia
  const calcula = modo !== 'automatico'
  const desnivelMm = calcula ? opcional(b.desnivel, 'desnivel') : null
  const cotaMm = calcula ? opcional(b.cota, 'cota') : null

  if (Object.keys(errores).length) return { datos: null, errores }
  return {
    datos: {
      estacion: b.estacion.trim(),
      punto: b.punto.trim(),
      tipo: b.tipo,
      lecturaMm: lecturaMm!,
      distanciaM: distanciaMm === null ? null : aMetros(distanciaMm),
      desnivelMm,
      cotaMm,
      observaciones: b.observaciones.trim(),
    },
    errores,
  }
}
