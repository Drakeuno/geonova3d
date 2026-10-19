import { aPapel, type EscalasPerfil, type EstacionPerfil } from '@/motor/perfil'
import type { Mm } from '@/motor/numeros'

// Geometría del perfil longitudinal sobre el papel, en milímetros y a escala (RF-09). La comparten
// el dibujo en pantalla y el PDF: el origen es la esquina inferior izquierda del área de dibujo,
// en la progresiva 0 y la cota del plano de comparación.

export interface PuntoPerfil extends EstacionPerfil {
  xMm: number
  yMm: number
}

export interface GeometriaPerfil {
  escalas: EscalasPerfil
  planoMm: Mm
  /** Cota del borde superior del área de dibujo: la mayor del perfil, subida al paso de la grilla. */
  techoMm: Mm
  anchoMm: number
  altoMm: number
  puntos: PuntoPerfil[]
  /** Líneas de la grilla de cotas, cada `pasoCotaMm`, con su altura en el papel. */
  marcasCota: { cotaMm: Mm; yMm: number }[]
}

export function geometriaPerfil(estaciones: EstacionPerfil[], escalas: EscalasPerfil, planoMm: Mm, pasoCotaMm: Mm = 500): GeometriaPerfil {
  const mayor = Math.max(planoMm, ...estaciones.map((e) => e.cotaMm))
  const techoMm = Math.max(planoMm + pasoCotaMm, Math.ceil(mayor / pasoCotaMm) * pasoCotaMm)
  const papel = aPapel(estaciones, escalas, planoMm)
  const ultima = estaciones[estaciones.length - 1]
  const anchoMm = ultima ? (ultima.progresivaM * 1000) / escalas.horizontal : 0
  const marcasCota: GeometriaPerfil['marcasCota'] = []
  for (let c = planoMm; c <= techoMm; c += pasoCotaMm) marcasCota.push({ cotaMm: c, yMm: (c - planoMm) / escalas.vertical })
  return {
    escalas,
    planoMm,
    techoMm,
    anchoMm,
    altoMm: (techoMm - planoMm) / escalas.vertical,
    puntos: estaciones.map((e, i) => ({ ...e, xMm: papel[i].xMm, yMm: papel[i].yMm })),
    marcasCota,
  }
}

/** Plano de comparación sugerido: el metro entero bajo la cota más baja. */
export const planoSugeridoMm = (estaciones: EstacionPerfil[]): Mm =>
  estaciones.length ? Math.floor(Math.min(...estaciones.map((e) => e.cotaMm)) / 1000) * 1000 : 0

/** Progresiva en notación de kilometraje: 20 → "0+020", 1240 → "1+240". */
export const textoProgresiva = (m: number) => `${Math.floor(m / 1000)}+${String(Math.round(m % 1000)).padStart(3, '0')}`
