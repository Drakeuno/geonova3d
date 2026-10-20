import { FileDown, Presentation } from 'lucide-react'
import type { Parametros } from '@/datos/parametros'
import type { FilaAuditoria } from '@/motor/auditoria'
import { CRITERIOS } from '@/motor/evaluacionOral'
import { MATERIALES_3_2 } from '@/misiones/m32'
import { geometriaPerfil, planoSugeridoMm } from '@/componentes/perfil/geometriaPerfil'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { perfilDeTabla } from './Auditoria'
import { Subtitulo, TarjetaEtapa, type PropsFormulario } from './Formulario'

// Etapa de la 3.2: preparar la defensa ante la Comisión de Parques. La presentación ocurre fuera del
// simulador; aquí se confirma que los materiales están listos y se pide la fecha.

const t = textos.asamblea

interface Props extends PropsFormulario {
  parametros: Parametros
  /** Perfil corregido en la 3.1 (null si aún no se ha hecho). */
  tablaCorregida: FilaAuditoria[] | null
  sendero: string
  estudiante: string
}

export function Asamblea({ parametros, tablaCorregida, sendero, estudiante, formulario, onCambio }: Props) {
  const p = parametros.evaluacionOral
  const exportar = () => {
    if (!tablaCorregida) return
    const estaciones = perfilDeTabla(tablaCorregida)
    const g = geometriaPerfil(estaciones, { horizontal: parametros.perfil.escalaHorizontal, vertical: parametros.perfil.escalaVertical }, planoSugeridoMm(estaciones))
    const rotulos = { titulo: rellenar(textos.auditoria.tituloPerfil, { sendero }), ejeX: textos.perfil.ejes.progresiva, ejeY: textos.perfil.ejes.cota }
    void import('@/componentes/perfil/exportarPerfilPdf').then((m) =>
      m.exportarPerfilPdf({ g, rotulos, estudiante, mision: '3.2 Asamblea de la Brigada', archivo: `perfil-corregido-${estudiante.replace(/\s+/g, '-')}.pdf` }),
    )
  }

  return (
    <TarjetaEtapa icono={<Presentation size={22} aria-hidden />} titulo={t.titulo} bajada={t.bajada}>
      <div>
        <Subtitulo>{t.comoEvalua}</Subtitulo>
        <p className="mt-1 text-sm text-tierra-700">{rellenar(t.reglas, { n: p.evaluadores, pct: p.aprobacionMinimaPct })}</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {CRITERIOS.map((c) => (
            <li key={c} className="rounded-xl bg-poncho-50 px-3 py-2 text-sm">
              <span className="font-semibold text-poncho-900">{t.criterios[c].nombre}</span>
              <span className="block text-xs text-tierra-700">{t.criterios[c].ayuda}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Subtitulo>{t.materiales}</Subtitulo>
        <ul className="mt-2 space-y-2">
          {MATERIALES_3_2.map((m) => (
            <li key={m}>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-tierra-100">
                <input
                  type="checkbox"
                  checked={formulario[`listo:${m}`] === 'si'}
                  onChange={(e) => onCambio(`listo:${m}`, e.target.checked ? 'si' : '')}
                  className="mt-1 h-4 w-4 accent-bosque-700"
                />
                <span>
                  <span className="block font-semibold text-tierra-900">{t.items[m].nombre}</span>
                  <span className="block text-xs text-tierra-600">{t.items[m].ayuda}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <button type="button" className="btn-neutro mt-2" disabled={!tablaCorregida} onClick={exportar}>
          <FileDown size={16} aria-hidden /> {tablaCorregida ? t.descargarPerfil : t.sinPerfil}
        </button>
      </div>
    </TarjetaEtapa>
  )
}
