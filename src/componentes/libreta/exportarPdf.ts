import type { ModoCalculo, RegistroLibreta } from '@/motor/libreta'
import { comprobacionAritmetica, cantidadTachaduras } from '@/motor/libreta'
import { formatearMm } from '@/motor/numeros'
import textos from '@/textos/es-CL.json'
import { textoDistancia, vistaLibreta, type Celda } from './vistaLibreta'

// Exportación de la libreta a PDF (§6.1, para el informe de la 3.3). Las fuentes estándar del PDF
// no tienen Δ, Σ, − ni flechas: se escriben con equivalentes que sí tienen.

const ascii = (s: string) => s.replace(/−/g, '-').replace(/Δ/g, 'Dh').replace(/Σ\s?/g, 'Suma ')

function textoCelda(c: Celda | null): string {
  if (!c) return ''
  const anterior = (v: number | null) =>
    v === null ? '-' : c.campo === 'distanciaM' ? textoDistancia(v) : formatearMm(v, { signo: c.campo === 'desnivelMm' })
  const tachado = c.tachaduras.map((t) => `[tachado ${anterior(t.valorAnterior)}] `).join('')
  return ascii(tachado + c.texto)
}

export const COLUMNAS_PDF = ['N°', 'Est.', 'Punto', 'LT (m)', 'LA (m)', 'Dh (m)', 'Cota (m)', 'Dist. (m)', 'Observaciones']

/** Filas de la tabla del PDF, en el orden en que se escribieron (las anuladas quedan a la vista). */
export function filasParaPdf(r: RegistroLibreta, modo: ModoCalculo): string[][] {
  const t = textos.libreta
  return [
    ['', '', r.pr.punto, '', '', '', formatearMm(r.pr.cotaMm), '', ascii(t.pr)],
    ...vistaLibreta(r, modo).map((v) => {
      const notas = [
        v.fila.anuladaPor ? `ANULADA, ver fila ${v.fila.anuladaPor.slice(1)}` : '',
        v.fila.corrigeA ? `Corrige fila ${v.fila.corrigeA.slice(1)}` : '',
        v.fila.observaciones,
      ].filter(Boolean)
      return [
        String(v.fila.numero),
        v.fila.estacion,
        v.fila.punto,
        textoCelda(v.lt),
        textoCelda(v.la),
        textoCelda(v.desnivel),
        textoCelda(v.cota),
        textoCelda(v.distancia),
        ascii(notas.join(' · ')),
      ]
    }),
  ]
}

export interface DatosPdf {
  registro: RegistroLibreta
  modo: ModoCalculo
  titulo: string
  estudiante: string
  archivo: string
}

/** Genera y descarga el PDF. jsPDF se carga solo al exportar, para no pesar en la carga inicial. */
export async function exportarLibretaPdf({ registro, modo, titulo, estudiante, archivo }: DatosPdf) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const fecha = new Date().toLocaleDateString('es-CL')

  doc.setFont('helvetica', 'bold').setFontSize(16).text(`Libreta de campo · ${titulo}`, 14, 16)
  doc
    .setFont('helvetica', 'normal')
    .setFontSize(10)
    .text(`${estudiante} · ${fecha} · ${ascii(textos.libreta.modo[modo])} · GeoNova3D, Misión Topógrafo`, 14, 23)

  autoTable(doc, {
    startY: 28,
    head: [COLUMNAS_PDF],
    body: filasParaPdf(registro, modo),
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.6 },
    headStyles: { fillColor: [58, 85, 48], textColor: 255 },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
    didParseCell: (d) => {
      if (d.section === 'body' && /ANULADA/.test(String(d.row.raw && (d.row.raw as string[])[8]))) d.cell.styles.textColor = [115, 87, 60]
    },
  })

  const { sumaLtMm, sumaLaMm, sumaDesnivelesMm } = comprobacionAritmetica(registro)
  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  doc
    .setFontSize(10)
    .text(
      `Suma LT = ${ascii(formatearMm(sumaLtMm))}   Suma LA (cierre de estación) = ${ascii(formatearMm(sumaLaMm))}   Suma Dh = ${ascii(
        formatearMm(sumaDesnivelesMm, { signo: true }),
      )}   Tachaduras: ${cantidadTachaduras(registro)}`,
      14,
      y,
    )
  doc.save(archivo)
}
