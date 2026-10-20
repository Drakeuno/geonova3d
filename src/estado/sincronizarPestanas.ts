import { useJuego } from './juego'
import { useLibretas } from './libretas'
import { useViaje } from './viaje'

// Dos pestañas del mismo navegador comparten el almacenamiento local, pero cada una tiene su copia en
// memoria. Si una escribe, la otra relee lo guardado: así no se pisan (2.3 con dos ventanas, o un
// estudiante que abre la misión dos veces).

const ALMACENES = {
  gn3d_libretas_v1: useLibretas,
  gn3d_viaje_v1: useViaje,
  gn3d_juego_v1: useJuego,
} as const

export function sincronizarPestanas() {
  if (typeof window === 'undefined') return
  window.addEventListener('storage', (e) => {
    const almacen = e.key ? ALMACENES[e.key as keyof typeof ALMACENES] : undefined
    if (almacen) void almacen.persist.rehydrate()
  })
}
