import { formatearMm } from '@/motor/numeros'
import textos from '@/textos/es-CL.json'
import { textoProgresiva, type GeometriaPerfil } from './geometriaPerfil'
import type { RotulosPerfil } from './PerfilSvg'

// Perfil en PDF a escala real (RF-09): la página mide lo que mide el dibujo, más márgenes, para que
// impreso al 100 % (plóter o rollo) se pueda medir con escalímetro. Las fuentes estándar del PDF no
// tienen Δ ni −: se escriben con equivalentes.

const ascii = (s: string) => s.replace(/−/g, '-').replace(/Δh/g, 'Dh').replace(/Δ/g, 'D')

const IZQ = 44
const DER = 14
const SUP = 26
const FILA = 8
const INF = 26

export interface DatosPerfilPdf {
  g: GeometriaPerfil
  rotulos: RotulosPerfil
  estudiante: string
  mision: string
  archivo: string
}

export async function exportarPerfilPdf({ g, rotulos, estudiante, mision, archivo }: DatosPerfilPdf) {
  const { jsPDF } = await import('jspdf')
  const t = textos.perfil
  const filas = 3
  const ancho = IZQ + g.anchoMm + DER
  const alto = SUP + g.altoMm + FILA * filas + INF
  const doc = new jsPDF({ orientation: ancho >= alto ? 'landscape' : 'portrait', unit: 'mm', format: [ancho, alto] })
  const x = (mm: number) => IZQ + mm
  const y = (mm: number) => SUP + g.altoMm - mm
  const base = SUP + g.altoMm

  doc.setFont('helvetica', 'bold').setFontSize(14).text(ascii(rotulos.titulo || t.sinTitulo), IZQ, 12)
  doc
    .setFont('helvetica', 'normal')
    .setFontSize(9)
    .text(ascii(`${estudiante} · ${new Date().toLocaleDateString('es-CL')} · ${mision} · GeoNova3D, Misión Topógrafo`), IZQ, 18)

  // Grilla de cotas y su rótulo.
  doc.setDrawColor(205, 184, 148).setLineWidth(0.15)
  doc.setFontSize(8)
  for (const m of g.marcasCota) {
    doc.line(x(0), y(m.yMm), x(g.anchoMm), y(m.yMm))
    doc.text(ascii(formatearMm(m.cotaMm)), IZQ - 2, y(m.yMm) + 1, { align: 'right' })
  }
  doc.setFontSize(9).text(ascii(rotulos.ejeY || '-'), 8, SUP + g.altoMm / 2, { angle: 90, align: 'center' })

  // Estaciones, perfil y marco.
  doc.setDrawColor(174, 144, 108).setLineDashPattern([1, 1], 0)
  for (const p of g.puntos) doc.line(x(p.xMm), y(p.yMm), x(p.xMm), base)
  doc.setLineDashPattern([], 0)
  doc.setDrawColor(58, 85, 48).setLineWidth(0.6)
  g.puntos.slice(1).forEach((p, i) => doc.line(x(g.puntos[i].xMm), y(g.puntos[i].yMm), x(p.xMm), y(p.yMm)))
  doc.setFillColor(58, 85, 48)
  doc.setFont('helvetica', 'bold').setFontSize(8)
  for (const p of g.puntos) {
    doc.circle(x(p.xMm), y(p.yMm), 0.9, 'F')
    doc.text(p.id, x(p.xMm), y(p.yMm) - 2.5, { align: 'center' })
  }
  doc.setDrawColor(92, 67, 48).setLineWidth(0.3).rect(x(0), SUP, g.anchoMm, g.altoMm)

  // Guitarra: progresiva, cota y desnivel parcial bajo cada estación.
  const guitarra: [string, (i: number) => string][] = [
    [rotulos.ejeX || t.guitarra.progresiva, (i) => textoProgresiva(g.puntos[i].progresivaM)],
    [t.guitarra.cota, (i) => formatearMm(g.puntos[i].cotaMm)],
    [t.guitarra.parcial, (i) => (i === 0 ? '-' : formatearMm(g.puntos[i].cotaMm - g.puntos[i - 1].cotaMm, { signo: true }))],
  ]
  doc.setLineWidth(0.2)
  guitarra.forEach(([titulo, valor], fila) => {
    const yf = base + FILA * (fila + 1)
    doc.line(4, yf, x(g.anchoMm), yf)
    doc.setFont('helvetica', 'bold').setFontSize(8).text(ascii(titulo), 5, yf - 2.6)
    doc.setFont('helvetica', 'normal')
    g.puntos.forEach((p, i) => doc.text(ascii(valor(i)), x(p.xMm), yf - 2.6, { align: 'center' }))
  })

  doc
    .setFontSize(9)
    .text(
      ascii(
        t.pie
          .replace('{h}', String(g.escalas.horizontal))
          .replace('{v}', String(g.escalas.vertical))
          .replace('{plano}', formatearMm(g.planoMm))
          .replace('{ex}', String(g.escalas.horizontal / g.escalas.vertical)),
      ) + ascii(` · ${t.imprimir}`),
      IZQ,
      alto - 10,
    )
  doc.save(archivo)
}
