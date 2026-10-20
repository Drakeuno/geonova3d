import type { PuntoCompensado } from '@/motor/desniveles'
import type { ModoCalculo, RegistroLibreta } from '@/motor/libreta'
import { formatearMm, formatearNumero, type Mm } from '@/motor/numeros'
import type { EsperadoPlanilla } from '@/misiones/m13'
import type { EntradasCompensacion } from '@/misiones/tipos'
import { COLUMNAS_PDF, filasParaPdf } from '@/componentes/libreta/exportarPdf'
import { textoProgresiva } from '@/componentes/perfil/geometriaPerfil'
import textos from '@/textos/es-CL.json'

// Informe técnico de la 3.3 (§5): libretas, cierre y compensación del circuito, perfil, análisis de
// pendientes y conclusiones, en un PDF A4 para entregar y defender ante la comisión. El perfil va como
// esquema en la página; el plano a escala se exporta aparte desde la plantilla del perfil.

const t = textos.integrador.pdf
const ascii = (s: string) => s.replace(/−/g, '-').replace(/Δh/g, 'Dh').replace(/Δ/g, 'D').replace(/Σ\s?/g, 'Suma ').replace(/ᵢ/g, 'i')

export interface DatosInforme {
  titulo: string
  estudiante: string
  cuadrilla: string
  conclusiones: string
  pr: { punto: string; cotaMm: Mm }
  modo: ModoCalculo
  circuito: {
    registro: RegistroLibreta
    errorMm: Mm
    toleranciaMm: number
    longitudM: number
    compensados: PuntoCompensado[]
    entradas: EntradasCompensacion
  }
  perfil: {
    registro: RegistroLibreta
    planilla: EsperadoPlanilla[]
    pendientes: { tramo: string; texto: string }[]
    tramoCritico: string
    cierre: { errorMm: Mm | null; toleranciaMm: number }
  }
  archivo: string
}

export async function exportarInforme(d: DatosInforme) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const ancho = doc.internal.pageSize.getWidth()
  const margen = 16
  let y = 20
  const final = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  const seccion = (titulo: string) => {
    if (y > 250) {
      doc.addPage()
      y = 20
    }
    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(58, 85, 48).text(ascii(titulo), margen, y)
    doc.setTextColor(0)
    y += 4
  }
  const parrafo = (texto: string, tamano = 10) => {
    doc.setFont('helvetica', 'normal').setFontSize(tamano)
    const lineas = doc.splitTextToSize(ascii(texto), ancho - 2 * margen)
    doc.text(lineas, margen, y + 4)
    y += lineas.length * tamano * 0.42 + 6
  }
  const tabla = (head: string[], body: string[][], derecha: number[] = []) => {
    autoTable(doc, {
      startY: y,
      head: [head.map(ascii)],
      body: body.map((f) => f.map(ascii)),
      margin: { left: margen, right: margen },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.2 },
      headStyles: { fillColor: [58, 85, 48], textColor: 255 },
      columnStyles: Object.fromEntries(derecha.map((i) => [i, { halign: 'right' as const }])),
    })
    y = final() + 8
  }

  // Portada breve.
  doc.setFont('helvetica', 'bold').setFontSize(16).text(doc.splitTextToSize(ascii(d.titulo), ancho - 2 * margen), margen, y)
  y += 14
  parrafo(`${d.cuadrilla} · ${d.estudiante} · ${new Date().toLocaleDateString('es-CL')} · GeoNova3D, Misión Topógrafo`, 9)
  parrafo(`${t.pr}: ${d.pr.punto}, ${t.cota} ${formatearMm(d.pr.cotaMm)} m. ${t.metodo}`, 9)

  seccion(`1. ${t.circuito}`)
  tabla(COLUMNAS_PDF, filasParaPdf(d.circuito.registro, d.modo), [3, 4, 5, 6, 7])
  parrafo(
    `${t.cierre}: e = ${d.circuito.errorMm} mm; T = 12 raiz(K) = ${formatearNumero(d.circuito.toleranciaMm, 1)} mm; D = ${formatearNumero(d.circuito.compensados[d.circuito.compensados.length - 1]?.distanciaAcumuladaM ?? d.circuito.longitudM, 2)} m.`,
    9,
  )
  tabla(
    [t.punto, t.distAcum, t.cotaCalculada, t.correccion, t.cotaCompensada],
    d.circuito.compensados.map((p) => [
      p.punto,
      formatearNumero(p.distanciaAcumuladaM, 2),
      formatearMm(p.cotaMm),
      d.circuito.entradas[p.punto]?.correccion ?? '',
      d.circuito.entradas[p.punto]?.cota ?? '',
    ]),
    [1, 2, 3, 4],
  )

  seccion(`2. ${t.perfil}`)
  tabla(COLUMNAS_PDF, filasParaPdf(d.perfil.registro, d.modo), [3, 4, 5, 6, 7])
  parrafo(
    d.perfil.cierre.errorMm === null
      ? t.sinCierrePerfil
      : `${t.cierrePerfil}: e = ${d.perfil.cierre.errorMm} mm; T = ${formatearNumero(d.perfil.cierre.toleranciaMm, 1)} mm.`,
    9,
  )
  tabla(
    [t.estacion, t.progresiva, t.cotaColumna, t.parcial, t.acumulado, t.pendiente],
    d.perfil.planilla.map((e, i) => [
      e.id,
      textoProgresiva(e.progresivaM),
      formatearMm(e.cotaMm),
      e.parcialMm === null ? '' : formatearMm(e.parcialMm, { signo: true }),
      formatearMm(e.acumuladoMm, { signo: true }),
      i === 0 ? '' : (d.perfil.pendientes[i - 1]?.texto ?? ''),
    ]),
    [1, 2, 3, 4, 5],
  )
  if (y > 215) {
    doc.addPage()
    y = 20
  }
  esquemaPerfil(doc, d.perfil.planilla, margen, y, ancho - 2 * margen)
  y += 62

  seccion(`3. ${t.analisis}`)
  parrafo(`${t.tramoCritico}: ${d.perfil.tramoCritico}.`)

  seccion(`4. ${t.conclusiones}`)
  parrafo(d.conclusiones)

  doc.save(d.archivo)
}

/** Esquema del perfil en el informe: llena el ancho, con la vertical exagerada para que se lea. */
function esquemaPerfil(doc: import('jspdf').jsPDF, planilla: EsperadoPlanilla[], x0: number, y0: number, ancho: number) {
  if (planilla.length < 2) return
  const alto = 45
  const largo = planilla[planilla.length - 1].progresivaM || 1
  const cotas = planilla.map((e) => e.cotaMm)
  const [min, max] = [Math.min(...cotas), Math.max(...cotas)]
  const x = (m: number) => x0 + (m / largo) * ancho
  const y = (c: number) => y0 + alto - ((c - min) / (max - min || 1)) * alto
  doc.setDrawColor(205, 184, 148).setLineWidth(0.2).rect(x0, y0, ancho, alto)
  doc.setDrawColor(58, 85, 48).setLineWidth(0.6)
  planilla.slice(1).forEach((e, i) => doc.line(x(planilla[i].progresivaM), y(planilla[i].cotaMm), x(e.progresivaM), y(e.cotaMm)))
  doc.setFont('helvetica', 'normal').setFontSize(7)
  planilla.forEach((e) => doc.text(e.id, x(e.progresivaM), y0 + alto + 4, { align: 'center' }))
  doc.text(ascii(t.esquema), x0, y0 + alto + 9)
}
