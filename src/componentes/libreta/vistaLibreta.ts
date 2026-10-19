import {
  calculoPorFila,
  filasVigentes,
  revisarCalculosJugador,
  type CampoCorregible,
  type FilaLibreta,
  type ModoCalculo,
  type RegistroLibreta,
  type Tachadura,
} from '@/motor/libreta'
import { formatearMm, formatearNumero, type Mm } from '@/motor/numeros'

// Qué se muestra en cada celda de la libreta según el modo de cálculo. La libreta solo muestra
// LT, LA, Δh, cotas y distancias (CP-08).

export interface Celda {
  campo: CampoCorregible
  texto: string
  tachaduras: Tachadura[]
  /** Valor escrito por el jugador en una fila vigente: intentar cambiarlo abre el aviso de bloqueo. */
  editable: boolean
  /** En modo asistido: si el cálculo del jugador cuadra con sus lecturas. */
  revision?: 'ok' | 'error'
  /** Valor puesto por el sistema (cálculo automático o cota repetida del punto de cambio). */
  delSistema?: boolean
}

export interface FilaVista {
  fila: FilaLibreta
  vigente: boolean
  lt: Celda | null
  la: Celda | null
  desnivel: Celda | null
  cota: Celda | null
  distancia: Celda | null
}

const tachadurasDe = (f: FilaLibreta, campo: CampoCorregible) => f.tachaduras.filter((t) => t.campo === campo)
const textoMm = (mm: Mm | null, signo = false) => (mm === null ? '' : formatearMm(mm, { signo }))

export const textoDistancia = (m: number | null) => (m === null ? '' : formatearNumero(m, 2))

export function vistaLibreta(r: RegistroLibreta, modo: ModoCalculo): FilaVista[] {
  const vigentes = filasVigentes(r)
  const idsVigentes = new Set(vigentes.map((f) => f.id))
  const sistema = calculoPorFila(r)
  const revision = new Map(revisarCalculosJugador(r).map((x) => [x.id, x]))

  // Cota del punto de cada fila LT según quien calcula: el jugador (manual/asistido) o el sistema.
  const cotaPuntoCambio = new Map<string, Mm | null>()
  let cotaActual: Mm | null = r.pr.cotaMm
  for (const f of vigentes) {
    if (f.tipo === 'LT') cotaPuntoCambio.set(f.id, modo === 'automatico' ? (sistema.get(f.id)?.cotaMm ?? null) : cotaActual)
    else cotaActual = f.cotaMm
  }

  return r.filas.map((f): FilaVista => {
    const vigente = idsVigentes.has(f.id)
    const celda = (campo: CampoCorregible, texto: string, extra: Partial<Celda> = {}): Celda => ({
      campo,
      texto,
      tachaduras: tachadurasDe(f, campo),
      editable: vigente,
      ...extra,
    })
    const lectura = celda('lecturaMm', textoMm(f.lecturaMm))
    const marca = (ok: boolean | null | undefined) =>
      modo === 'asistido' && ok !== null && ok !== undefined ? (ok ? 'ok' : 'error') : undefined

    if (f.tipo === 'LT') {
      const cota = vigente ? (cotaPuntoCambio.get(f.id) ?? null) : null
      return {
        fila: f,
        vigente,
        lt: lectura,
        la: null,
        desnivel: null,
        cota: cota === null ? null : celda('cotaMm', textoMm(cota), { editable: false, delSistema: true }),
        distancia: null,
      }
    }

    const calculado = sistema.get(f.id)
    const rev = revision.get(f.id)
    const automatico = modo === 'automatico'
    return {
      fila: f,
      vigente,
      lt: null,
      la: lectura,
      desnivel: automatico
        ? calculado && vigente
          ? celda('desnivelMm', textoMm(calculado.desnivelMm ?? null, true), { editable: false, delSistema: true })
          : null
        : celda('desnivelMm', textoMm(f.desnivelMm, true), { revision: marca(rev?.desnivelOk) }),
      cota: automatico
        ? calculado && vigente
          ? celda('cotaMm', textoMm(calculado.cotaMm), { editable: false, delSistema: true })
          : null
        : celda('cotaMm', textoMm(f.cotaMm), { revision: marca(rev?.cotaOk) }),
      distancia: celda('distanciaM', textoDistancia(f.distanciaM)),
    }
  })
}
