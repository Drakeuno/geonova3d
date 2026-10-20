import { z } from 'zod'
import { aMm } from '@/motor/numeros'
import type { EstacionPerfil } from '@/motor/perfil'

// Perfil "verdadero" que la contratista levantó para la Misión 3.1 (§5). Vive en
// `public/datos/auditoria.json`: el co-diseño puede cambiar el sendero sin recompilar. Las lecturas y
// los 5 errores se generan en cada intento con su semilla.

export const esquemaAuditoria = z.object({
  version: z.literal(1),
  sendero: z.string().min(1),
  estacionamientoM: z.number().positive(),
  /** Al menos E0–E5: la siembra de los 5 errores necesita 5 tramos. */
  estaciones: z.array(z.object({ id: z.string().min(1), cota: z.number() })).min(6),
})

export type DatosAuditoria = z.infer<typeof esquemaAuditoria>

export const estacionesAuditoria = (d: DatosAuditoria): EstacionPerfil[] =>
  d.estaciones.map((e, i) => ({ id: e.id, progresivaM: i * d.estacionamientoM, cotaMm: aMm(e.cota) }))

export async function cargarAuditoria(): Promise<DatosAuditoria> {
  const r = await fetch(`${import.meta.env.BASE_URL}datos/auditoria.json`)
  if (!r.ok) throw new Error(`No se pudo leer auditoria.json (HTTP ${r.status})`)
  return esquemaAuditoria.parse(await r.json())
}
