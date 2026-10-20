import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { cerrarEvaluacion } from './comunes'
import type { ContextoEntrega, Evaluacion } from './tipos'

// Misión 3.2 · Asamblea de la Brigada (§5). Defensa oral fuera del simulador: la cuadrilla prepara
// sus materiales y pide la fecha a la Comisión de Parques. La misión queda "en evaluación" hasta que
// el docente registra la evidencia y la rúbrica; el veredicto lo da la comisión (CP-07).

const t = textos.entrega.m32

/** Lo que la cuadrilla confirma tener listo antes de pedir la defensa. */
export const MATERIALES_3_2 = ['perfil', 'libreta', 'presentacion', 'ensayo'] as const

/** Solo hay un rechazo posible: el de la comisión. Los materiales faltantes bloquean la solicitud. */
export const MOTIVOS_M32 = ['comision'] as const

export function bloqueosM32(ctx: ContextoEntrega): string[] {
  const faltan = MATERIALES_3_2.filter((m) => ctx.formulario[`listo:${m}`] !== 'si').map((m) => t.materiales[m])
  return faltan.length ? [rellenar(t.faltanMateriales, { lista: faltan.join(', ') })] : []
}

/** Con los materiales confirmados, la solicitud pasa a la comisión. */
export const evaluarM32 = (): Evaluacion =>
  cerrarEvaluacion([{ id: 'materiales', ok: true, texto: t.materialesOk }], { lecturasExactas: 0, sinErroresRegistro: true })
