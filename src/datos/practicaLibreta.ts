import type { TipoVisada } from '@/motor/desniveles'

// Circuito dictado de la libreta de práctica: 4 puntos alrededor del edificio de Ingeniería
// (A–B 45 m, B–C 60 m, C–D 50 m, D–A 55 m). La última lectura viene 4 mm alta, así que el
// circuito cierra en −4 mm: dentro de la tolerancia de 5,5 mm.

export interface LecturaDictada {
  estacion: string
  punto: string
  tipo: TipoVisada
  lecturaMm: number
  distanciaM?: number
}

export const PRACTICA_LIBRETA: { pr: { punto: string; cotaMm: number }; dictado: LecturaDictada[] } = {
  pr: { punto: 'A', cotaMm: 100_000 },
  dictado: [
    { estacion: 'E1', punto: 'A', tipo: 'LT', lecturaMm: 1500 },
    { estacion: 'E1', punto: 'B', tipo: 'LA', lecturaMm: 650, distanciaM: 45 },
    { estacion: 'E2', punto: 'B', tipo: 'LT', lecturaMm: 1420 },
    { estacion: 'E2', punto: 'C', tipo: 'LA', lecturaMm: 850, distanciaM: 60 },
    { estacion: 'E3', punto: 'C', tipo: 'LT', lecturaMm: 900 },
    { estacion: 'E3', punto: 'D', tipo: 'LA', lecturaMm: 1690, distanciaM: 50 },
    { estacion: 'E4', punto: 'D', tipo: 'LT', lecturaMm: 1100 },
    { estacion: 'E4', punto: 'A', tipo: 'LA', lecturaMm: 1734, distanciaM: 55 },
  ],
}
