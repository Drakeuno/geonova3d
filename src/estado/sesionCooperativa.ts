import { useMemo, useState } from 'react'
import type { Tramo } from '@/motor/cooperativa'
import { mismoNombre } from '@/motor/desniveles'
import { cotaVerdaderaMm, type Escenario, type LecturaPlanificada } from '@/motor/escenarios'
import { calcularRegistro, registrarFila, registroVacio, type DatosFila, type RegistroLibreta } from '@/motor/libreta'
import { parsearMetrosAMm, type Mm } from '@/motor/numeros'
import { CAUSAS } from '@/motor/cooperativa'
import { cotaDeM, desplazamientoDelEvento, idaDe, libretaSimulada, otroTramo, PUNTO_ENCUENTRO, type PreparacionSesion } from '@/misiones/m23'
import type { Formulario, ResolucionPublica, SesionCooperativa } from '@/misiones/tipos'
import { useCanalCooperativo, type EstadoCuadrilla } from './canalCooperativo'

// Estado de la 2.3 visto desde una ventana: la cuadrilla propia, la compañera (simulada o la otra
// ventana) y lo que se confronta en M.

/** Cuadrilla que juega esta ventana. Se guarda por pestaña: dos ventanas, dos cuadrillas. */
export function useTramoVentana(clave: string): [Tramo | null, (t: Tramo | null) => void] {
  const leer = (): Tramo | null => {
    try {
      const v = sessionStorage.getItem(clave)
      return v === 'A' || v === 'B' ? v : null
    } catch {
      return null
    }
  }
  const [tramo, setTramo] = useState<Tramo | null>(leer)
  const guardar = (t: Tramo | null) => {
    try {
      if (t) sessionStorage.setItem(clave, t)
      else sessionStorage.removeItem(clave)
    } catch {
      // Sin almacenamiento por pestaña, vale solo mientras la página esté abierta.
    }
    setTramo(t)
  }
  return [tramo, guardar]
}

const prDe = (escenario: Escenario, lecturas: LecturaPlanificada[]) => ({ punto: lecturas[0].punto, cotaMm: cotaVerdaderaMm(escenario, lecturas[0].punto) })

/** Arma una libreta a partir de las filas que anunció la otra ventana. */
function registroDesdeFilas(pr: RegistroLibreta['pr'], filas: DatosFila[]): RegistroLibreta {
  return filas.reduce((r, f, i) => registrarFila(r, f, i), registroVacio(pr))
}

/** Resolución propia, para anunciarla a la otra cuadrilla cuando está completa. */
export function resolucionDe(f: Formulario): ResolucionPublica | null {
  const cotaComunMm = parsearMetrosAMm(f.cotaComun ?? '')
  if ((f.tramo !== 'A' && f.tramo !== 'B') || !f.estacion || !(CAUSAS as readonly string[]).includes(f.causa ?? '') || cotaComunMm === null) return null
  return { tramo: f.tramo, estacion: f.estacion, causa: f.causa, cotaComunMm, documentada: (f.procedimiento ?? '').trim().length >= 40 }
}

export interface Companero {
  tramo: Tramo
  simulado: boolean
  /** Ventanas: hay señal de la otra ventana. La simulada siempre está. */
  conectada: boolean
  /** Llegó a su última postura de ida: ya puede leer M. */
  enM: boolean
  /** Su libreta, visible desde la confrontación en M (antes, null). */
  registro: RegistroLibreta | null
  lecturas: LecturaPlanificada[]
  resolucion: ResolucionPublica | null
}

export interface EstadoSesion {
  companero: Companero
  cotaMPropia: Mm | null
  cotaMCompanero: Mm | null
  /** Las dos cuadrillas ya tienen su cota de M: se confrontan. */
  confrontada: boolean
  sesion: SesionCooperativa
  bloqueo: (l: LecturaPlanificada) => string | null
  desplazamiento: (l: LecturaPlanificada) => number
}

interface Opciones {
  activa: boolean
  escenario: Escenario
  prep: PreparacionSesion | null
  tramo: Tramo
  modo: 'simulada' | 'ventanas'
  codigo: string | null
  semilla: number
  registroPropio: RegistroLibreta
  formulario: Formulario
  textoBloqueoM: string
}

export function useEstadoSesion(o: Opciones): EstadoSesion | null {
  const otro = otroTramo(o.tramo)
  const vigentes = calcularRegistro(o.registroPropio).vigentes
  const propio: EstadoCuadrilla | null =
    o.activa && o.modo === 'ventanas'
      ? {
          tramo: o.tramo,
          filas: vigentes.map(({ estacion, punto, tipo, lecturaMm, distanciaM, desnivelMm, cotaMm, observaciones }) => ({
            estacion,
            punto,
            tipo,
            lecturaMm,
            distanciaM,
            desnivelMm,
            cotaMm,
            observaciones,
          })),
          resolucion: resolucionDe(o.formulario),
        }
      : null
  const deLaVentana = useCanalCooperativo(o.activa && o.modo === 'ventanas' ? o.codigo : null, propio)

  const simulada = useMemo(
    () =>
      o.activa && o.prep && o.modo === 'simulada'
        ? libretaSimulada(o.prep.lecturas[otro], prDe(o.escenario, o.prep.lecturas[otro]), o.prep.evento, otro, o.semilla)
        : null,
    [o.activa, o.prep, o.modo, o.escenario, otro, o.semilla],
  )

  if (!o.activa || !o.prep) return null
  const prep = o.prep
  const lecturasPropias = prep.lecturas[o.tramo]
  const lecturasOtro = prep.lecturas[otro]
  const paradaAntesDeM = idaDe(lecturasOtro).length - 1
  const cotaMPropia = cotaDeM(o.registroPropio, lecturasPropias)

  let companero: Companero
  if (o.modo === 'simulada') {
    // La simulada avanza al ritmo de quien juega: llega a M cuando uno llega a su última postura de ida.
    const enM = vigentes.length >= idaDe(lecturasPropias).length - 1
    companero = {
      tramo: otro,
      simulado: true,
      conectada: true,
      enM,
      registro: cotaMPropia !== null ? simulada : null,
      lecturas: lecturasOtro,
      resolucion: null,
    }
  } else {
    const registro = deLaVentana ? registroDesdeFilas(prDe(o.escenario, lecturasOtro), deLaVentana.filas) : null
    companero = {
      tramo: otro,
      simulado: false,
      conectada: deLaVentana !== null,
      enM: (deLaVentana?.filas.length ?? 0) >= paradaAntesDeM,
      registro: cotaMPropia !== null ? registro : null,
      lecturas: lecturasOtro,
      resolucion: deLaVentana?.resolucion ?? null,
    }
  }

  const cotaMCompanero = companero.registro ? cotaDeM(companero.registro, lecturasOtro) : null
  const sesion: SesionCooperativa = {
    tramo: o.tramo,
    evento: prep.evento,
    estacionDelEvento: prep.estacionDelEvento,
    companero: { simulado: companero.simulado, registro: companero.registro, lecturas: lecturasOtro, resolucion: companero.resolucion },
  }
  return {
    companero,
    cotaMPropia,
    cotaMCompanero,
    confrontada: cotaMPropia !== null && cotaMCompanero !== null,
    sesion,
    // M se lee recién cuando las dos cuadrillas llegan (§14).
    bloqueo: (l) => (mismoNombre(l.punto, PUNTO_ENCUENTRO) && !companero.enM ? o.textoBloqueoM : null),
    desplazamiento: (l) => desplazamientoDelEvento(prep, o.tramo, l),
  }
}
